import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { withAuthenticatedTransaction } from '../identity/sessions.mjs';
import { withTransaction } from '../persistence/transaction.mjs';
import { summarizeRevenueByCurrency } from '../revenue/ledger.mjs';
import {
  ADMIN_SECURITY_HEADERS,
  presentAdminOverview,
  presentAdminApprovals,
  presentAdminClaims,
  presentAdminPartnerships,
  presentAdminRevenue,
  presentAdminAiEngineering
} from './presenter.mjs';
import { renderAdminPage } from './views.mjs';

const reqId = prefix => prefix + '-' + randomUUID();

function sendHtml(req, res, status, html) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, {
    ...ADMIN_SECURITY_HEADERS,
    'Content-Type': 'text/html; charset=utf-8',
    'Connection': 'close'
  });
  res.end(req.method === 'HEAD' ? undefined : html);
}

function sendJson(req, res, status, payload) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, {
    ...ADMIN_SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Connection': 'close'
  });
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify(payload));
}

async function safeQuery(tx, query) {
  try {
    return (await tx.db.execute(query)).rows;
  } catch {
    return [];
  }
}

export function createAdminDbReader({ identity, appPool, approvals }) {
  async function runApp(principal, label, fn) {
    if (!appPool) return fn(null);
    return withTransaction(
      appPool,
      { organizationId: principal.organizationId, actorId: principal.userId, requestId: reqId(label) },
      async tx => {
        await tx.db.execute(sql`SET LOCAL search_path = pg_catalog, public, pg_temp`);
        return fn(tx);
      }
    );
  }

  return Object.freeze({
    async loadOverview(principal) {
      return runApp(principal, 'admin-overview', async tx => {
        if (!tx) {
          return { monthlyBudgetInr: 0, delegatedSpendInr: 0, publicAffiliateUrl: null, noindexActive: true, healthStatus: 'unknown', findingsCount: null };
        }
        const rows = await safeQuery(tx, sql`
          SELECT data FROM public.audit_events
          WHERE organization_id = ${principal.organizationId} AND action = 'engineering-health-report'
          ORDER BY created_at DESC, id DESC LIMIT 1
        `);
        const latest = rows[0]?.data;
        return {
          monthlyBudgetInr: 0,
          delegatedSpendInr: 0,
          publicAffiliateUrl: null,
          noindexActive: true,
          healthStatus: latest?.status ?? 'unknown',
          findingsCount: Array.isArray(latest?.findings) ? latest.findings.length : null
        };
      });
    },

    async loadApprovals(principal, handle) {
      try {
        const pending = await approvals.listPending(handle);
        return pending.map(item => ({
          id: item.requestId,
          kind: 'claim',
          status: 'pending',
          title: item.claimId
        }));
      } catch {
        return [];
      }
    },

    async loadClaims(principal) {
      return runApp(principal, 'admin-claims', async tx => {
        if (!tx) return [];
        const rows = await safeQuery(tx, sql`
          SELECT id, status FROM public.product_claims
          WHERE organization_id = ${principal.organizationId} ORDER BY id LIMIT 100
        `);
        return rows.map(r => ({
          id: r.id,
          status: r.status,
          freshness: 'unverified',
          observedPriceMinor: null,
          currency: 'USD'
        }));
      });
    },

    async loadPartnerships(principal) {
      return runApp(principal, 'admin-partnerships', async tx => {
        if (!tx) return { drafts: [], partnerships: [] };
        const contentRows = await safeQuery(tx, sql`
          SELECT c.id, c.title, c.status,
            (SELECT count(*)::int FROM public.content_claims cc
             JOIN public.content_versions cv ON cv.organization_id = cc.organization_id AND cv.id = cc.version_id
             WHERE cc.organization_id = c.organization_id AND cv.content_id = c.id) AS cited_count
          FROM public.content c WHERE c.organization_id = ${principal.organizationId} ORDER BY c.id LIMIT 100
        `);
        const partnerRows = await safeQuery(tx, sql`
          SELECT p.id, p.vendor_id,
            (SELECT e.evidence FROM public.partnership_events e
             WHERE e.organization_id = p.organization_id AND e.partnership_id = p.id
             ORDER BY (e.evidence->>'seq')::integer DESC LIMIT 1) AS latest
          FROM public.partnerships p WHERE p.organization_id = ${principal.organizationId} ORDER BY p.id LIMIT 100
        `);
        return {
          drafts: contentRows.map(r => ({ id: r.id, title: r.title, status: r.status, citedCount: Number(r.cited_count ?? 0) })),
          partnerships: partnerRows.map(r => ({
            id: r.id,
            vendorId: r.vendor_id,
            state: r.latest?.to ?? 'discovered',
            step: Number(r.latest?.step ?? 1),
            publicAffiliateUrl: null
          }))
        };
      });
    },

    async loadRevenue(principal) {
      return runApp(principal, 'admin-revenue', async tx => {
        if (!tx) return { forecastTotalsByCurrency: {}, actualTotalsByCurrency: {} };
        const rows = await safeQuery(tx, sql`
          SELECT id, programme_id, entry_type, entry_kind, reverses_entry_id, statement_id, statement_digest,
            currency, amount_minor, period_start, period_end, recorded_at, metrics
          FROM public.revenue_ledger_entries
          WHERE organization_id = ${principal.organizationId}
          ORDER BY recorded_at, id LIMIT 500
        `);
        const entries = rows.map(row => ({
          id: row.id,
          programmeId: row.programme_id,
          entryType: row.entry_type,
          entryKind: row.entry_kind,
          reversesEntryId: row.reverses_entry_id,
          statementId: row.statement_id,
          statementDigest: row.statement_digest,
          currency: row.currency,
          amountMinor: Number(row.amount_minor),
          periodStart: new Date(row.period_start).toISOString(),
          periodEnd: new Date(row.period_end).toISOString(),
          recordedAt: new Date(row.recorded_at).toISOString(),
          clicks: row.metrics?.clicks ?? null,
          conversions: row.metrics?.conversions ?? null,
          payoutMinor: row.metrics?.payoutMinor ?? null,
          commissionRateBps: row.metrics?.commissionRateBps ?? null
        }));
        return summarizeRevenueByCurrency(entries);
      });
    },

    async loadAiEngineering(principal) {
      return runApp(principal, 'admin-ai-eng', async tx => {
        if (!tx) return { routing: [], triage: [] };
        const aiRows = await safeQuery(tx, sql`
          SELECT id, data FROM public.audit_events
          WHERE organization_id = ${principal.organizationId} AND action IN ('ai-routing-decision', 'ai-routing-denial')
          ORDER BY created_at DESC, id DESC LIMIT 100
        `);
        const triRows = await safeQuery(tx, sql`
          SELECT id, data FROM public.audit_events
          WHERE organization_id = ${principal.organizationId} AND action = 'engineering-regression-triage'
          ORDER BY created_at DESC, id DESC LIMIT 100
        `);
        return {
          routing: aiRows.map(r => ({
            id: r.id,
            taskClass: r.data?.telemetry?.taskClass ?? 'unknown',
            selectedModelId: r.data?.telemetry?.selectedModelId ?? null,
            tier: r.data?.telemetry?.selectedModelId?.startsWith('local-') ? 'local' : r.data?.telemetry?.selectedModelId ? 'free' : null,
            estimatedCostMinor: r.data?.telemetry?.estimatedCostMinor ?? 0,
            allowed: Boolean(r.data?.allowed)
          })),
          triage: triRows.map(t => ({
            id: t.id,
            candidateStatus: t.data?.candidateStatus ?? 'unknown',
            classifications: Array.isArray(t.data?.classifications) ? t.data.classifications : []
          }))
        };
      });
    }
  });
}

