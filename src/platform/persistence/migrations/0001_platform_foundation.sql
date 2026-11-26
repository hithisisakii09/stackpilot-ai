-- StackPilot local foundation migration 1. Candidate-only and zero-budget.

CREATE TABLE "organizations" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "monthly_budget_inr" integer NOT NULL DEFAULT 0,
  "delegated_spend_inr" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "organizations_c0" CHECK (monthly_budget_inr = 0),
  CONSTRAINT "organizations_c1" CHECK (delegated_spend_inr = 0)
);

CREATE TABLE "users" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "display_name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'unprovisioned',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "users_c0" CHECK (status = 'unprovisioned')
);

CREATE TABLE "roles" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "name" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "roles_u0" UNIQUE ("organization_id", "name")
);

CREATE TABLE "permissions" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "action" text NOT NULL,
  "tier" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "permissions_u0" UNIQUE ("organization_id", "action"),
  CONSTRAINT "permissions_c0" CHECK (tier IN ('allowed','human_approval','legal_review','prohibited'))
);

CREATE TABLE "memberships" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "user_id" text NOT NULL,
  "role_id" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "memberships_u0" UNIQUE ("organization_id", "user_id", "role_id")
);

CREATE TABLE "role_permissions" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "role_id" text NOT NULL,
  "permission_id" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "role_permissions_u0" UNIQUE ("organization_id", "role_id", "permission_id")
);

CREATE TABLE "agents" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "role" text NOT NULL,
  "version" integer NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "definition" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "cost_inr" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "agents_c0" CHECK (version > 0),
  CONSTRAINT "agents_c1" CHECK (enabled = false),
  CONSTRAINT "agents_c2" CHECK (cost_inr = 0)
);

CREATE TABLE "agent_capabilities" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "agent_id" text NOT NULL,
  "action" text NOT NULL,
  "tools" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "agent_capabilities_u0" UNIQUE ("organization_id", "agent_id", "action")
);

CREATE TABLE "workflow_definitions" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "name" text NOT NULL,
  "objective" text NOT NULL,
  PRIMARY KEY ("organization_id", "id")
);

CREATE TABLE "workflow_versions" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "definition_id" text NOT NULL,
  "version" integer NOT NULL,
  "definition" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "workflow_versions_u0" UNIQUE ("organization_id", "definition_id", "version"),
  CONSTRAINT "workflow_versions_c0" CHECK (version > 0)
);

CREATE TABLE "workflow_executions" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "version_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'QUEUED',
  "idempotency_key" text NOT NULL,
  "cost_inr" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "workflow_executions_u0" UNIQUE ("organization_id", "idempotency_key"),
  CONSTRAINT "workflow_executions_c0" CHECK (status IN ('QUEUED','RUNNING','WAITING_FOR_APPROVAL','BLOCKED','FAILED','COMPLETED','CANCELLED')),
  CONSTRAINT "workflow_executions_c1" CHECK (cost_inr = 0)
);

CREATE TABLE "tasks" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "execution_id" text NOT NULL,
  "agent_id" text,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'QUEUED',
  "idempotency_key" text NOT NULL,
  "input" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "retries" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 3,
  "cost_inr" integer NOT NULL DEFAULT 0,
  "lease_until" timestamp with time zone,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "tasks_u0" UNIQUE ("organization_id", "idempotency_key"),
  CONSTRAINT "tasks_u1" UNIQUE ("organization_id", "execution_id", "id"),
  CONSTRAINT "tasks_c0" CHECK (status IN ('QUEUED','RUNNING','WAITING_FOR_APPROVAL','BLOCKED','FAILED','COMPLETED','CANCELLED')),
  CONSTRAINT "tasks_c1" CHECK (cost_inr = 0),
  CONSTRAINT "tasks_c2" CHECK (max_attempts BETWEEN 1 AND 3),
  CONSTRAINT "tasks_c3" CHECK (retries BETWEEN 0 AND max_attempts)
);

