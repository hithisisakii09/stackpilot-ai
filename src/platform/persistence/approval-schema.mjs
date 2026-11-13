import {sql} from 'drizzle-orm';
import {pgTable,text,boolean,integer,timestamp,primaryKey,foreignKey,unique,check} from 'drizzle-orm/pg-core';
import {schema} from './schema.mjs';

export const approvalSchema=Object.freeze({
  product_claims:pgTable('product_claims',{
    organizationId:text('organization_id').notNull(),
    id:text('id').notNull(),
    createdAt:timestamp('created_at',{withTimezone:true,mode:'date'}).notNull().default(sql`now()`),
    productId:text('product_id').notNull(),
    statement:text('statement').notNull(),
    caveat:text('caveat').notNull(),
    status:text('status').notNull().default('candidate'),
    approved:boolean('approved').notNull().default(false),
    version:integer('version').notNull().default(1)
  },table=>[
    primaryKey({columns:[table.organizationId,table.id]}),
    foreignKey({name:'product_claims_fk0',columns:[table.organizationId],foreignColumns:[schema.organizations.id]}),
    foreignKey({name:'product_claims_fk1',columns:[table.organizationId,table.productId],foreignColumns:[schema.products.organizationId,schema.products.id]}),
    unique('product_claims_u0').on(table.organizationId,table.productId,table.id),
    check('product_claims_c0',sql`status = 'candidate'`),
    check('product_claims_c1',sql`approved = false`),
    check('product_claims_c2',sql`version > 0`)
  ])
});

export function buildApprovalMigrationSql() {
  return `-- StackPilot approval migration 3. Candidate claim review preparation.
ALTER TABLE product_claims ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE product_claims ADD CONSTRAINT product_claims_c2 CHECK (version > 0);
GRANT SELECT ON TABLE products, product_claims, claim_evidence, evidence_sources TO stackpilot_control;
GRANT INSERT ON TABLE approval_requests TO stackpilot_control;
`;
}
