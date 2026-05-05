import { Command } from "commander";
import { filterSteps, FilterOptions } from "../runner/filter";

/**
 * Registers the `--filter` family of CLI options onto a command.
 * Call this from registerRunCommand to attach step-filtering flags.
 */
export function addFilterOptions(cmd: Command): Command {
  return cmd
    .option(
      "--tags <tags>",
      "Comma-separated list of tags; only matching steps run",
      (v) => v.split(",").map((t) => t.trim())
    )
    .option(
      "--steps <steps>",
      "Comma-separated step names or indices to run",
      (v) => v.split(",").map((s) => s.trim())
    )
    .option("--from <step>", "Start execution from this step (name or index)")
    .option(
      "--only <steps>",
      "Run exclusively these steps (name or index), ignoring tags/steps",
      (v) => v.split(",").map((s) => s.trim())
    );
}

/**
 * Extracts FilterOptions from parsed Commander options.
 */
export function resolveFilterOptions(opts: Record<string, unknown>): FilterOptions {
  return {
    tags: opts["tags"] as string[] | undefined,
    steps: opts["steps"] as string[] | undefined,
    from: opts["from"] as string | undefined,
    only: opts["only"] as string[] | undefined,
  };
}

/**
 * Convenience wrapper: parse options and apply filterSteps in one call.
 */
export function applyCliFilter<T extends { name: string; tags?: string[] }>(
  steps: T[],
  opts: Record<string, unknown>
): T[] {
  const filterOptions = resolveFilterOptions(opts);
  const hasFilter = Object.values(filterOptions).some(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  );
  if (!hasFilter) return steps;
  return filterSteps(steps, filterOptions);
}
