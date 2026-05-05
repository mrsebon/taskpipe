/**
 * Step filtering utilities — allows running a subset of pipeline steps
 * based on tag matching or explicit step name/index selection.
 */

export interface FilterOptions {
  tags?: string[];
  steps?: string[];
  from?: string;
  only?: string[];
}

export interface FilterableStep {
  name: string;
  tags?: string[];
}

/**
 * Returns true if the step matches the given filter options.
 */
export function stepMatchesFilter(
  step: FilterableStep,
  index: number,
  options: FilterOptions
): boolean {
  const { tags, steps, only } = options;

  if (only && only.length > 0) {
    return only.includes(step.name) || only.includes(String(index));
  }

  if (steps && steps.length > 0) {
    if (!steps.includes(step.name) && !steps.includes(String(index))) {
      return false;
    }
  }

  if (tags && tags.length > 0) {
    const stepTags = step.tags ?? [];
    const hasMatch = tags.some((t) => stepTags.includes(t));
    if (!hasMatch) return false;
  }

  return true;
}

/**
 * Applies a "from" cursor: returns a new list starting at the named step.
 */
export function applyFromCursor<T extends FilterableStep>(
  steps: T[],
  from?: string
): T[] {
  if (!from) return steps;
  const idx = steps.findIndex(
    (s, i) => s.name === from || String(i) === from
  );
  if (idx === -1) {
    throw new Error(`--from step not found: "${from}"`);
  }
  return steps.slice(idx);
}

/**
 * Combines applyFromCursor + stepMatchesFilter to produce the final step list.
 */
export function filterSteps<T extends FilterableStep>(
  steps: T[],
  options: FilterOptions
): T[] {
  const afterCursor = applyFromCursor(steps, options.from);
  return afterCursor.filter((step, index) =>
    stepMatchesFilter(step, index, options)
  );
}