CREATE TABLE "task_dependencies" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "execution_id" text NOT NULL,
  "task_id" text NOT NULL,
  "depends_on_task_id" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "task_dependencies_u0" UNIQUE ("organization_id", "task_id", "depends_on_task_id"),
  CONSTRAINT "task_dependencies_c0" CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE "task_attempts" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "task_id" text NOT NULL,
  "attempt" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'QUEUED',
  "output" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "cost_inr" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "task_attempts_u0" UNIQUE ("organization_id", "task_id", "attempt"),
  CONSTRAINT "task_attempts_c0" CHECK (attempt BETWEEN 1 AND 3),
  CONSTRAINT "task_attempts_c1" CHECK (status IN ('QUEUED','RUNNING','WAITING_FOR_APPROVAL','BLOCKED','FAILED','COMPLETED','CANCELLED')),
  CONSTRAINT "task_attempts_c2" CHECK (cost_inr = 0)
);

CREATE TABLE "idempotency_keys" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "operation" text NOT NULL,
  "source_digest" text NOT NULL,
  "result" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "idempotency_keys_c0" CHECK (source_digest ~ '^[a-f0-9]{64}$')
);

CREATE TABLE "categories" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "slug" text NOT NULL,
  "name" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "categories_u0" UNIQUE ("organization_id", "slug")
);

CREATE TABLE "vendors" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "name" text NOT NULL,
  "website" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "vendors_u0" UNIQUE ("organization_id", "website"),
  CONSTRAINT "vendors_c0" CHECK (website LIKE 'https://%')
);

CREATE TABLE "products" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "category_id" text NOT NULL,
  "vendor_id" text NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "website" text NOT NULL,
  "status" text NOT NULL DEFAULT 'candidate',
  "affiliate_url" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "products_u0" UNIQUE ("organization_id", "slug"),
  CONSTRAINT "products_c0" CHECK (status = 'candidate'),
  CONSTRAINT "products_c1" CHECK (affiliate_url IS NULL),
  CONSTRAINT "products_c2" CHECK (website LIKE 'https://%')
);

CREATE TABLE "product_aliases" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "product_id" text NOT NULL,
  "alias" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "product_aliases_u0" UNIQUE ("organization_id", "alias")
);

CREATE TABLE "product_claims" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "product_id" text NOT NULL,
  "statement" text NOT NULL,
  "caveat" text NOT NULL,
  "status" text NOT NULL DEFAULT 'candidate',
  "approved" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "product_claims_u0" UNIQUE ("organization_id", "product_id", "id"),
  CONSTRAINT "product_claims_c0" CHECK (status = 'candidate'),
  CONSTRAINT "product_claims_c1" CHECK (approved = false)
);

CREATE TABLE "evidence_sources" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "product_id" text NOT NULL,
  "source_url" text NOT NULL,
  "collected_at" timestamp with time zone NOT NULL,
  "status" text NOT NULL DEFAULT 'candidate',
  "source_digest" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "evidence_sources_u0" UNIQUE ("organization_id", "product_id", "source_url"),
  CONSTRAINT "evidence_sources_u1" UNIQUE ("organization_id", "product_id", "id"),
  CONSTRAINT "evidence_sources_c0" CHECK (status = 'candidate'),
  CONSTRAINT "evidence_sources_c1" CHECK (source_url LIKE 'https://%'),
  CONSTRAINT "evidence_sources_c2" CHECK (source_digest ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "evidence_sources_c3" CHECK (collected_at <= CURRENT_TIMESTAMP)
);

CREATE TABLE "claim_evidence" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "product_id" text NOT NULL,
  "claim_id" text NOT NULL,
  "source_id" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "claim_evidence_u0" UNIQUE ("organization_id", "claim_id", "source_id")
);

CREATE TABLE "product_reviews" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "product_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'unreviewed',
  "notes" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "product_reviews_c0" CHECK (status = 'unreviewed')
);

CREATE TABLE "recommendations" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "product_id" text NOT NULL,
  "explanation" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'draft',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "recommendations_c0" CHECK (status = 'draft')
);

CREATE TABLE "market_opportunities" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "category_id" text NOT NULL,
  "observation" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "confidence" integer,
  "attractiveness" integer,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "market_opportunities_c0" CHECK (confidence BETWEEN 0 AND 100),
  CONSTRAINT "market_opportunities_c1" CHECK (attractiveness BETWEEN 0 AND 100)
);

