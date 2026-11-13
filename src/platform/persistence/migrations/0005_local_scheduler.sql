-- StackPilot scheduler migration 5. Disposable local preparation and observation.
ALTER TABLE scheduled_jobs ADD COLUMN local_state text NOT NULL DEFAULT 'paused' CHECK (local_state IN ('paused','active','cancelled'));
ALTER TABLE scheduled_jobs ADD COLUMN next_due_ms bigint NOT NULL DEFAULT 0 CHECK (next_due_ms BETWEEN 0 AND 4102444800000);
ALTER TABLE scheduled_jobs ADD COLUMN last_execution_id text;
ALTER TABLE scheduled_jobs ADD CONSTRAINT scheduled_jobs_execution FOREIGN KEY (organization_id,last_execution_id) REFERENCES workflow_executions(organization_id,id);
GRANT UPDATE (local_state,next_due_ms,last_execution_id) ON scheduled_jobs TO stackpilot_app;
CREATE INDEX scheduled_jobs_local_due ON scheduled_jobs(organization_id,local_state,next_due_ms,id);
ALTER TABLE outbox_events ADD COLUMN observed_at timestamptz;
ALTER TABLE outbox_events ADD COLUMN observation jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(observation) = 'object' AND octet_length(observation::text) <= 2048);
GRANT UPDATE (observed_at,observation) ON outbox_events TO stackpilot_app;
CREATE INDEX outbox_events_local_pending ON outbox_events(organization_id,created_at,id) WHERE observed_at IS NULL;
ALTER TABLE task_attempts ADD CONSTRAINT task_attempts_task_identity UNIQUE (organization_id,task_id,id);
CREATE TABLE agent_executions (
 organization_id text NOT NULL,
 id text NOT NULL,
 execution_id text NOT NULL,
 task_id text NOT NULL,
 attempt_id text NOT NULL,
 role_id text NOT NULL,
 pipeline text NOT NULL CHECK (pipeline IN ('research-intake','analysis-editorial-proposal','engineering-verification')),
 status text NOT NULL DEFAULT 'prepared' CHECK (status = 'prepared'),
 output_digest text NOT NULL CHECK (output_digest ~ '^[a-f0-9]{64}$'),
 created_at timestamp NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id,id),
 FOREIGN KEY (organization_id,execution_id,task_id) REFERENCES tasks(organization_id,execution_id,id),
 FOREIGN KEY (organization_id,task_id,attempt_id) REFERENCES task_attempts(organization_id,task_id,id)
);
CREATE INDEX agent_executions_cursor ON agent_executions(organization_id,created_at,id);
CREATE INDEX agent_executions_task ON agent_executions(organization_id,execution_id,task_id);
CREATE INDEX agent_executions_attempt ON agent_executions(organization_id,task_id,attempt_id);
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON agent_executions USING (organization_id = nullif(current_setting('stackpilot.organization_id',true),'')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id',true),''));
REVOKE ALL ON agent_executions FROM PUBLIC,stackpilot_app;
GRANT SELECT,INSERT ON agent_executions TO stackpilot_app;
