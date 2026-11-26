-- StackPilot runner migration 4. Synthetic execution only; no operational authorization.
GRANT UPDATE (status) ON TABLE workflow_executions TO stackpilot_app;
GRANT UPDATE (status, retries, lease_until) ON TABLE tasks TO stackpilot_app;
GRANT UPDATE (status, output) ON TABLE task_attempts TO stackpilot_app;
