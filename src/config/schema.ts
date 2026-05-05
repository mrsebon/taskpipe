import { z } from 'zod';

const HookSchema = z.object({
  command: z.string().min(1),
  phase: z.enum(['before', 'after', 'onError']),
  continueOnError: z.boolean().optional().default(false),
});

const StepSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  retries: z.number().int().min(0).optional().default(0),
  timeout: z.string().optional(),
  condition: z.string().optional(),
  env: z.record(z.string()).optional(),
  continueOnError: z.boolean().optional().default(false),
  hooks: z.array(HookSchema).optional().default([]),
});

const PipelineSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional().default('1'),
  env: z.record(z.string()).optional(),
  hooks: z.array(HookSchema).optional().default([]),
  steps: z.array(StepSchema).min(1),
});

export type Hook = z.infer<typeof HookSchema>;
export type Step = z.infer<typeof StepSchema>;
export type PipelineConfig = z.infer<typeof PipelineSchema>;

export function parsePipelineConfig(raw: unknown): PipelineConfig {
  return PipelineSchema.parse(raw);
}

export function validatePipelineConfig(raw: unknown): {
  success: boolean;
  errors: string[];
  data?: PipelineConfig;
} {
  const result = PipelineSchema.safeParse(raw);
  if (result.success) {
    return { success: true, errors: [], data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );
  return { success: false, errors };
}
