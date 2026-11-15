export function buildLifecycleMigrationSql() {
  return `-- StackPilot migration 9. Authenticated append-only claim review lifecycle.
CREATE TABLE claim_lifecycle_events (
 organization_id text NOT NULL REFERENCES organizations(id),
 id text NOT NULL,
 claim_id text NOT NULL,
 product_id text NOT NULL,
 agent_id text NOT NULL,
 version integer NOT NULL CHECK (version BETWEEN 1 AND 100),
 previous_event_id text,
 status text NOT NULL CHECK (status IN ('evidence-collected','needs-review','verified','approved','rejected','stale','reverification-required')),
 claim_version integer NOT NULL CHECK (claim_version > 0),
 payload_digest text NOT NULL CHECK (payload_digest ~ '^[a-f0-9]{64}$'),
 evidence_digest text NOT NULL CHECK (evidence_digest ~ '^[a-f0-9]{64}$'),
 valid_until timestamptz NOT NULL,
 review_event_id text,
 request_id text,
 request_digest text,
 decision_id text,
 actor_id text NOT NULL,
 idempotency_key text NOT NULL,
 input_digest text NOT NULL CHECK (input_digest ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (organization_id,id),
 UNIQUE (organization_id,claim_id,id),
 UNIQUE (organization_id,claim_id,version),
 UNIQUE (organization_id,idempotency_key),
 UNIQUE (organization_id,request_id),
 FOREIGN KEY (organization_id,product_id,claim_id) REFERENCES product_claims(organization_id,product_id,id),
 FOREIGN KEY (organization_id,agent_id) REFERENCES agents(organization_id,id),
 FOREIGN KEY (organization_id,actor_id) REFERENCES users(organization_id,id),
 FOREIGN KEY (organization_id,claim_id,previous_event_id) REFERENCES claim_lifecycle_events(organization_id,claim_id,id),
 FOREIGN KEY (organization_id,claim_id,review_event_id) REFERENCES claim_lifecycle_events(organization_id,claim_id,id),
 FOREIGN KEY (organization_id,request_id) REFERENCES approval_requests(organization_id,id),
 FOREIGN KEY (organization_id,decision_id) REFERENCES approval_decisions(organization_id,id),
 CHECK ((version=1) = (previous_event_id IS NULL)),
 CHECK ((status='needs-review') = (request_id IS NOT NULL)),
 CHECK ((request_id IS NULL AND request_digest IS NULL) OR (request_id IS NOT NULL AND request_digest ~ '^[a-f0-9]{64}$')),
 CHECK (status <> 'needs-review' OR review_event_id=id),
 CHECK (status NOT IN ('verified','approved','rejected') OR (review_event_id IS NOT NULL AND decision_id IS NOT NULL))
);
CREATE TABLE evidence_revocations (
 organization_id text NOT NULL REFERENCES organizations(id),
 id text NOT NULL,
 source_id text NOT NULL,
 source_digest text NOT NULL CHECK (source_digest ~ '^[a-f0-9]{64}$'),
 reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
 actor_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (organization_id,id),
 UNIQUE (organization_id,source_id),
 FOREIGN KEY (organization_id,source_id) REFERENCES evidence_sources(organization_id,id),
 FOREIGN KEY (organization_id,actor_id) REFERENCES users(organization_id,id)
);
ALTER TABLE claim_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_lifecycle_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON claim_lifecycle_events USING (organization_id = nullif(current_setting('stackpilot.organization_id',true),'')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id',true),''));
REVOKE ALL ON claim_lifecycle_events FROM PUBLIC,stackpilot_app,stackpilot_control;
GRANT SELECT,INSERT ON claim_lifecycle_events TO stackpilot_control;
ALTER TABLE evidence_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_revocations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON evidence_revocations USING (organization_id = nullif(current_setting('stackpilot.organization_id',true),'')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id',true),''));
REVOKE ALL ON evidence_revocations FROM PUBLIC,stackpilot_app,stackpilot_control;
GRANT SELECT,INSERT ON evidence_revocations TO stackpilot_control;
`;
}
