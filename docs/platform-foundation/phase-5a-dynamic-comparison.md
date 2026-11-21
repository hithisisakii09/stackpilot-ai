# Phase 5A Dynamic Comparison Contract

## Trust boundary

`src/platform/growth/` accepts untrusted caller data only through bounded, own-property, plain-record validation. It never reads the network, database, environment, browser storage, or commercial metadata. A Proxy, accessor, prototype-pollution key, non-finite numeric input, oversized collection/string, affiliate URL, commission, approval actor, tenant/control-plane field, or unknown key fails closed.

## Evidence rules

- A candidate record with no independently approved claims/pricing returns `CANDIDATE_UNVERIFIED` suitability and `UNKNOWN` score/price evidence.
- Alternatives are same-category only. Any ordering by evidence completeness is deterministic; equal/unverified candidates use alphabetical product IDs.
- Outputs explain input/evidence gaps and never name a winner, verified fit, live price, or commission result.

## Public projection

The public model allowlists product ID, display name, category, candidate-safe description, local profile/pairwise links, workflow tags, and explicit `UNKNOWN` evidence labels. It rejects rather than strips internal tenant/identity/trust/approval/control-path/note/commercial fields. The export command is dry-run by default; only `--write` may emit its designated generated JSON, never overwrite the static catalog.

## Browser contract

The compare page loads a same-origin external module only. Query values are parsed as bounded lower-case allowlisted IDs/categories; malformed, duplicate, cross-category, or unknown values render a non-sensitive status without DOM interpolation. The matrix uses DOM text nodes, supports two or three selections, labels all uncertainty, exposes an accessible scroll region, and exports a local CSV with spreadsheet-formula prefixes neutralized.
