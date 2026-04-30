import { z } from 'zod';

export const RetrySchema = z.object({
  attempts: z.number().int().min(1).max(10).default(1),
  delay: z.number().int().min(0).default(1000),
});

export const StepSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  condition: z.string().optional(),
  retry: RetrySchema.optional(),
  continueOnError: z.boolean().default(false),
  env: z.record(z.string()).optional(),
});

export const PipelineSchema = z.object({
  version: z.literal('1').default('1'),
  name: z.string().min(1),
  steps: z.array(StepSchema).min(1),
  env: z.record(z.string()).optional(),
});

export type Retry = z.infer<typeof RetrySchema>;
export type Step = z.infer<typeof StepSchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;

export function parsePipelineConfig(raw: unknown): Pipeline {
  const result = PipelineSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => {
        const path = i.path.length > 0 ? i.path.join('.') : '<root>';
        return `  - ${path}: ${i.message}`;
      })
      .join('\n');
    throw new Error(`Invalid pipeline configuration:\n${issues}`);
  }
  return result.data;
}

/**
 * Validates a pipeline config without throwing, returning either the parsed
 * pipeline or a list of human-readable error strings.
 */
export function validatePipelineConfig(
  raw: unknown,
): { success: true; data: Pipeline } | { success: false; errors: string[] } {
  const result = PipelineSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map((i) => {
      const path = i.path.length > 0 ? i.path.join('.') : '<root>';
      return `${path}: ${i.message}`;
    });
    return { success: false, errors };
  }
  return { success: true, data: result.data };
}