CREATE TABLE "market_observations" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "opportunity_id" text NOT NULL,
  "source_url" text NOT NULL,
  "observed_at" timestamp with time zone NOT NULL,
  "observation" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'candidate',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "market_observations_c0" CHECK (status = 'candidate'),
  CONSTRAINT "market_observations_c1" CHECK (source_url LIKE 'https://%'),
  CONSTRAINT "market_observations_c2" CHECK (observed_at <= CURRENT_TIMESTAMP)
);

CREATE TABLE "competitors" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "vendor_id" text NOT NULL,
  "observation" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id")
);

CREATE TABLE "seasonal_trends" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "category_id" text NOT NULL,
  "observations" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'insufficient-evidence',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "seasonal_trends_c0" CHECK (status IN ('insufficient-evidence','candidate'))
);

CREATE TABLE "keyword_clusters" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "name" text NOT NULL,
  "intent" text NOT NULL,
  PRIMARY KEY ("organization_id", "id")
);

CREATE TABLE "keywords" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "cluster_id" text NOT NULL,
  "phrase" text NOT NULL,
  "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id")
);

CREATE TABLE "content" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "category_id" text NOT NULL,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "content_c0" CHECK (status = 'draft')
);

CREATE TABLE "content_versions" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "content_id" text NOT NULL,
  "version" integer NOT NULL,
  "body" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "content_versions_u0" UNIQUE ("organization_id", "content_id", "version"),
  CONSTRAINT "content_versions_c0" CHECK (version > 0),
  CONSTRAINT "content_versions_c1" CHECK (status = 'draft')
);

CREATE TABLE "content_claims" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "version_id" text NOT NULL,
  "claim_id" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "content_claims_u0" UNIQUE ("organization_id", "version_id", "claim_id")
);

CREATE TABLE "partnerships" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "vendor_id" text NOT NULL,
  "step" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'draft',
  "proposal" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "partnerships_c0" CHECK (step BETWEEN 1 AND 12),
  CONSTRAINT "partnerships_c1" CHECK (status IN ('draft','needs-review','rejected'))
);

CREATE TABLE "partnership_events" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "partnership_id" text NOT NULL,
  "kind" text NOT NULL,
  "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id")
);

CREATE TABLE "affiliate_programmes" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "vendor_id" text NOT NULL,
  "source_url" text,
  "status" text NOT NULL DEFAULT 'candidate',
  "active" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "affiliate_programmes_c0" CHECK (status = 'candidate'),
  CONSTRAINT "affiliate_programmes_c1" CHECK (active = false)
);

CREATE TABLE "commission_terms" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "programme_id" text NOT NULL,
  "terms" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'candidate',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "commission_terms_c0" CHECK (status = 'candidate')
);

CREATE TABLE "revenue_forecasts" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "programme_id" text NOT NULL,
  "assumptions" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'unavailable',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "revenue_forecasts_c0" CHECK (status IN ('unavailable','scenario'))
);

CREATE TABLE "external_statements" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "programme_id" text NOT NULL,
  "statement_digest" text NOT NULL,
  "recorded_at" timestamp with time zone NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "external_statements_u0" UNIQUE ("organization_id", "statement_digest"),
  CONSTRAINT "external_statements_u1" UNIQUE ("organization_id", "programme_id", "id"),
  CONSTRAINT "external_statements_c0" CHECK (statement_digest ~ '^[a-f0-9]{64}$')
);

CREATE TABLE "commission_records" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "programme_id" text NOT NULL,
  "statement_id" text,
  "is_estimate" boolean NOT NULL,
  "amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "commission_records_c0" CHECK (amount_minor >= 0),
  CONSTRAINT "commission_records_c1" CHECK (is_estimate OR statement_id IS NOT NULL),
  CONSTRAINT "commission_records_c2" CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE TABLE "approval_requests" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "agent_id" text NOT NULL,
  "action" text NOT NULL,
  "resource_id" text NOT NULL,
  "payload_digest" text NOT NULL,
  "evidence_digest" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "approval_requests_c0" CHECK (status = 'pending'),
  CONSTRAINT "approval_requests_c1" CHECK (payload_digest ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "approval_requests_c2" CHECK (evidence_digest ~ '^[a-f0-9]{64}$')
);