export function createAdminUiRouter({ identity, reader, onApprovalDecision }) {
  return Object.freeze({
    async handle(req, res, { path, handle, body }) {
      let principal;
      try {
        principal = await identity.requirePrincipal(handle);
      } catch {
        return sendJson(req, res, 401, { error: 'Request denied' });
      }

      try {
        if (req.method === 'GET' && path === '/admin') {
          const data = await reader.loadOverview(principal);
          return sendHtml(req, res, 200, renderAdminPage('overview', presentAdminOverview({ principal, ...data })));
        }
        if (req.method === 'GET' && path === '/admin/approvals') {
          const items = await reader.loadApprovals(principal, handle);
          return sendHtml(req, res, 200, renderAdminPage('approvals', presentAdminApprovals({ principal, items })));
        }
        if (req.method === 'GET' && path === '/admin/claims') {
          const claims = await reader.loadClaims(principal);
          return sendHtml(req, res, 200, renderAdminPage('claims', presentAdminClaims({ principal, claims })));
        }
        if (req.method === 'GET' && path === '/admin/partnerships') {
          const data = await reader.loadPartnerships(principal);
          return sendHtml(req, res, 200, renderAdminPage('partnerships', presentAdminPartnerships({ principal, ...data })));
        }
        if (req.method === 'GET' && path === '/admin/revenue') {
          const data = await reader.loadRevenue(principal);
          return sendHtml(req, res, 200, renderAdminPage('revenue', presentAdminRevenue({ principal, ...data })));
        }
        if (req.method === 'GET' && path === '/admin/ai-engineering') {
          const data = await reader.loadAiEngineering(principal);
          return sendHtml(req, res, 200, renderAdminPage('ai-engineering', presentAdminAiEngineering({ principal, ...data })));
        }
        if (req.method === 'GET' && path === '/admin/api/summary') {
          const [overview, partnerships, revenue, aiEngineering] = await Promise.all([
            reader.loadOverview(principal),
            reader.loadPartnerships(principal),
            reader.loadRevenue(principal),
            reader.loadAiEngineering(principal)
          ]);
          return sendJson(req, res, 200, {
            organizationId: principal.organizationId,
            role: principal.role,
            overview,
            partnerships,
            revenue,
            aiEngineering
          });
        }
        if (req.method === 'POST' && path === '/admin/approvals') {
          if (principal.role !== 'owner') return sendJson(req, res, 403, { error: 'Request denied' });
          if (typeof onApprovalDecision !== 'function') return sendJson(req, res, 403, { error: 'Request denied' });
          const result = await onApprovalDecision(handle, body);
          return sendJson(req, res, 200, result);
        }
        return sendJson(req, res, 404, { error: 'Request denied' });
      } catch {
        return sendJson(req, res, 400, { error: 'Request denied' });
      }
    }
  });
}
