export function buildPartnershipsRevenueMigrationSql() {
  return `-- StackPilot migration 11. Append-only revenue ledger and statement insert grant.
GRANT INSERT ON TABLE external_statements TO stackpilot_app;
CREATE TABLE revenue_ledger_entries (
 organization_id text NOT NULL REFERENCES organizations(id),
 id text NOT NULL,
 programme_id text NOT NULL,
 entry_type text NOT NULL CHECK (entry_type IN ('forecast','actual')),
 entry_kind text NOT NULL CHECK (entry_kind IN ('initial','adjustment','reversal')),
 reverses_entry_id text,
 statement_id text,
 statement_digest text CHECK (statement_digest IS NULL OR statement_digest ~ '^[a-f0-9]{64}$'),
 currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
 amount_minor bigint NOT NULL,
 period_start timestamptz NOT NULL,
 period_end timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL,
 metrics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metrics)='object' AND octet_length(metrics::text)<=4096),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (organization_id,id),
 FOREIGN KEY (organization_id,programme_id) REFERENCES affiliate_programmes(organization_id,id),
 FOREIGN KEY (organization_id,programme_id,statement_id) REFERENCES external_statements(organization_id,programme_id,id),
 FOREIGN KEY (organization_id,reverses_entry_id) REFERENCES revenue_ledger_entries(organization_id,id),
 CHECK (period_end>=period_start AND recorded_at<=CURRENT_TIMESTAMP),
 CHECK ((entry_type='forecast' AND statement_id IS NULL AND statement_digest IS NULL) OR (entry_type='actual' AND statement_id IS NOT NULL AND statement_digest IS NOT NULL)),
 CHECK ((entry_kind='initial' AND amount_minor>=0 AND reverses_entry_id IS NULL) OR (entry_kind IN ('adjustment','reversal') AND reverses_entry_id IS NOT NULL))
);
CREATE INDEX revenue_ledger_entries_programme_time ON revenue_ledger_entries(organization_id,programme_id,recorded_at,id);
ALTER TABLE revenue_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_ledger_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON revenue_ledger_entries USING (organization_id = nullif(current_setting('stackpilot.organization_id',true),'')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id',true),''));
REVOKE ALL ON revenue_ledger_entries FROM PUBLIC,stackpilot_app,stackpilot_control;
GRANT SELECT,INSERT ON revenue_ledger_entries TO stackpilot_app;
`;
}