CREATE TABLE "approval_decisions" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "request_id" text NOT NULL,
  "decider_user_id" text NOT NULL,
  "decision" text NOT NULL,
  "decided_at" timestamp with time zone NOT NULL,
  "request_digest" text NOT NULL,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "approval_decisions_u0" UNIQUE ("organization_id", "request_id"),
  CONSTRAINT "approval_decisions_c0" CHECK (decision IN ('approved','rejected','revoked')),
  CONSTRAINT "approval_decisions_c1" CHECK (request_digest ~ '^[a-f0-9]{64}$')
);

CREATE TABLE "audit_events" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "actor_id" text NOT NULL,
  "request_id" text NOT NULL,
  "action" text NOT NULL,
  "target_id" text NOT NULL,
  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id")
);

CREATE TABLE "outbox_events" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "audit_id" text NOT NULL,
  "kind" text NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'pending',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "outbox_events_c0" CHECK (status = 'pending')
);

CREATE TABLE "system_settings" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "key" text NOT NULL,
  "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "system_settings_u0" UNIQUE ("organization_id", "key")
);

CREATE TABLE "retention_jobs" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "table_name" text NOT NULL,
  "retain_days" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'disabled',
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "retention_jobs_c0" CHECK (retain_days > 0),
  CONSTRAINT "retention_jobs_c1" CHECK (status = 'disabled')
);

CREATE TABLE "scheduled_jobs" (
  "organization_id" text NOT NULL,
  "id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "definition_id" text NOT NULL,
  "schedule" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "cost_inr" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("organization_id", "id"),
  CONSTRAINT "scheduled_jobs_c0" CHECK (enabled = false),
  CONSTRAINT "scheduled_jobs_c1" CHECK (cost_inr = 0)
);

ALTER TABLE "users" ADD CONSTRAINT "users_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "roles" ADD CONSTRAINT "roles_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "permissions" ADD CONSTRAINT "permissions_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_fk1" FOREIGN KEY ("organization_id", "user_id") REFERENCES "users" ("organization_id", "id");

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_fk2" FOREIGN KEY ("organization_id", "role_id") REFERENCES "roles" ("organization_id", "id");

CREATE INDEX "memberships_i0" ON "memberships" ("organization_id", "role_id");

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_fk1" FOREIGN KEY ("organization_id", "role_id") REFERENCES "roles" ("organization_id", "id");

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_fk2" FOREIGN KEY ("organization_id", "permission_id") REFERENCES "permissions" ("organization_id", "id");

CREATE INDEX "role_permissions_i0" ON "role_permissions" ("organization_id", "permission_id");

ALTER TABLE "agents" ADD CONSTRAINT "agents_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "agent_capabilities" ADD CONSTRAINT "agent_capabilities_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "agent_capabilities" ADD CONSTRAINT "agent_capabilities_fk1" FOREIGN KEY ("organization_id", "agent_id") REFERENCES "agents" ("organization_id", "id");

ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_fk1" FOREIGN KEY ("organization_id", "definition_id") REFERENCES "workflow_definitions" ("organization_id", "id");

ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_fk1" FOREIGN KEY ("organization_id", "version_id") REFERENCES "workflow_versions" ("organization_id", "id");

CREATE INDEX "workflow_executions_i0" ON "workflow_executions" ("organization_id", "status", "created_at");

CREATE INDEX "workflow_executions_i1" ON "workflow_executions" ("organization_id", "version_id");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_fk1" FOREIGN KEY ("organization_id", "execution_id") REFERENCES "workflow_executions" ("organization_id", "id");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_fk2" FOREIGN KEY ("organization_id", "agent_id") REFERENCES "agents" ("organization_id", "id");

CREATE INDEX "tasks_i0" ON "tasks" ("organization_id", "status", "lease_until");

