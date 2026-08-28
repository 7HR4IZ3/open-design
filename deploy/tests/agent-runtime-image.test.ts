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

test('Docker build carries public hosted-auth configuration into Next.js', async () => {
  const source = await readFile(dockerfilePath, 'utf8');

  // Render exposes service variables as Docker build args. Without declaring
  // and exporting these values in the build stage, the static web bundle sees
  // an empty auth flag and calls the protected daemon before sign-in.
  for (const key of [
    'NEXT_PUBLIC_OD_HOSTED_AUTH_REQUIRED',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]) {
    assert.match(source, new RegExp(`ARG ${key}`));
    assert.match(source, new RegExp(`ENV ${key}=\\$\\{${key}\\}`));
  }

  assert.doesNotMatch(
    source,
    /ARG SUPABASE_SERVICE_ROLE_KEY|ENV SUPABASE_SERVICE_ROLE_KEY/,
    'the Supabase service-role key must not enter the web build stage',
  );
});
