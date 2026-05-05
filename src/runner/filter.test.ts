import { describe, it, expect } from "vitest";
import {
  stepMatchesFilter,
  applyFromCursor,
  filterSteps,
  FilterableStep,
} from "./filter";

const steps: FilterableStep[] = [
  { name: "install", tags: ["setup"] },
  { name: "lint", tags: ["quality"] },
  { name: "test", tags: ["quality", "ci"] },
  { name: "build", tags: ["ci"] },
  { name: "deploy", tags: ["deploy"] },
];

describe("stepMatchesFilter", () => {
  it("returns true with empty options", () => {
    expect(stepMatchesFilter(steps[0], 0, {})).toBe(true);
  });

  it("filters by tag", () => {
    expect(stepMatchesFilter(steps[2], 2, { tags: ["ci"] })).toBe(true);
    expect(stepMatchesFilter(steps[0], 0, { tags: ["ci"] })).toBe(false);
  });

  it("filters by step name", () => {
    expect(stepMatchesFilter(steps[1], 1, { steps: ["lint"] })).toBe(true);
    expect(stepMatchesFilter(steps[2], 2, { steps: ["lint"] })).toBe(false);
  });

  it("filters by step index", () => {
    expect(stepMatchesFilter(steps[3], 3, { steps: ["3"] })).toBe(true);
    expect(stepMatchesFilter(steps[0], 0, { steps: ["3"] })).toBe(false);
  });

  it("only overrides other filters", () => {
    expect(
      stepMatchesFilter(steps[4], 4, { only: ["deploy"], tags: ["setup"] })
    ).toBe(true);
    expect(
      stepMatchesFilter(steps[0], 0, { only: ["deploy"], tags: ["setup"] })
    ).toBe(false);
  });
});

describe("applyFromCursor", () => {
  it("returns all steps when from is undefined", () => {
    expect(applyFromCursor(steps, undefined)).toHaveLength(5);
  });

  it("slices from named step", () => {
    const result = applyFromCursor(steps, "test");
    expect(result.map((s) => s.name)).toEqual(["test", "build", "deploy"]);
  });

  it("slices from index", () => {
    const result = applyFromCursor(steps, "3");
    expect(result.map((s) => s.name)).toEqual(["build", "deploy"]);
  });

  it("throws when step not found", () => {
    expect(() => applyFromCursor(steps, "missing")).toThrow(
      '--from step not found: "missing"'
    );
  });
});

describe("filterSteps", () => {
  it("combines from + tag filter", () => {
    const result = filterSteps(steps, { from: "lint", tags: ["ci"] });
    expect(result.map((s) => s.name)).toEqual(["test", "build"]);
  });

  it("returns all steps with no options", () => {
    expect(filterSteps(steps, {})).toHaveLength(5);
  });

  it("supports only with from", () => {
    const result = filterSteps(steps, { from: "lint", only: ["build"] });
    expect(result.map((s) => s.name)).toEqual(["build"]);
  });
});