CREATE INDEX "tasks_i1" ON "tasks" ("organization_id", "agent_id");

ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_fk1" FOREIGN KEY ("organization_id", "execution_id", "task_id") REFERENCES "tasks" ("organization_id", "execution_id", "id");

ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_fk2" FOREIGN KEY ("organization_id", "execution_id", "depends_on_task_id") REFERENCES "tasks" ("organization_id", "execution_id", "id");

CREATE INDEX "task_dependencies_i0" ON "task_dependencies" ("organization_id", "execution_id", "task_id");

CREATE INDEX "task_dependencies_i1" ON "task_dependencies" ("organization_id", "execution_id", "depends_on_task_id");

ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_fk1" FOREIGN KEY ("organization_id", "task_id") REFERENCES "tasks" ("organization_id", "id");

ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "categories" ADD CONSTRAINT "categories_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "vendors" ADD CONSTRAINT "vendors_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "products" ADD CONSTRAINT "products_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "products" ADD CONSTRAINT "products_fk1" FOREIGN KEY ("organization_id", "category_id") REFERENCES "categories" ("organization_id", "id");

ALTER TABLE "products" ADD CONSTRAINT "products_fk2" FOREIGN KEY ("organization_id", "vendor_id") REFERENCES "vendors" ("organization_id", "id");

CREATE INDEX "products_i0" ON "products" ("organization_id", "category_id");

CREATE INDEX "products_i1" ON "products" ("organization_id", "vendor_id");

ALTER TABLE "product_aliases" ADD CONSTRAINT "product_aliases_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "product_aliases" ADD CONSTRAINT "product_aliases_fk1" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products" ("organization_id", "id");

CREATE INDEX "product_aliases_i0" ON "product_aliases" ("organization_id", "product_id");

ALTER TABLE "product_claims" ADD CONSTRAINT "product_claims_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "product_claims" ADD CONSTRAINT "product_claims_fk1" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products" ("organization_id", "id");

ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "evidence_sources" ADD CONSTRAINT "evidence_sources_fk1" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products" ("organization_id", "id");

ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_fk1" FOREIGN KEY ("organization_id", "product_id", "claim_id") REFERENCES "product_claims" ("organization_id", "product_id", "id");

ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_fk2" FOREIGN KEY ("organization_id", "product_id", "source_id") REFERENCES "evidence_sources" ("organization_id", "product_id", "id");

CREATE INDEX "claim_evidence_i0" ON "claim_evidence" ("organization_id", "product_id", "claim_id");

CREATE INDEX "claim_evidence_i1" ON "claim_evidence" ("organization_id", "product_id", "source_id");

ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_fk1" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products" ("organization_id", "id");

CREATE INDEX "product_reviews_i0" ON "product_reviews" ("organization_id", "product_id");

ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_fk1" FOREIGN KEY ("organization_id", "product_id") REFERENCES "products" ("organization_id", "id");

CREATE INDEX "recommendations_i0" ON "recommendations" ("organization_id", "product_id");

ALTER TABLE "market_opportunities" ADD CONSTRAINT "market_opportunities_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "market_opportunities" ADD CONSTRAINT "market_opportunities_fk1" FOREIGN KEY ("organization_id", "category_id") REFERENCES "categories" ("organization_id", "id");

CREATE INDEX "market_opportunities_i0" ON "market_opportunities" ("organization_id", "category_id");

ALTER TABLE "market_observations" ADD CONSTRAINT "market_observations_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "market_observations" ADD CONSTRAINT "market_observations_fk1" FOREIGN KEY ("organization_id", "opportunity_id") REFERENCES "market_opportunities" ("organization_id", "id");

CREATE INDEX "market_observations_i0" ON "market_observations" ("organization_id", "opportunity_id");

ALTER TABLE "competitors" ADD CONSTRAINT "competitors_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "competitors" ADD CONSTRAINT "competitors_fk1" FOREIGN KEY ("organization_id", "vendor_id") REFERENCES "vendors" ("organization_id", "id");

CREATE INDEX "competitors_i0" ON "competitors" ("organization_id", "vendor_id");

