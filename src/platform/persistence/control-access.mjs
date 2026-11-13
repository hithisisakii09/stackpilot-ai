export async function assertControlAccess(client) {
  const result = await client.query(`SELECT
    current_user = 'stackpilot_control'
    AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole
    AND NOT rolinherit AND NOT rolreplication AND rolconfig IS NULL
    AND NOT EXISTS (SELECT FROM pg_auth_members WHERE member=r.oid OR roleid=r.oid)
    AND NOT EXISTS (SELECT FROM pg_shdepend WHERE refclassid='pg_authid'::regclass AND refobjid=r.oid AND deptype='o')
    AND NOT has_schema_privilege(current_user,'public','CREATE')
    AND NOT EXISTS (
      SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f') AND (
        has_table_privilege(current_user,c.oid,'UPDATE,DELETE,TRUNCATE,TRIGGER')
        OR has_any_column_privilege(current_user,c.oid,'REFERENCES')
        OR (has_any_column_privilege(current_user,c.oid,'SELECT') AND c.relname NOT IN
          ('users','agents','approval_requests','approval_decisions','auth_challenges','auth_sessions','approval_request_bindings','products','product_claims','claim_evidence','evidence_sources'))
        OR (has_any_column_privilege(current_user,c.oid,'INSERT') AND c.relname NOT IN
          ('auth_challenges','auth_sessions','approval_request_bindings','approval_requests','approval_decisions','audit_events','outbox_events'))
        OR EXISTS (SELECT FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
          AND has_column_privilege(current_user,c.oid,a.attnum,'UPDATE')
          AND NOT (c.relname='auth_challenges' AND a.attname='consumed_at' OR c.relname='auth_sessions' AND a.attname='revoked_at'))
      )
    ) AS restricted
    FROM pg_roles r WHERE rolname=current_user`);
  if (result.rows[0]?.restricted !== true) throw new Error('Invalid control database role');
}
