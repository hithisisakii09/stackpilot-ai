-- StackPilot local control migration 2. Storage only; control login remains disabled.

CREATE TABLE "auth_challenges" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "user_id" text NOT NULL,
  "key_id" text NOT NULL,
  "key_fingerprint" text NOT NULL,
  "nonce_digest" text NOT NULL,
  "origin" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "auth_challenges_u0" UNIQUE ("organization_id", "id", "user_id", "key_id", "key_fingerprint"),
  CONSTRAINT "auth_challenges_c0" CHECK (key_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "auth_challenges_c1" CHECK (nonce_digest ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "auth_challenges_c2" CHECK (origin ~ '^https://127[.]0[.]0[.]1:[0-9]{4,5}$'),
  CONSTRAINT "auth_challenges_c3" CHECK (expires_at > created_at AND expires_at <= created_at + interval '60 seconds'),
  CONSTRAINT "auth_challenges_c4" CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE TABLE "auth_sessions" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "user_id" text NOT NULL,
  "key_id" text NOT NULL,
  "key_fingerprint" text NOT NULL,
  "challenge_id" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "auth_sessions_u0" UNIQUE ("organization_id", "token_hash"),
  CONSTRAINT "auth_sessions_u1" UNIQUE ("organization_id", "challenge_id"),
  CONSTRAINT "auth_sessions_c0" CHECK (key_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "auth_sessions_c1" CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "auth_sessions_c2" CHECK (expires_at > created_at AND expires_at <= created_at + interval '15 minutes'),
  CONSTRAINT "auth_sessions_c3" CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE TABLE "approval_request_bindings" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "request_id" text NOT NULL,
  "requester_user_id" text,
  "requester_agent_id" text,
  "resource_type" text NOT NULL,
  "resource_version" integer NOT NULL,
  "policy_version" integer NOT NULL,
  "risk" text NOT NULL,
  "request_digest" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "approval_request_bindings_u0" UNIQUE ("organization_id", "request_id"),
  CONSTRAINT "approval_request_bindings_u1" UNIQUE ("organization_id", "request_id", "request_digest"),
  CONSTRAINT "approval_request_bindings_c0" CHECK ((requester_user_id IS NOT NULL) <> (requester_agent_id IS NOT NULL)),
  CONSTRAINT "approval_request_bindings_c1" CHECK (resource_version > 0),
  CONSTRAINT "approval_request_bindings_c2" CHECK (policy_version > 0),
  CONSTRAINT "approval_request_bindings_c3" CHECK (risk IN ('low','medium','high','critical')),
  CONSTRAINT "approval_request_bindings_c4" CHECK (resource_type ~ '^[a-z][a-z0-9-]{2,63}$'),
  CONSTRAINT "approval_request_bindings_c5" CHECK (request_digest ~ '^[a-f0-9]{64}$')
);

ALTER TABLE approval_decisions ADD COLUMN version integer NOT NULL DEFAULT 1;

ALTER TABLE approval_decisions DROP CONSTRAINT approval_decisions_u0;

ALTER TABLE approval_decisions ADD CONSTRAINT approval_decisions_u0 UNIQUE (organization_id, request_id, version);

ALTER TABLE approval_decisions ADD CONSTRAINT approval_decisions_c2 CHECK (version > 0);

ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_fk1" FOREIGN KEY ("organization_id", "user_id") REFERENCES "users" ("organization_id", "id");

CREATE INDEX "auth_challenges_i0" ON "auth_challenges" ("organization_id", "expires_at");

CREATE INDEX "auth_challenges_i1" ON "auth_challenges" ("organization_id", "user_id");

ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_fk1" FOREIGN KEY ("organization_id", "user_id") REFERENCES "users" ("organization_id", "id");

ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_fk2" FOREIGN KEY ("organization_id", "challenge_id", "user_id", "key_id", "key_fingerprint") REFERENCES "auth_challenges" ("organization_id", "id", "user_id", "key_id", "key_fingerprint");

CREATE INDEX "auth_sessions_i0" ON "auth_sessions" ("organization_id", "expires_at");

CREATE INDEX "auth_sessions_i1" ON "auth_sessions" ("organization_id", "user_id");

CREATE INDEX "auth_sessions_i2" ON "auth_sessions" ("organization_id", "challenge_id", "user_id", "key_id", "key_fingerprint");

ALTER TABLE "approval_request_bindings" ADD CONSTRAINT "approval_request_bindings_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "approval_request_bindings" ADD CONSTRAINT "approval_request_bindings_fk1" FOREIGN KEY ("organization_id", "request_id") REFERENCES "approval_requests" ("organization_id", "id");

ALTER TABLE "approval_request_bindings" ADD CONSTRAINT "approval_request_bindings_fk2" FOREIGN KEY ("organization_id", "requester_user_id") REFERENCES "users" ("organization_id", "id");

ALTER TABLE "approval_request_bindings" ADD CONSTRAINT "approval_request_bindings_fk3" FOREIGN KEY ("organization_id", "requester_agent_id") REFERENCES "agents" ("organization_id", "id");

CREATE INDEX "approval_request_bindings_i0" ON "approval_request_bindings" ("organization_id", "requester_user_id");

CREATE INDEX "approval_request_bindings_i1" ON "approval_request_bindings" ("organization_id", "requester_agent_id");

ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_fk3" FOREIGN KEY ("organization_id", "request_id", "request_digest") REFERENCES "approval_request_bindings" ("organization_id", "request_id", "request_digest") NOT VALID;

CREATE INDEX "approval_decisions_i1" ON "approval_decisions" ("organization_id", "request_id", "request_digest");

DO $$ BEGIN
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='stackpilot_control') THEN
  CREATE ROLE stackpilot_control NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  COMMENT ON ROLE stackpilot_control IS 'stackpilot-local-control-v2-no-login';
 ELSE
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='stackpilot_control' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolinherit AND NOT rolreplication AND NOT rolbypassrls AND rolconfig IS NULL AND shobj_description(oid,'pg_authid')='stackpilot-local-control-v2-no-login')
   OR EXISTS (SELECT FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname='stackpilot_control') OR roleid=(SELECT oid FROM pg_roles WHERE rolname='stackpilot_control'))
   OR EXISTS (SELECT FROM pg_shdepend WHERE refclassid='pg_authid'::regclass AND refobjid=(SELECT oid FROM pg_roles WHERE rolname='stackpilot_control') AND (deptype='o' OR (deptype IN ('a','i') AND (dbid=0 OR dbid=(SELECT oid FROM pg_database WHERE datname=current_database()))))) THEN
   RAISE EXCEPTION 'Unexpected control role configuration';
  END IF;
 END IF;
