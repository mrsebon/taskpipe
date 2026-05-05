import { describe, it, expect, vi } from "vitest";
import {
  buildConcurrencyOptions,
  runConcurrentSteps,
  type ConcurrentStep,
} from "./concurrency";

function makeStep(
  name: string,
  success: boolean,
  delayMs = 0
): ConcurrentStep {
  return {
    name,
    run: async () => {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      return { name, success, durationMs: delayMs };
    },
  };
}

describe("buildConcurrencyOptions", () => {
  it("uses defaults when no options provided", () => {
    const opts = buildConcurrencyOptions();
    expect(opts.maxConcurrent).toBe(4);
    expect(opts.failFast).toBe(false);
  });

  it("clamps maxConcurrent to at least 1", () => {
    const opts = buildConcurrencyOptions({ maxConcurrent: 0 });
    expect(opts.maxConcurrent).toBe(1);
  });

  it("respects provided values", () => {
    const opts = buildConcurrencyOptions({ maxConcurrent: 8, failFast: true });
    expect(opts.maxConcurrent).toBe(8);
    expect(opts.failFast).toBe(true);
  });
});

describe("runConcurrentSteps", () => {
  it("runs all steps and returns results", async () => {
    const steps = [makeStep("a", true), makeStep("b", true), makeStep("c", true)];
    const results = await runConcurrentSteps(steps, buildConcurrencyOptions());
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it("collects failures without stopping when failFast is false", async () => {
    const steps = [makeStep("a", false), makeStep("b", true), makeStep("c", false)];
    const results = await runConcurrentSteps(steps, buildConcurrencyOptions({ failFast: false }));
    expect(results.filter((r) => !r.success)).toHaveLength(2);
  });

  it("marks remaining steps as skipped when failFast is true", async () => {
    const steps = [
      makeStep("fail", false, 10),
      makeStep("slow1", true, 100),
      makeStep("slow2", true, 100),
    ];
    const results = await runConcurrentSteps(
      steps,
      buildConcurrencyOptions({ maxConcurrent: 1, failFast: true })
    );
    const skipped = results.filter((r) => r.error === "Skipped due to failFast");
    expect(skipped.length).toBeGreaterThan(0);
  });

  it("handles thrown errors gracefully", async () => {
    const throwing: ConcurrentStep = {
      name: "boom",
      run: async () => { throw new Error("unexpected"); },
    };
    const results = await runConcurrentSteps([throwing], buildConcurrencyOptions());
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe("unexpected");
  });
});
