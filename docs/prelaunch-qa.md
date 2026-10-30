# StackPilot AI — Prelaunch QA and release gate

## Current scope
Development branch only. No merge to main, no public deployment, no affiliate activation, and no price or compatibility claims without source evidence.

## Automated checks
- `npm run check:data`: schema checks, duplicate IDs, HTTPS links, research-status consistency, no affiliate URLs
- `node --test tests/*.test.mjs`: recommendation, catalog integrity, and launch-safety guard tests
- `npm run build`: compile all static Astro routes
- `npm run check:build`: confirm generated profiles, comparison, trust pages, noindex, navigation, and product presence
- `npm test`: run all checks above; CI automatically runs this

## Verified automated coverage (prelaunch branch)
- Chromium runs local Astro preview on desktop (1440px) and mobile (390px).
- Tests all three recommendation priorities and the six software profile pages.
- Exercises same-category comparison selection, duplicate blocking, stale comparison clearing, and transparent unknown values.
- Checks accessibility with axe for WCAG 2 A/AA and 2.1 A/AA on key states.
- Collects screenshots as short-retention private CI artifacts.
- Tests static robots.txt, noindex meta and Vercel X-Robots-Tag configuration.
- Verifies zero active affiliate URLs through catalog validation.

**Automated success does not substitute for an authenticated, production-like browser review or a final editorial/legal sign-off.**

## Manual acceptance checklist
- [ ] On desktop and mobile, homepage advisor collects priority, team size, and budget without console errors
- [ ] Three priorities return the correct category, each with uncertainty warnings
- [ ] Labels, keyboard focus, and status announcements remain accessible
- [ ] All six profile routes resolve and show truthful unverified status
- [ ] Compare page enforces same-category selection and never suggests a winner based on unverified data
- [ ] All official vendor outbound links are HTTPS and open without access to opener
- [ ] All local routes work when directly loaded (not only from homepage)
- [ ] No third-party tracking, affiliate IDs, PII collection, or analytics unexpectedly present
- [ ] Verify page layout at narrow mobile widths and zoom 200%
- [ ] Manually inspect all accessibility, console, and network errors

## Shipping blockers requiring explicit owner approval
1. Agree public hostname and operator identity (for canonical URLs, legal pages, privacy).
2. Provide a deployment target and scope. Current repo should stay private until reviewed.
3. Verify factual claims and current pricing from vendor primary sources, with dated evidence.
4. Replace prelaunch privacy notes with appropriate reviewed legal policy.
5. Explicitly authorize production publishing; do not remove noindex before this authorization.
6. Separately approve every affiliate program and link before activation.

## Not proven by unit tests
Automated tests do not verify the truth of SaaS claims, the accessibility of the rendered site, external destination reliability, or privacy practices of any future deployment. Do not mark launch READY based only on passing CI.
