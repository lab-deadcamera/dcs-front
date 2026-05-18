/**
 * Text-generation contract (LLM completions).
 *
 * Symmetric with the other generator interfaces (image / video / audio):
 * `generate(request)` returns a task envelope; `status(taskId)` returns the
 * same envelope shape — only `status` and `text` change as the task
 * progresses.
 */

export type TextGeneratorStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface TextGenerateRequest {
  /** Backend model id, e.g. "claude-sonnet-4-6". */
  model: string;
  prompt: string;
  systemPrompt?: string;
  /** Sampling controls — falls back to model defaults when omitted. */
  maxTokens?: number;
  temperature?: number;
  /** Optional seed for reproducibility. */
  seed?: number;
}

export interface TextGenerateResponse {
  taskId: string;
  status: TextGeneratorStatus;
  /** Populated once `status === 'succeeded'`. */
  text?: string;
  /** Populated once `status === 'failed'`. */
  error?: string;
}
