# Private prelaunch passive-network safeguards — 2026-11-01

**Goal:** Prevent unreviewed external browser loads (tracking pixels, embedded frames, CSS imports, preconnects and automatic redirects) from silently entering the private StackPilot build. The current static preflight already checks scripts and forms but misses other network primitives.

**Scope:** Read-only security validation of all 17 generated static pages at build time; private development branch, existing draft PR #1. No new dependencies, hosting settings, production promotion, external analytics, payments or accounts.

**TDD steps:**
1. Add `tests/release-preflight.test.mjs` cases for remote image, image srcset, iframe, embedded object, external stylesheet, preconnect, CSS import/url, meta refresh, and remote media. Verify the tests turn RED at a distinct commit.
2. Extend `src/lib/release-preflight.mjs` using existing attribute parsing and scheme rejection; keep valid same-origin assets and normal outbound `<a>` links supported. Avoid adding active browser effects or business logic.
3. Verify GitHub Node/data/build, all-rendered-route release preflight, safety/ops workflow, Chromium/axe and Netlify private preview on exact HEAD. Review for false positives and unhandled limits.
4. Record completed evidence in PR #1 and issue #5. Do not claim remote authenticated testing or legal/editorial/public launch clearance.

**Security limits:** An HTML text/regex static audit is defense-in-depth, not a formal browser parser, Content Security Policy, privacy compliance assessment, or Netlify account audit. Do not claim it detects dynamically constructed requests in bundled JavaScript; existing Chromium QA and manual protected-preview checks remain distinct.

**Release boundaries:** ₹0 monthly and delegated spend, Netlify Private and Locked, `noindex`, PR draft/unmerged, six unapproved vendor claims, no affiliate links, public release NO-GO.

**Methodology references read today:** Superpowers `writing-plans`, `test-driven-development`, `verification-before-completion`; gstack review/QA methodology. No upstream installation.
