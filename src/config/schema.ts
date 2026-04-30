import { z } from 'zod';

const RetrySchema = z.object({
  attempts: z.number().int().min(1).default(1),
  delay: z.number().min(0).default(0),
  backoff: z.enum(['fixed', 'exponential']).default('fixed'),
});

const StepSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  condition: z.string().optional(),
  continueOnError: z.boolean().default(false),
  timeout: z.string().optional(),
  retry: RetrySchema.optional(),
  env: z.record(z.string()).optional(),
});

const PipelineSchema = z.object({
  name: z.string().min(1),
  env: z.record(z.string()).optional(),
  envFile: z.string().optional(),
  inheritEnv: z.boolean().default(true),
  steps: z.array(StepSchema).min(1),
});

export type RetryConfig = z.infer<typeof RetrySchema>;
export type StepConfig = z.infer<typeof StepSchema>;
export type PipelineConfig = z.infer<typeof PipelineSchema>;

/**
 * Parses and validates raw pipeline config, returning typed config or throwing.
 */
export function parsePipelineConfig(raw: unknown): PipelineConfig {
  return PipelineSchema.parse(raw);
}

/**
 * Safe validation — returns success/error without throwing.
 */
export function validatePipelineConfig(
  raw: unknown
): { success: true; data: PipelineConfig } | { success: false; error: string } {
  const result = PipelineSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { success: false, error: messages.join('; ') };
}
