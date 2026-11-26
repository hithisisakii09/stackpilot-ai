-- StackPilot approval migration 3. Candidate claim review preparation.
ALTER TABLE product_claims ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE product_claims ADD CONSTRAINT product_claims_c2 CHECK (version > 0);
GRANT SELECT ON TABLE products, product_claims, claim_evidence, evidence_sources TO stackpilot_control;
GRANT INSERT ON TABLE approval_requests TO stackpilot_control;
