export function buildProductMigrationSql() {
  return `-- StackPilot migration 8. Candidate taxonomy aliases and duplicate review proposals.
CREATE TABLE category_aliases (
 organization_id text NOT NULL REFERENCES organizations(id),
 id text NOT NULL,
 category_id text NOT NULL,
 alias text NOT NULL CHECK (alias ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND length(alias) BETWEEN 3 AND 64),
 created_at timestamp NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id,id),
 UNIQUE (organization_id,alias),
 FOREIGN KEY (organization_id,category_id) REFERENCES categories(organization_id,id)
);
CREATE TABLE product_duplicate_proposals (
 organization_id text NOT NULL REFERENCES organizations(id),
 id text NOT NULL,
 left_product_id text NOT NULL,
 right_product_id text NOT NULL,
 vendor_url text NOT NULL CHECK (vendor_url LIKE 'https://%' AND length(vendor_url) <= 2048),
 reason text NOT NULL CHECK (reason = 'same-canonical-vendor-url'),
 review_state text NOT NULL CHECK (review_state = 'unreviewed'),
 created_at timestamp NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id,id),
 UNIQUE (organization_id,left_product_id,right_product_id),
 CHECK (left_product_id COLLATE "C" < right_product_id COLLATE "C"),
 FOREIGN KEY (organization_id,left_product_id) REFERENCES products(organization_id,id),
 FOREIGN KEY (organization_id,right_product_id) REFERENCES products(organization_id,id)
);
ALTER TABLE category_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_aliases FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON category_aliases USING (organization_id = nullif(current_setting('stackpilot.organization_id',true),'')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id',true),''));
REVOKE ALL ON category_aliases FROM PUBLIC,stackpilot_app;
GRANT SELECT,INSERT ON category_aliases TO stackpilot_app;
ALTER TABLE product_duplicate_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_duplicate_proposals FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON product_duplicate_proposals USING (organization_id = nullif(current_setting('stackpilot.organization_id',true),'')) WITH CHECK (organization_id = nullif(current_setting('stackpilot.organization_id',true),''));
REVOKE ALL ON product_duplicate_proposals FROM PUBLIC,stackpilot_app;
GRANT SELECT,INSERT ON product_duplicate_proposals TO stackpilot_app;
`;
}
