# Milestone 2 — Local private-text-file snapshot intake

Date: 2026-11-05. Existing private Draft PR #8 only.

## Goal and risk
The offline snapshot consistency check currently requires a researcher to copy the entire local source text into a JSON string. This is inconvenient, promotes accidental data duplication, and can introduce erroneous escaping. Provide an **opt-in read-only local file mode** to keep source text outside the repo. This does NOT retrieve external vendor pages or independently authenticate their content.

## Test-first scope
1. RED tests for `readPrivateSourceTextFile(absolutePath)`: require an absolute existing regular UTF-8 file strictly **outside** the repository; reject file/directory symlinks, repository-local files including dist, directories, invalid UTF-8, binary NUL, empty/short content, files greater than 256 KiB, and paths with unsafe control characters. Never leak private paths or text in errors.
2. Update existing `research:snapshot-check` CLI with optional `--text-file /absolute/private/source.txt`; mode expects stdin JSON with exactly `{capture,snapshot:{sourceUrl,snapshotOn}}` and securely reads snapshot text from the supplied file. Preserve legacy embedded-text stdin behavior and no other flags. Do not write source to repository, temporary files, stdout/stderr or logs.
3. Verify the local consistency checker still enforces a claim-specific validated proposal/capture; all matches remain *unverified*, and mismatches return nonzero without source text in output.
4. Docs: concrete private handoff for one claim, local file path, blank human-supplied evidence fields, and escalation requirements. No fabricated vendor excerpts.
5. Exact-final-SHA CI build/tests, operations, Chromium and private preview status. PR draft, main unchanged, no spend, no merge, no affiliate or public release.

## Threat boundary
A local plaintext file is attacker-editable: matching bytes only establish local internal consistency, not source authenticity or claim support. The path check prevents accidental processing of public/repo data and symlink tricks; it is not a sandbox against a hostile same-user process, concurrent file replacement or operating-system compromise. Network access is never attempted. Authentic reviewer identity, independent audit and owner approval remain absent.
