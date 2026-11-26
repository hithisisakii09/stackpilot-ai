export function buildPricingMigrationSql() {
  return `-- StackPilot migration 10. Append-only manual pricing observations.
CREATE TABLE pricing_observations (
 organization_id text NOT NULL REFERENCES organizations(id),
 id text NOT NULL,
 product_id text NOT NULL,
 claim_id text NOT NULL,
 agent_id text NOT NULL,
 source_id text NOT NULL,
 observed_at timestamptz NOT NULL,
 collected_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 record jsonb NOT NULL CHECK (jsonb_typeof(record)='object' AND octet_length(record::text)<=8192),
 record_digest text NOT NULL CHECK (record_digest ~ '^[a-f0-9]{64}$'),
 actor_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (organization_id,id),
 FOREIGN KEY (organization_id,product_id,claim_id) REFERENCES product_claims(organization_id,product_id,id),
 FOREIGN KEY (organization_id,product_id,source_id) REFERENCES evidence_sources(organization_id,product_id,id),
 FOREIGN KEY (organization_id,agent_id) REFERENCES agents(organization_id,id),
 FOREIGN KEY (organization_id,actor_id) REFERENCES users(organization_id,id),
 CHECK (observed_at<=collected_at AND collected_at<=CURRENT_TIMESTAMP AND expires_at>observed_at AND extract(epoch FROM expires_at-observed_at)<=7776000),
 CHECK ((record->>'kind'='manual-pricing-observation-v1' AND record->>'status'='candidate' AND record->>'reviewState'='unreviewed'
   AND record->>'id'=id AND record->>'productId'=product_id AND record->>'claimId'=claim_id AND record->>'agentId'=agent_id AND record->>'sourceId'=source_id) IS TRUE)
);
CREATE INDEX pricing_observations_product_time ON pricing_observations(organization_id,product_id,observed_at,id);
ALTER TABLE pricing_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_observations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON pricing_observations USING (organization_id = nullif(current_setting('stackpilot.organization_id',true),'')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id',true),''));
REVOKE ALL ON pricing_observations FROM PUBLIC,stackpilot_app,stackpilot_control;
GRANT SELECT,INSERT ON pricing_observations TO stackpilot_control;
`;
}
