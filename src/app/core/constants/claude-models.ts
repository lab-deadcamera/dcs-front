import { ClaudeModelOption } from '../interfaces';

/** Available Claude text models for the Shot Builder. */
export const CLAUDE_MODELS: ClaudeModelOption[] = [
  // {
  //   id: 'claude_haiku',
  //   name: 'claude-haiku-4-5',
  //   description: 'Fast & affordable — good for quick iterations',
  // },
  // {
  //   id: 'claude_sonnet',
  //   name: 'claude-sonnet-4-6',
  //   description: 'Best balance of quality and speed — recommended default',
  // },
  {
    id: 'claude_opus',
    name: 'claude-opus-4-8',
    description: 'Most capable model — best for complex shot breakdowns and detailed prompts',
  },

  {
    id: 'claude_fable',
    name: 'claude-fable-5',
    description: 'Latest generation — creative and expressive',
  },
];
