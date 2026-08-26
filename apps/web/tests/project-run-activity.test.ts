import { describe, expect, it } from 'vitest';
import type { ChatRunStatusResponse } from '@open-design/contracts';

import { activeRunCountsByProject } from '../src/state/project-run-activity';

function run(
  projectId: string | null,
  status: ChatRunStatusResponse['status'],
): ChatRunStatusResponse {
  return {
    id: `${projectId ?? 'none'}-${status}`,
    projectId,
    conversationId: null,
    assistantMessageId: null,
    agentId: 'codex',
    status,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('activeRunCountsByProject', () => {
  it('counts queued and running work independently per project', () => {
    expect(activeRunCountsByProject([
      run('project-a', 'queued'),
      run('project-a', 'running'),
      run('project-b', 'running'),
      run('project-a', 'succeeded'),
      run(null, 'running'),
    ])).toEqual({
      'project-a': 2,
      'project-b': 1,
    });
  });
});

