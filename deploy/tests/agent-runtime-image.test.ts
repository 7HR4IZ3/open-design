import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const repoRoot = join(import.meta.dirname, '../..');
const dockerfilePath = join(repoRoot, 'deploy/Dockerfile');

test('hosted image explicitly installs and verifies bundled agent CLIs', async () => {
  const source = await readFile(dockerfilePath, 'utf8');

  // npm 12 blocks dependency lifecycle scripts by default. OpenCode's
  // postinstall is required because its npm package ships a placeholder until
  // that script copies the platform-specific executable into place.
  assert.match(
    source,
    /npm config set allow-scripts=opencode-ai --location=user/,
    'the image must approve OpenCode\'s required postinstall script',
  );

  // Keep a broken runtime from reaching Render: these are the exact commands
  // the daemon later probes through /api/agents.
  assert.match(source, /command -v codex && codex --version/);
  assert.match(source, /command -v opencode && opencode --version/);
});
