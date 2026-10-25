import { describe, expect, it } from 'vitest';
import { processAITaskQueue, type AITask } from './ai-task-queue';

describe('processAITaskQueue', () => {
  it('processes successful tasks', async () => {
    const tasks: AITask<{ id: string }>[] = [
      { id: '1', payload: { id: '1' }, attempts: 0, maxAttempts: 2, status: 'pending' },
    ];

    const out = await processAITaskQueue(tasks, {
      handler: async () => {},
    });

    expect(out[0]?.status).toBe('done');
  });

  it('retries and ends in failed when maxAttempts is reached', async () => {
    const tasks: AITask<{ id: string }>[] = [
      { id: '2', payload: { id: '2' }, attempts: 0, maxAttempts: 1, status: 'pending' },
    ];

    const out = await processAITaskQueue(tasks, {
      retryDelayMs: 1,
      handler: async () => {
        throw new Error('boom');
      },
    });

    expect(out[0]?.status).toBe('failed');
    expect(out[0]?.lastError).toContain('boom');
  });
});