ALTER TABLE "seasonal_trends" ADD CONSTRAINT "seasonal_trends_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "seasonal_trends" ADD CONSTRAINT "seasonal_trends_fk1" FOREIGN KEY ("organization_id", "category_id") REFERENCES "categories" ("organization_id", "id");

CREATE INDEX "seasonal_trends_i0" ON "seasonal_trends" ("organization_id", "category_id");

ALTER TABLE "keyword_clusters" ADD CONSTRAINT "keyword_clusters_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "keywords" ADD CONSTRAINT "keywords_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "keywords" ADD CONSTRAINT "keywords_fk1" FOREIGN KEY ("organization_id", "cluster_id") REFERENCES "keyword_clusters" ("organization_id", "id");

CREATE INDEX "keywords_i0" ON "keywords" ("organization_id", "cluster_id");

ALTER TABLE "content" ADD CONSTRAINT "content_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "content" ADD CONSTRAINT "content_fk1" FOREIGN KEY ("organization_id", "category_id") REFERENCES "categories" ("organization_id", "id");

CREATE INDEX "content_i0" ON "content" ("organization_id", "category_id");

ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_fk1" FOREIGN KEY ("organization_id", "content_id") REFERENCES "content" ("organization_id", "id");

ALTER TABLE "content_claims" ADD CONSTRAINT "content_claims_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "content_claims" ADD CONSTRAINT "content_claims_fk1" FOREIGN KEY ("organization_id", "version_id") REFERENCES "content_versions" ("organization_id", "id");

ALTER TABLE "content_claims" ADD CONSTRAINT "content_claims_fk2" FOREIGN KEY ("organization_id", "claim_id") REFERENCES "product_claims" ("organization_id", "id");

CREATE INDEX "content_claims_i0" ON "content_claims" ("organization_id", "claim_id");

ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_fk1" FOREIGN KEY ("organization_id", "vendor_id") REFERENCES "vendors" ("organization_id", "id");

CREATE INDEX "partnerships_i0" ON "partnerships" ("organization_id", "vendor_id");

ALTER TABLE "partnership_events" ADD CONSTRAINT "partnership_events_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "partnership_events" ADD CONSTRAINT "partnership_events_fk1" FOREIGN KEY ("organization_id", "partnership_id") REFERENCES "partnerships" ("organization_id", "id");

CREATE INDEX "partnership_events_i0" ON "partnership_events" ("organization_id", "partnership_id");

ALTER TABLE "affiliate_programmes" ADD CONSTRAINT "affiliate_programmes_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "affiliate_programmes" ADD CONSTRAINT "affiliate_programmes_fk1" FOREIGN KEY ("organization_id", "vendor_id") REFERENCES "vendors" ("organization_id", "id");

CREATE INDEX "affiliate_programmes_i0" ON "affiliate_programmes" ("organization_id", "vendor_id");

ALTER TABLE "commission_terms" ADD CONSTRAINT "commission_terms_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "commission_terms" ADD CONSTRAINT "commission_terms_fk1" FOREIGN KEY ("organization_id", "programme_id") REFERENCES "affiliate_programmes" ("organization_id", "id");

CREATE INDEX "commission_terms_i0" ON "commission_terms" ("organization_id", "programme_id");

ALTER TABLE "revenue_forecasts" ADD CONSTRAINT "revenue_forecasts_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "revenue_forecasts" ADD CONSTRAINT "revenue_forecasts_fk1" FOREIGN KEY ("organization_id", "programme_id") REFERENCES "affiliate_programmes" ("organization_id", "id");

CREATE INDEX "revenue_forecasts_i0" ON "revenue_forecasts" ("organization_id", "programme_id");

ALTER TABLE "external_statements" ADD CONSTRAINT "external_statements_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "external_statements" ADD CONSTRAINT "external_statements_fk1" FOREIGN KEY ("organization_id", "programme_id") REFERENCES "affiliate_programmes" ("organization_id", "id");

ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_fk1" FOREIGN KEY ("organization_id", "programme_id") REFERENCES "affiliate_programmes" ("organization_id", "id");

ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_fk2" FOREIGN KEY ("organization_id", "programme_id", "statement_id") REFERENCES "external_statements" ("organization_id", "programme_id", "id");

