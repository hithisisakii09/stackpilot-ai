# Static internal navigation integrity audit — 2026-11-01

## Background
The current Astro prelaunch audit checks all generated HTML for noindex, CSP and unsafe external resources. Its **route scan does not check whether local anchors lead to a generated HTML page or static file**. An accidentally deleted page can leave a visually polished but broken private preview while CI remains green. Fix this release-quality gap rather than adding another calculator.

## Contract
- New pure helper `src/lib/internal-navigation-audit.mjs` exposing `auditInternalNavigation(pages, files)` returns `{checkedLinks,violations}`; neither input is modified. `pages` is the same `[{path,html}]` rendered-output inventory passed to the existing release preflight; `files` lists **every emitted static file** relative to `dist`.
- Validate nonempty route inventory, exact normalized safe relative file paths, unique file inventory, and that all input page paths are present among emitted files. Do not infer a hosted site status.
- For static `<a href>` destinations only: skip outbound HTTPS links, mailto, and fragment-only same-page links (handled separately in browser tests); resolve leading-slash and relative local destinations using a dummy origin and each page's real route. Query strings/fragments do not affect file existence. Reject absent/blank local destinations, unsafe schemes/protocol-relative URLs, nonexistent links, paths escaping known built route, malformed encoded paths, and missing static assets. A route ending with `/` resolves to `index.html`; a path without extension may resolve to `index.html` for Astro; an explicit file extension checks exact file. No network calls.
- To limit mistaken parsing, the matcher considers only `<a ...>` opening tags, not data-href or script strings; handle quoted/single-quoted/unquoted `href`; do not overstate this as a complete HTML parser or host security audit.
- Integrate with `scripts/release-preflight.mjs` after collecting actual emitted HTML and **all** regular static assets. If violations, exit nonzero. Preserve existing static-security checks and print `checkedLinks` for auditability. Tests should enforce this wiring so future changes cannot silently remove link auditing.
- Add `tests/internal-navigation-audit.test.mjs` with valid home/tool/relative/external paths, fragment and query cases, broken pages/assets, duplicate or malformed manifest, external navigation, safe error handling, and guard that release-preflight invokes it. Commit tests before implementation, observe RED in CI, then GREEN and actual browser/safety/deploy-preview verification.

## Risk boundaries
No dependency, public launch, DNS, brand, partner activation, Netlify account change, Vercel recreation, spending or merging. GitHub Actions is build-output evidence only: a passed link check does NOT prove authenticated remote access, account billing/privacy, human content review, legal approval or public-release authorization. Retain owner budget ₹0 and draft PR #1.

## Method
Gstack Think→Plan→Build→Review→Test→Ship→Reflect; obra/superpowers TDD RED→GREEN and verification-before-completion; apply manually. Sources: `https://raw.githubusercontent.com/garrytan/gstack/main/review/SKILL.md`, `https://raw.githubusercontent.com/obra/superpowers/main/skills/test-driven-development/SKILL.md` and `.../verification-before-completion/SKILL.md`.
