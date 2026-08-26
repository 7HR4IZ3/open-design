import type { ChatRunStatusResponse } from '@open-design/contracts';

const ACTIVE_RUN_STATUSES = new Set<ChatRunStatusResponse['status']>([
  'queued',
  'running',
]);

/**
 * Counts the daemon runs that are still executing, grouped by project.
 *
 * This is deliberately a pure projection so every UI surface can agree on
 * what "active" means without depending on whichever ProjectView happens to
 * be mounted. That distinction matters when a project is switched away from
 * while its agent process continues in the daemon.
 */
export function activeRunCountsByProject(
  runs: readonly ChatRunStatusResponse[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const run of runs) {
    if (
      typeof run.projectId !== 'string'
      || run.projectId.length === 0
      || !ACTIVE_RUN_STATUSES.has(run.status)
    ) {
      continue;
    }
    counts[run.projectId] = (counts[run.projectId] ?? 0) + 1;
  }
  return counts;
}

