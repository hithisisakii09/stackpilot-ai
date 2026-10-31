# Vercel deletion post-check — 2026-10-31

Owner reported deletion of legacy Vercel project `masher2/stackpilot-ai`. A subsequent authenticated project lookup returned HTTP 404 `Project not found`, consistent with the deletion. This document records the distinction between historical commit statuses and new status contexts.

- Before this commit, PR #1 at `2f312c3d1c111fc8fcdf8a3ef9d0a72db26a8bbe` had a **historical failing Vercel status**, while the primary private Netlify deploy preview succeeded.
- The legacy project was not and is not the authorized public launch host; Netlify remains Private with publishing locked as last confirmed by the owner.
- A new commit is necessary to check whether Vercel still creates a *new* status. The absence of a status would be positive point-in-time evidence, not a guarantee about all future workflows.
- Do not re-create Vercel projects, pay for upgrades, alter public visibility, merge PR #1, change billing, approve vendor claims, or activate affiliates.
- Keep ₹0 monthly and delegated spending. Production **NO-GO**.

After this documentation-only commit, inspect its GitHub combined statuses and Actions on the exact SHA. If a Vercel status reappears, inspect GitHub's repository-level Vercel installation/check source without touching Netlify.
