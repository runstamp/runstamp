/**
 * composePhases unit tests — covers ordering, matching, and the
 * "no phase matched" error path.
 */
import { describe, it, expect, vi } from "vitest";
import { composePhases, type Phase, type PhaseInput, type PhaseOutput } from "../src/phase.js";
import { PdfError, isPdfError } from "../src/errors.js";

const baseInput: PhaseInput = {
  document: {} as never,
  options: undefined,
  automaticFallbackFont: undefined,
};

const stubOutput: PhaseOutput = {
  pages: [],
  meta: {},
};

function fakePhase(name: string, matches: boolean | ((i: PhaseInput) => boolean), output = stubOutput): Phase {
  const matchFn = typeof matches === "function" ? matches : () => matches;
  return {
    name,
    matches: matchFn,
    run: vi.fn(async () => output),
  };
}

describe("composePhases", () => {
  it("runs the first matching phase", async () => {
    const phases = [
      fakePhase("a", false),
      fakePhase("b", true),
      fakePhase("c", true),
    ];
    await composePhases(baseInput, phases);
    expect(phases[0].run).not.toHaveBeenCalled();
    expect(phases[1].run).toHaveBeenCalledTimes(1);
    expect(phases[2].run).not.toHaveBeenCalled();
  });

  it("returns the matching phase's output", async () => {
    const customOutput: PhaseOutput = { pages: [], meta: { title: "t" } };
    const phase = fakePhase("only", true, customOutput);
    const result = await composePhases(baseInput, [phase]);
    expect(result).toBe(customOutput);
  });

  it("throws PdfError when no phase matches", async () => {
    const phases = [
      fakePhase("a", false),
      fakePhase("b", false),
    ];
    let thrown: unknown;
    try {
      await composePhases(baseInput, phases);
    } catch (e) {
      thrown = e;
    }
    expect(isPdfError(thrown)).toBe(true);
    const err = thrown as PdfError;
    expect(err.code).toBe("SCHEMA_REJECTED");
    expect(err.details?.phasesTried).toEqual(["a", "b"]);
  });

  it("predicate sees the same input the runner receives", async () => {
    const seen: PhaseInput[] = [];
    const phase: Phase = {
      name: "spy",
      matches(input) { seen.push(input); return true; },
      async run() { return stubOutput; },
    };
    await composePhases(baseInput, [phase]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(baseInput);
  });
});
