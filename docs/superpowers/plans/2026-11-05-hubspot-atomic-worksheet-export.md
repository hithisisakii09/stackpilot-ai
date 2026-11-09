# Milestone 2 — HubSpot atomic manual research worksheet

Date: 2026-11-05. Draft PR #8, `feature/phase-2-product-readiness`. Owner budget ₹0.

## Problem and safe boundary

The existing four-part HubSpot data-export assessment highlights the correct independent questions, but it is not yet usable as a fill-in source worksheet. A human must inspect real vendor documentation, record exact short supporting excerpts, scope and missing evidence, without treating a source lead or local excerpt as proof of the **combined** assertion. Web source inspection is unavailable in this session. Do not invent source observations.

## Test-first implementation

1. RED tests for pure `serializeHubspotExportWorksheetCsv(report)`: exactly four rows and one header; all four atomic IDs in order; each row includes its own questions and `NEEDS-EVIDENCE`; empty manual fields for source URL, inspection date, plan, region, permissions, short excerpt, caveats and disposition. No auto-populated vendor source URLs, timestamps, observations or approved values.
2. Refuse any report inconsistent with private/unverified state, missing or duplicate predicate IDs, authorized-looking approval flags, attached source/capture IDs, or changed row counts. Escape every CSV cell, including literal commas, double quotes and spreadsheet formula triggers prefixed by whitespace/zero-width code points. Output is deterministic CRLF CSV and never a validation or import pathway.
3. Add `--csv` to existing read-only `npm run research:hubspot-export-checklist` CLI. Default summary stays redacted, `--json` keeps private raw data, `--csv` only emits the unverified fill-in worksheet. Reject duplicate/unknown flags.
4. Update `.gitignore`, index material guard and public build leakage scanner to block conventional `hubspot-export-evidence-assessment.csv` exports, plus RED tests.
5. Update the private first-claim pilot handoff with command and constraints. CI verify exact final SHA: Node/build/preflight, safety, browser acceptance, private Deploy Preview provider status. Preserve all 36 claims as unverified, all editorial actions denied, ₹0 spend and NO-GO.

## Threats and limitations

CSV is a local research artifact and is not authenticated evidence, independent source inspection, an automated claim approval, or an importable public record. Formula neutralization reduces spreadsheet execution risk but cannot guarantee safety in every parser. Blank fields must be filled only by the human after genuine source review, saved outside the Git repository. Git ignore and file-name guards are defense-in-depth and not content-level confidentiality guarantees.

No new service, key, credentials, packages, payment, outreach, merge, release, deployment setting change or commercial activation.
