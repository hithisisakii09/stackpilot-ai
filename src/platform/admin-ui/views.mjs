import { escapeHtml } from './presenter.mjs';

const NAV_LINKS = [
  ['/admin', 'Overview'],
  ['/admin/approvals', 'Approvals'],
  ['/admin/claims', 'Claims & Pricing'],
  ['/admin/partnerships', 'Growth & Partnerships'],
  ['/admin/revenue', 'Revenue Ledger'],
  ['/admin/ai-engineering', 'AI & Engineering']
];

function layout(title, principal, bodyHtml) {
  const nav = NAV_LINKS
    .map(([href, label]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
    .join(' ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} | StackPilot Control Console</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0b1220; color: #e9f1ff; margin: 0; padding: 24px; }
  header, main { max-width: 1080px; margin: 0 auto; }
  nav { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
  a { color: #7ce8c6; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #152138; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #34455f; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #253652; }
</style>
</head>
<body>
<header>
  <nav aria-label="Control console">${nav}</nav>
  <p>Tenant: <strong>${escapeHtml(principal.organizationId)}</strong> · Actor: ${escapeHtml(principal.userId)} (${escapeHtml(principal.role)})</p>
</header>
<main>
  <h1>${escapeHtml(title)}</h1>
  ${bodyHtml}
</main>
</body>
</html>`;
}

export function renderAdminPage(view, model) {
  if (view === 'overview') {
    return layout('Governance & Health Overview', model.principal, `
      <ul>
        <li>monthly_budget_inr = ${escapeHtml(model.monthlyBudgetInr)}</li>
        <li>delegated_spend_inr = ${escapeHtml(model.delegatedSpendInr)}</li>
        <li>affiliateUrl: null (locked)</li>
        <li>noindex, nofollow: ${escapeHtml(model.noindexActive)}</li>
        <li>Engineering Health: <span class="badge">${escapeHtml(model.healthStatus)}</span></li>
        <li>Open Findings: ${escapeHtml(model.findingsCount ?? '—')}</li>
      </ul>
    `);
  }

  if (view === 'approvals') {
    const notice = model.canMutate
      ? '<p class="badge">Owner approval controls enabled</p>'
      : '<p class="badge">Read-only (owner required for mutations)</p>';
    const rows = model.items.length
      ? model.items.map(i => `<tr><td>${escapeHtml(i.id)}</td><td>${escapeHtml(i.kind)}</td><td>${escapeHtml(i.status)}</td><td>${escapeHtml(i.title)}</td></tr>`).join('')
      : '<tr><td colspan="4">No approval items</td></tr>';
    return layout('Approvals Queue', model.principal, `
      ${notice}
      <table><thead><tr><th>ID</th><th>Kind</th><th>Status</th><th>Title</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  }

  if (view === 'claims') {
    const rows = model.claims.length
      ? model.claims.map(c => `<tr><td>${escapeHtml(c.id)}</td><td>${escapeHtml(c.status)}</td><td>${escapeHtml(c.freshness)}</td><td>${escapeHtml(c.formattedPrice)}</td></tr>`).join('')
      : '<tr><td colspan="4">No candidate claims</td></tr>';
    return layout('Claims & Pricing Monitor', model.principal, `
      <table><thead><tr><th>Claim ID</th><th>Status</th><th>Freshness</th><th>Observed Price</th></tr></thead><tbody>${rows}</tbody></table>
    `);
  }

  if (view === 'partnerships') {
    const draftRows = model.drafts.length
      ? model.drafts.map(d => `<tr><td>${escapeHtml(d.id)}</td><td>${escapeHtml(d.title)}</td><td>${escapeHtml(d.status)}</td><td>${escapeHtml(d.citedCount)}</td></tr>`).join('')
      : '<tr><td colspan="4">No editorial drafts</td></tr>';
    const partnerRows = model.partnerships.length
      ? model.partnerships.map(p => `<tr><td>${escapeHtml(p.id)}</td><td>${escapeHtml(p.vendorId)}</td><td>${escapeHtml(p.state)}</td><td>${escapeHtml(p.step)}/12</td></tr>`).join('')
      : '<tr><td colspan="4">No partnerships</td></tr>';
    return layout('Editorial Growth & Partnerships Pipeline', model.principal, `
      <h2>Editorial Drafts</h2>
      <table><thead><tr><th>Draft ID</th><th>Title</th><th>Status</th><th>Cited Claims</th></tr></thead><tbody>${draftRows}</tbody></table>
      <h2>12-Step Partnerships</h2>
      <table><thead><tr><th>Partnership ID</th><th>Vendor</th><th>State</th><th>Step</th></tr></thead><tbody>${partnerRows}</tbody></table>
    `);
  }

  if (view === 'revenue') {
    const fRows = model.forecasts.length
      ? model.forecasts.map(f => `<tr><td>${escapeHtml(f.currency)}</td><td>${escapeHtml(f.formatted)}</td></tr>`).join('')
      : '<tr><td colspan="2">None</td></tr>';
    const aRows = model.actuals.length
      ? model.actuals.map(a => `<tr><td>${escapeHtml(a.currency)}</td><td>${escapeHtml(a.formatted)}</td></tr>`).join('')
      : '<tr><td colspan="2">None</td></tr>';
    return layout('Revenue Ledger', model.principal, `
      <h2>Forecasts (Non-Authoritative)</h2>
      <table><thead><tr><th>Currency</th><th>Total</th></tr></thead><tbody>${fRows}</tbody></table>
      <h2>Statement-Backed Actuals</h2>
      <table><thead><tr><th>Currency</th><th>Total</th></tr></thead><tbody>${aRows}</tbody></table>
    `);
  }

  if (view === 'ai-engineering') {
    const rRows = model.routing.length
      ? model.routing.map(r => `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.taskClass)}</td><td>${escapeHtml(r.selectedModelId)}</td><td>${escapeHtml(r.tier)}</td><td>0</td></tr>`).join('')
      : '<tr><td colspan="5">No routing telemetry</td></tr>';
    const tRows = model.triage.length
      ? model.triage.map(t => `<tr><td>${escapeHtml(t.id)}</td><td>${escapeHtml(t.candidateStatus)}</td><td>${escapeHtml(t.classifications.join(', ') || 'none')}</td></tr>`).join('')
      : '<tr><td colspan="3">No triage findings</td></tr>';
    return layout('AI Router & Engineering Intelligence', model.principal, `
      <h2>Zero-Cost AI Routing Telemetry</h2>
      <table><thead><tr><th>Event ID</th><th>Task</th><th>Model</th><th>Tier</th><th>Cost Minor</th></tr></thead><tbody>${rRows}</tbody></table>
      <h2>Advisory Regression Triage</h2>
      <table><thead><tr><th>Event ID</th><th>Status</th><th>Classifications</th></tr></thead><tbody>${tRows}</tbody></table>
    `);
  }

  throw new Error('Unknown admin view');
}
