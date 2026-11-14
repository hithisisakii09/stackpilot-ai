export function buildReconciliationMigrationSql() {
  return `-- StackPilot migration 7. Append-only candidate correction proposals.
CREATE TABLE reconciliation_links (
 organization_id text NOT NULL REFERENCES organizations(id),
 id text NOT NULL,
 domain text NOT NULL CHECK (domain IN ('market','competitor')),
 market_from_id text,
 market_to_id text,
 competitor_from_id text,
 competitor_to_id text,
 record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object' AND octet_length(record::text) <= 4096),
 created_at timestamp NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id,id),
 UNIQUE (organization_id,market_from_id),
 UNIQUE (organization_id,competitor_from_id),
 FOREIGN KEY (organization_id,market_from_id) REFERENCES market_observations(organization_id,id),
 FOREIGN KEY (organization_id,market_to_id) REFERENCES market_observations(organization_id,id),
 FOREIGN KEY (organization_id,competitor_from_id) REFERENCES competitors(organization_id,id),
 FOREIGN KEY (organization_id,competitor_to_id) REFERENCES competitors(organization_id,id),
 CHECK ((domain='market' AND market_from_id IS NOT NULL AND market_to_id IS NOT NULL AND competitor_from_id IS NULL AND competitor_to_id IS NULL AND market_from_id<>market_to_id)
     OR (domain='competitor' AND competitor_from_id IS NOT NULL AND competitor_to_id IS NOT NULL AND market_from_id IS NULL AND market_to_id IS NULL AND competitor_from_id<>competitor_to_id)),
 CHECK ((record->>'kind'='candidate-reconciliation-v1' AND record->>'reviewState'='unreviewed' AND record->>'id'=id AND record->>'domain'=domain
     AND record->>'fromId'=coalesce(market_from_id,competitor_from_id) AND record->>'toId'=coalesce(market_to_id,competitor_to_id)
     AND record->>'fromDigest' ~ '^[a-f0-9]{64}$' AND record->>'toDigest' ~ '^[a-f0-9]{64}$') IS TRUE)
);
CREATE INDEX reconciliation_links_market_target ON reconciliation_links(organization_id,market_to_id);
CREATE INDEX reconciliation_links_competitor_target ON reconciliation_links(organization_id,competitor_to_id);
ALTER TABLE reconciliation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_links FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON reconciliation_links USING (organization_id = nullif(current_setting('stackpilot.organization_id',true),'')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id',true),''));
REVOKE ALL ON reconciliation_links FROM PUBLIC,stackpilot_app;
GRANT SELECT,INSERT ON reconciliation_links TO stackpilot_app;
`;
}
