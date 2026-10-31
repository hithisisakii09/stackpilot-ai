# CRM synthetic mapping exercise — implementation plan (2026-10-31)
Goal: offer a downloadable, fictional field-mapping CSV for buyer education, without collecting real customer data.
Scope: a plain static CSV under public/examples, a tested link from the private CRM guide, no JavaScript, no account access.
TDD: first add a failing Node test that requires the CSV, validates exact headers and synthetic-only values, and requires a link in the guide. Inspect RED workflow failure before writing the CSV and link. Then implement minimally and verify full CI/Chromium and Netlify private preview on the resulting exact SHA.
Constraints: preserve noindex, Netlify private/locked, ₹0 delegated budget, catalog claims all candidates, affiliates inactive, no main merge and no public launch.
Method: Superpowers test-driven-development RED/GREEN and gstack review/QA inspection; remote authenticated UAT separate. Do not assert that test workflows ran until verified.
