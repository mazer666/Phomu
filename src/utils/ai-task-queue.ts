export interface AITask<TPayload> {
  id: string;
  payload: TPayload;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  lastError?: string;
}

export interface QueueProcessOptions<TPayload> {
  concurrency?: number;
  retryDelayMs?: number;
  handler: (payload: TPayload) => Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processAITaskQueue<TPayload>(
  tasks: AITask<TPayload>[],
  options: QueueProcessOptions<TPayload>,
): Promise<AITask<TPayload>[]> {
  const concurrency = options.concurrency ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 1000;

  const queue = [...tasks];
  const updated: AITask<TPayload>[] = [];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) return;

      const processingTask: AITask<TPayload> = { ...task, status: 'processing' };
      try {
        await options.handler(processingTask.payload);
        updated.push({ ...processingTask, status: 'done' });
      } catch (error) {
        const attempts = processingTask.attempts + 1;
        const message = error instanceof Error ? error.message : String(error);

        if (attempts < processingTask.maxAttempts) {
          await sleep(retryDelayMs * attempts);
          queue.push({
            ...processingTask,
            attempts,
            status: 'pending',
            lastError: message,
          });
        } else {
          updated.push({
            ...processingTask,
            attempts,
            status: 'failed',
            lastError: message,
          });
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return updated;
}