END $$;

GRANT USAGE ON SCHEMA public TO stackpilot_control;

ALTER TABLE "auth_challenges" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "auth_challenges" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "auth_challenges" USING (organization_id = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "auth_challenges" FROM PUBLIC, stackpilot_app, stackpilot_control;

GRANT SELECT, INSERT ON TABLE "auth_challenges" TO stackpilot_control;

ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "auth_sessions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "auth_sessions" USING (organization_id = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "auth_sessions" FROM PUBLIC, stackpilot_app, stackpilot_control;

GRANT SELECT, INSERT ON TABLE "auth_sessions" TO stackpilot_control;

ALTER TABLE "approval_request_bindings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "approval_request_bindings" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "approval_request_bindings" USING (organization_id = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "approval_request_bindings" FROM PUBLIC, stackpilot_app, stackpilot_control;

GRANT SELECT, INSERT ON TABLE "approval_request_bindings" TO stackpilot_control;

REVOKE ALL ON TABLE "organizations" FROM stackpilot_control;

REVOKE ALL ON TABLE "users" FROM stackpilot_control;

REVOKE ALL ON TABLE "roles" FROM stackpilot_control;

REVOKE ALL ON TABLE "permissions" FROM stackpilot_control;

REVOKE ALL ON TABLE "memberships" FROM stackpilot_control;

REVOKE ALL ON TABLE "role_permissions" FROM stackpilot_control;

REVOKE ALL ON TABLE "agents" FROM stackpilot_control;

REVOKE ALL ON TABLE "agent_capabilities" FROM stackpilot_control;

REVOKE ALL ON TABLE "workflow_definitions" FROM stackpilot_control;

REVOKE ALL ON TABLE "workflow_versions" FROM stackpilot_control;

REVOKE ALL ON TABLE "workflow_executions" FROM stackpilot_control;

REVOKE ALL ON TABLE "tasks" FROM stackpilot_control;

REVOKE ALL ON TABLE "task_dependencies" FROM stackpilot_control;

REVOKE ALL ON TABLE "task_attempts" FROM stackpilot_control;

REVOKE ALL ON TABLE "idempotency_keys" FROM stackpilot_control;

REVOKE ALL ON TABLE "categories" FROM stackpilot_control;

REVOKE ALL ON TABLE "vendors" FROM stackpilot_control;

REVOKE ALL ON TABLE "products" FROM stackpilot_control;

REVOKE ALL ON TABLE "product_aliases" FROM stackpilot_control;

REVOKE ALL ON TABLE "product_claims" FROM stackpilot_control;

REVOKE ALL ON TABLE "evidence_sources" FROM stackpilot_control;

REVOKE ALL ON TABLE "claim_evidence" FROM stackpilot_control;

REVOKE ALL ON TABLE "product_reviews" FROM stackpilot_control;

REVOKE ALL ON TABLE "recommendations" FROM stackpilot_control;

REVOKE ALL ON TABLE "market_opportunities" FROM stackpilot_control;

REVOKE ALL ON TABLE "market_observations" FROM stackpilot_control;

REVOKE ALL ON TABLE "competitors" FROM stackpilot_control;

REVOKE ALL ON TABLE "seasonal_trends" FROM stackpilot_control;

REVOKE ALL ON TABLE "keyword_clusters" FROM stackpilot_control;

REVOKE ALL ON TABLE "keywords" FROM stackpilot_control;

REVOKE ALL ON TABLE "content" FROM stackpilot_control;

REVOKE ALL ON TABLE "content_versions" FROM stackpilot_control;

REVOKE ALL ON TABLE "content_claims" FROM stackpilot_control;

REVOKE ALL ON TABLE "partnerships" FROM stackpilot_control;

REVOKE ALL ON TABLE "partnership_events" FROM stackpilot_control;

REVOKE ALL ON TABLE "affiliate_programmes" FROM stackpilot_control;

REVOKE ALL ON TABLE "commission_terms" FROM stackpilot_control;

REVOKE ALL ON TABLE "revenue_forecasts" FROM stackpilot_control;

REVOKE ALL ON TABLE "external_statements" FROM stackpilot_control;

REVOKE ALL ON TABLE "commission_records" FROM stackpilot_control;

REVOKE ALL ON TABLE "approval_requests" FROM stackpilot_control;

REVOKE ALL ON TABLE "approval_decisions" FROM stackpilot_control;

REVOKE ALL ON TABLE "audit_events" FROM stackpilot_control;

REVOKE ALL ON TABLE "outbox_events" FROM stackpilot_control;

REVOKE ALL ON TABLE "system_settings" FROM stackpilot_control;

REVOKE ALL ON TABLE "retention_jobs" FROM stackpilot_control;

REVOKE ALL ON TABLE "scheduled_jobs" FROM stackpilot_control;

GRANT SELECT ON TABLE users, agents, approval_requests, approval_decisions TO stackpilot_control;

GRANT INSERT ON TABLE approval_decisions, audit_events, outbox_events TO stackpilot_control;

GRANT UPDATE (consumed_at) ON TABLE auth_challenges TO stackpilot_control;

GRANT UPDATE (revoked_at) ON TABLE auth_sessions TO stackpilot_control;
