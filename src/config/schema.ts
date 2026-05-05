import { z } from "zod";

const RetrySchema = z.object({
  attempts: z.number().int().min(1).default(1),
  delayMs: z.number().int().min(0).default(0),
  backoff: z.enum(["fixed", "exponential"]).default("fixed"),
});

const StepSchema = z.object({
  name: z.string().min(1),
  command: z.string().min(1),
  env: z.record(z.string()).optional(),
  condition: z.string().optional(),
  continueOnError: z.boolean().default(false),
  timeout: z.string().optional(),
  retry: RetrySchema.optional(),
  cache: z
    .object({ key: z.string(), ttl: z.string().optional() })
    .optional(),
  concurrentGroup: z.string().optional(),
});

const ConcurrencySchema = z.object({
  maxConcurrent: z.number().int().min(1).default(4),
  failFast: z.boolean().default(false),
});

const PipelineSchema = z.object({
  name: z.string().min(1),
  env: z.record(z.string()).optional(),
  dotenv: z.string().optional(),
  steps: z.array(StepSchema).min(1),
  concurrency: ConcurrencySchema.optional(),
  hooks: z
    .object({
      before: z.string().optional(),
      after: z.string().optional(),
      onFailure: z.string().optional(),
    })
    .optional(),
});

export type PipelineConfig = z.infer<typeof PipelineSchema>;
export type StepConfig = z.infer<typeof StepSchema>;
export type ConcurrencyConfig = z.infer<typeof ConcurrencySchema>;

export function parsePipelineConfig(raw: unknown): PipelineConfig {
  return PipelineSchema.parse(raw);
}

export function validatePipelineConfig(
  raw: unknown
): { success: true; data: PipelineConfig } | { success: false; error: string } {
  const result = PipelineSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.message };
}
