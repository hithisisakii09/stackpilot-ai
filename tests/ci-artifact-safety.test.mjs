import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('artifact workflows use reviewed Node 24 uploader without widening archive scope', () => {
  const expected = {
    'browser-qa.yml': [['stackpilot-browser-qa', 'artifacts/browser-qa/', '7']],
    'agent-ops.yml': [
      ['stackpilot-operations-report', 'artifacts/ops/', '7'],
      ['stackpilot-private-preview-package', 'artifacts/private-preview/', '3'],
    ],
  };
  for (const [file, archives] of Object.entries(expected)) {
    const workflow = readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8');
    const blocks = workflow.split(/\r?\n      - /).filter(block => block.includes('uses: actions/upload-artifact@'));
    assert.equal(blocks.length, archives.length, file);
    assert.match(workflow, /permissions:\s*\r?\n  contents: read/);
    for (const [i, block] of blocks.entries()) {
      assert.match(block, /uses: actions\/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f\b/, file);
      const [name, path, retention] = archives[i];
      assert.equal(block.match(/\n\s+name: (\S+)/)?.[1], name);
      assert.equal(block.match(/\n\s+path: (\S+)/)?.[1], path);
      assert.equal(block.match(/\n\s+retention-days: (\d+)/)?.[1], retention);
      assert.doesNotMatch(block, /include-hidden-files:\s*true|overwrite:\s*true/);
    }
  }
});
