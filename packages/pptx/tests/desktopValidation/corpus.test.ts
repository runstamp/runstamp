import { describe, it, expect } from "vitest";
import { getZipPaths } from "../helpers/xmlTestUtils.js";
import {
  buildCorpusFixture,
  loadCorpusManifest,
} from "./helpers/corpus.js";
import { validateStructure } from "../launchMatrix/helpers/structuralValidator.js";

describe("desktop validation corpus", () => {
  it("includes the required representative fixtures", () => {
    const manifest = loadCorpusManifest();
    expect(manifest.fixtures.map((fixture) => fixture.id)).toEqual(expect.arrayContaining([
      "classic-chart",
      "template-mutation",
      "long-text-paginated",
      "chart-heavy",
      "chartex-treemap",
      "basic-text-shape",
      "notes-comments-media",
      "strategy-studio",
      "forced-invalid-rel-target",
      "chart-media-coexistence",
      "declarative-quickstart",
    ]));
  });

  it("contains ten positive desktop fixtures and one intentional negative control", () => {
    const desktopFixtures = loadCorpusManifest().fixtures.filter((fixture) => (
      fixture.validationModes.includes("desktop_open")
    ));
    expect(desktopFixtures.filter((fixture) => fixture.acceptance.expectDesktopOpenPass)).toHaveLength(10);
    expect(desktopFixtures.filter((fixture) => !fixture.acceptance.expectDesktopOpenPass)).toEqual([
      expect.objectContaining({ id: "forced-invalid-rel-target" }),
    ]);
  });

  it("builds the paginated corpus fixture to the expected slide count", async () => {
    const built = await buildCorpusFixture("long-text-paginated");
    expect(built.slideCount).toBe(12);

    const paths = await getZipPaths(built.buffer);
    expect(paths).toContain("ppt/slides/slide1.xml");
    expect(paths).toContain("ppt/slides/slide2.xml");
  });

  it("builds the template mutation fixture with template-backed slides", async () => {
    const built = await buildCorpusFixture("template-mutation");
    expect(built.slideCount).toBe(2);
    const paths = await getZipPaths(built.buffer);
    expect(paths).toContain("ppt/slides/slide1.xml");
    expect(paths).toContain("ppt/slides/slide2.xml");
  });

  it("builds the Strategy Studio fixture to the expected slide count", async () => {
    const built = await buildCorpusFixture("strategy-studio");
    expect(built.slideCount).toBe(25);
    const paths = await getZipPaths(built.buffer);
    expect(paths).toContain("ppt/slides/slide25.xml");
  });

  it.each(["chart-media-coexistence", "declarative-quickstart"])(
    "builds %s with structurally valid chart relationships",
    async (fixtureId) => {
      const built = await buildCorpusFixture(fixtureId);
      expect(built.slideCount).toBe(fixtureId === "declarative-quickstart" ? 3 : 1);
      const paths = await getZipPaths(built.buffer);
      expect(paths).toContain("ppt/charts/chart1.xml");
      expect(paths).toContain("ppt/embeddings/chart1.xlsx");
      if (fixtureId === "declarative-quickstart") expect(paths).toContain("ppt/slides/slide3.xml");
      expect((await validateStructure(built.buffer)).passed).toBe(true);
    },
  );
});
