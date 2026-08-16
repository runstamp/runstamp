import { describe, expect, it } from "vitest";
import {
  ooxmlAngle,
  ooxmlBool,
  ooxmlInt,
  ooxmlPercentage100k,
  ooxmlRatio,
  ooxmlTextFontSize,
  ooxmlUInt,
} from "../src/ooxml/xmlValues.js";

describe("OOXML typed value helpers", () => {
  it("serializes integer-only attributes without decimals", () => {
    expect(ooxmlInt(12.49)).toBe("12");
    expect(ooxmlInt(12.5)).toBe("13");
    expect(ooxmlUInt(-4)).toBe("0");
    expect(ooxmlTextFontSize(9.25)).toBe("694");
    expect(ooxmlAngle(12.25)).toBe("735000");
  });

  it("serializes booleans, ratios, and 100k percentages in OOXML form", () => {
    expect(ooxmlBool(true)).toBe("1");
    expect(ooxmlBool(false)).toBe("0");
    expect(ooxmlRatio(0.333333)).toBe("0.3333");
    expect(ooxmlRatio(1.25)).toBe("1");
    expect(ooxmlPercentage100k(0.42)).toBe("42000");
  });
});