CREATE INDEX "commission_records_i0" ON "commission_records" ("organization_id", "programme_id");

CREATE INDEX "commission_records_i1" ON "commission_records" ("organization_id", "programme_id", "statement_id");

ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_fk1" FOREIGN KEY ("organization_id", "agent_id") REFERENCES "agents" ("organization_id", "id");

CREATE INDEX "approval_requests_i0" ON "approval_requests" ("organization_id", "agent_id");

ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_fk1" FOREIGN KEY ("organization_id", "request_id") REFERENCES "approval_requests" ("organization_id", "id");

ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_fk2" FOREIGN KEY ("organization_id", "decider_user_id") REFERENCES "users" ("organization_id", "id");

CREATE INDEX "approval_decisions_i0" ON "approval_decisions" ("organization_id", "decider_user_id");

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

CREATE INDEX "audit_events_i0" ON "audit_events" ("organization_id", "created_at");

ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_fk1" FOREIGN KEY ("organization_id", "audit_id") REFERENCES "audit_events" ("organization_id", "id");

CREATE INDEX "outbox_events_i0" ON "outbox_events" ("organization_id", "audit_id");

ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "retention_jobs" ADD CONSTRAINT "retention_jobs_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_fk0" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id");

ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_fk1" FOREIGN KEY ("organization_id", "definition_id") REFERENCES "workflow_definitions" ("organization_id", "id");

CREATE INDEX "scheduled_jobs_i0" ON "scheduled_jobs" ("organization_id", "definition_id");

DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'stackpilot_app') THEN CREATE ROLE stackpilot_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO stackpilot_app;

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "organizations" USING ("id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "organizations" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "organizations" TO stackpilot_app;

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "users" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "users" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "users" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "users" TO stackpilot_app;

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "roles" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "roles" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "roles" TO stackpilot_app;

ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "permissions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "permissions" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "permissions" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "permissions" TO stackpilot_app;

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "memberships" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "memberships" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "memberships" TO stackpilot_app;

ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "role_permissions" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "role_permissions" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "role_permissions" TO stackpilot_app;

ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "agents" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "agents" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "agents" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "agents" TO stackpilot_app;

ALTER TABLE "agent_capabilities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "agent_capabilities" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "agent_capabilities" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "agent_capabilities" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "agent_capabilities" TO stackpilot_app;

ALTER TABLE "workflow_definitions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "workflow_definitions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "workflow_definitions" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "workflow_definitions" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "workflow_definitions" TO stackpilot_app;

ALTER TABLE "workflow_versions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "workflow_versions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "workflow_versions" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "workflow_versions" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "workflow_versions" TO stackpilot_app;

ALTER TABLE "workflow_executions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "workflow_executions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "workflow_executions" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "workflow_executions" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "workflow_executions" TO stackpilot_app;

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "tasks" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "tasks" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "tasks" TO stackpilot_app;

ALTER TABLE "task_dependencies" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "task_dependencies" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "task_dependencies" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "task_dependencies" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "task_dependencies" TO stackpilot_app;

ALTER TABLE "task_attempts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "task_attempts" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "task_attempts" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "task_attempts" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "task_attempts" TO stackpilot_app;

ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "idempotency_keys" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "idempotency_keys" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "idempotency_keys" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "idempotency_keys" TO stackpilot_app;

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "categories" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "categories" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "categories" TO stackpilot_app;

ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "vendors" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "vendors" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "vendors" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "vendors" TO stackpilot_app;

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "products" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "products" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "products" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "products" TO stackpilot_app;

ALTER TABLE "product_aliases" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "product_aliases" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "product_aliases" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "product_aliases" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "product_aliases" TO stackpilot_app;

ALTER TABLE "product_claims" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "product_claims" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "product_claims" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "product_claims" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "product_claims" TO stackpilot_app;

ALTER TABLE "evidence_sources" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "evidence_sources" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "evidence_sources" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "evidence_sources" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "evidence_sources" TO stackpilot_app;

ALTER TABLE "claim_evidence" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "claim_evidence" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "claim_evidence" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "claim_evidence" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "claim_evidence" TO stackpilot_app;

ALTER TABLE "product_reviews" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "product_reviews" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "product_reviews" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "product_reviews" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "product_reviews" TO stackpilot_app;

ALTER TABLE "recommendations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "recommendations" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "recommendations" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "recommendations" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "recommendations" TO stackpilot_app;

ALTER TABLE "market_opportunities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "market_opportunities" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "market_opportunities" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "market_opportunities" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "market_opportunities" TO stackpilot_app;

ALTER TABLE "market_observations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "market_observations" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "market_observations" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "market_observations" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "market_observations" TO stackpilot_app;

ALTER TABLE "competitors" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "competitors" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "competitors" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "competitors" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "competitors" TO stackpilot_app;

ALTER TABLE "seasonal_trends" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "seasonal_trends" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "seasonal_trends" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "seasonal_trends" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "seasonal_trends" TO stackpilot_app;

ALTER TABLE "keyword_clusters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "keyword_clusters" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "keyword_clusters" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "keyword_clusters" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "keyword_clusters" TO stackpilot_app;

ALTER TABLE "keywords" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "keywords" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "keywords" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "keywords" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "keywords" TO stackpilot_app;

ALTER TABLE "content" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "content" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "content" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "content" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "content" TO stackpilot_app;

ALTER TABLE "content_versions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "content_versions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "content_versions" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "content_versions" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "content_versions" TO stackpilot_app;

ALTER TABLE "content_claims" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "content_claims" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "content_claims" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "content_claims" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "content_claims" TO stackpilot_app;

ALTER TABLE "partnerships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "partnerships" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "partnerships" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "partnerships" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "partnerships" TO stackpilot_app;

ALTER TABLE "partnership_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "partnership_events" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "partnership_events" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "partnership_events" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "partnership_events" TO stackpilot_app;

ALTER TABLE "affiliate_programmes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "affiliate_programmes" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "affiliate_programmes" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "affiliate_programmes" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "affiliate_programmes" TO stackpilot_app;

ALTER TABLE "commission_terms" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "commission_terms" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "commission_terms" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "commission_terms" FROM PUBLIC, stackpilot_app;

GRANT SELECT ON TABLE "commission_terms" TO stackpilot_app;

ALTER TABLE "revenue_forecasts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "revenue_forecasts" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "revenue_forecasts" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "revenue_forecasts" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "revenue_forecasts" TO stackpilot_app;

ALTER TABLE "external_statements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "external_statements" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "external_statements" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "external_statements" FROM PUBLIC, stackpilot_app;

GRANT SELECT ON TABLE "external_statements" TO stackpilot_app;

ALTER TABLE "commission_records" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "commission_records" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "commission_records" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "commission_records" FROM PUBLIC, stackpilot_app;

GRANT SELECT ON TABLE "commission_records" TO stackpilot_app;

ALTER TABLE "approval_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "approval_requests" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "approval_requests" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "approval_requests" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "approval_requests" TO stackpilot_app;

ALTER TABLE "approval_decisions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "approval_decisions" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "approval_decisions" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "approval_decisions" FROM PUBLIC, stackpilot_app;

GRANT SELECT ON TABLE "approval_decisions" TO stackpilot_app;

ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "audit_events" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "audit_events" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "audit_events" TO stackpilot_app;

ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "outbox_events" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "outbox_events" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "outbox_events" TO stackpilot_app;

ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "system_settings" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "system_settings" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "system_settings" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "system_settings" TO stackpilot_app;

ALTER TABLE "retention_jobs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "retention_jobs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "retention_jobs" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "retention_jobs" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "retention_jobs" TO stackpilot_app;

ALTER TABLE "scheduled_jobs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "scheduled_jobs" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_scope ON "scheduled_jobs" USING ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('stackpilot.organization_id', true), ''));

REVOKE ALL ON TABLE "scheduled_jobs" FROM PUBLIC, stackpilot_app;

GRANT SELECT, INSERT ON TABLE "scheduled_jobs" TO stackpilot_app;

GRANT UPDATE (version, definition) ON TABLE agents TO stackpilot_app;

GRANT DELETE ON TABLE agent_capabilities TO stackpilot_app;
