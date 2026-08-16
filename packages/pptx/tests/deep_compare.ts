// Deep comparison: Our PPTX vs python-pptx reference
import JSZip from "jszip";
import { PaperEngine } from "../src/engine.js";
import type { PaperDocument } from "../src/types/ast.js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

async function main() {
  // Generate our PPTX
  const doc: PaperDocument = {
    type: "Document",
    meta: {},
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Chart",
            style: { position: "absolute", top: 50, left: 50, width: 400, height: 300 },
            chartData: {
              chartType: "bar",
              categories: ["Q1", "Q2", "Q3"],
              series: [{ name: "Revenue", values: [100, 200, 300] }],
            },
          },
        ],
      },
    ],
  };

  const ourBuf = await PaperEngine.render(doc);
  const refBuf = readFileSync("/tmp/reference_charts.pptx");

  const ourZip = await JSZip.loadAsync(ourBuf);
  const refZip = await JSZip.loadAsync(refBuf);

  const outDir = ".tmp-deep-compare";
  mkdirSync(outDir, { recursive: true });

  // List all files in both
  const ourFiles: string[] = [];
  const refFiles: string[] = [];
  ourZip.forEach((p) => { if (!ourZip.files[p].dir) ourFiles.push(p); });
  refZip.forEach((p) => { if (!refZip.files[p].dir) refFiles.push(p); });

  console.log("=== FILES IN OUR PPTX ===");
  ourFiles.sort().forEach(f => console.log(`  ${f}`));
  console.log("\n=== FILES IN REFERENCE PPTX ===");
  refFiles.sort().forEach(f => console.log(`  ${f}`));

  // Files in ours but not reference
  const ourOnly = ourFiles.filter(f => !refFiles.some(r => {
    // Normalize paths: chart1 vs chart1, slide1 vs slide1 etc
    const normalizeP = (p: string) => p.replace(/\d+/g, 'N');
    return normalizeP(f) === normalizeP(r);
  }));
  const refOnly = refFiles.filter(f => !ourFiles.some(o => {
    const normalizeP = (p: string) => p.replace(/\d+/g, 'N');
    return normalizeP(f) === normalizeP(o);
  }));

  console.log("\n=== FILES ONLY IN OURS ===");
  ourOnly.forEach(f => console.log(`  ${f}`));
  console.log("\n=== FILES ONLY IN REFERENCE ===");
  refOnly.forEach(f => console.log(`  ${f}`));

  // Compare key XML files
  const comparisons = [
    { ours: "[Content_Types].xml", ref: "[Content_Types].xml", label: "Content Types" },
    { ours: "ppt/presentation.xml", ref: "ppt/presentation.xml", label: "Presentation" },
    { ours: "ppt/slides/slide1.xml", ref: "ppt/slides/slide1.xml", label: "Slide 1" },
    { ours: "ppt/slides/_rels/slide1.xml.rels", ref: "ppt/slides/_rels/slide1.xml.rels", label: "Slide 1 Rels" },
    { ours: "ppt/charts/chart1.xml", ref: "ppt/charts/chart1.xml", label: "Chart XML" },
    { ours: "ppt/charts/_rels/chart1.xml.rels", ref: "ppt/charts/_rels/chart1.xml.rels", label: "Chart Rels" },
  ];

  for (const { ours, ref, label } of comparisons) {
    const ourFile = ourZip.file(ours);
    const refFile = refZip.file(ref);

    console.log(`\n${"=".repeat(80)}`);
    console.log(`COMPARISON: ${label}`);
    console.log("=".repeat(80));

    if (!ourFile) { console.log("  MISSING in ours!"); continue; }
    if (!refFile) { console.log("  MISSING in reference!"); continue; }

    const ourXml = await ourFile.async("text");
    const refXml = await refFile.async("text");

    writeFileSync(`${outDir}/ours-${label.replace(/ /g, "-").toLowerCase()}.xml`, ourXml);
    writeFileSync(`${outDir}/ref-${label.replace(/ /g, "-").toLowerCase()}.xml`, refXml);

    console.log(`\n--- OURS (${ourXml.length} chars) ---`);
    console.log(ourXml);
    console.log(`\n--- REFERENCE (${refXml.length} chars) ---`);
    console.log(refXml);
  }

  // Deep comparison of chart style and colors
  for (const name of ["ppt/charts/style1.xml", "ppt/charts/colors1.xml"]) {
    const ourFile = ourZip.file(name);
    console.log(`\n${"=".repeat(80)}`);
    console.log(`OUR ${name}:`);
    if (ourFile) {
      const xml = await ourFile.async("text");
      writeFileSync(`${outDir}/ours-${name.replace(/\//g, "-")}.xml`, xml);
      console.log(xml);
    } else {
      console.log("MISSING");
    }
  }

  // Check reference for chart style/colors (python-pptx doesn't generate these)
  for (const name of ["ppt/charts/style1.xml", "ppt/charts/colors1.xml"]) {
    const refFile = refZip.file(name);
    console.log(`\nRef ${name}: ${refFile ? "EXISTS" : "MISSING"}`);
  }

  // Deep Excel comparison
  console.log(`\n${"=".repeat(80)}`);
  console.log("EXCEL EMBEDDING COMPARISON");
  console.log("=".repeat(80));

  const ourXlsx = ourZip.file("ppt/embeddings/chart1.xlsx");
  const refXlsx = refZip.file("ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx") || 
                  refZip.file("ppt/embeddings/chart1.xlsx");
  
  if (!refXlsx) {
    // Find it
    const embeds: string[] = [];
    refZip.forEach(p => { if (p.startsWith("ppt/embeddings/")) embeds.push(p); });
    console.log("Reference embeddings:", embeds);
  }

  if (ourXlsx) {
    const ourXlsxBuf = await ourXlsx.async("nodebuffer");
    const ourXlsxZip = await JSZip.loadAsync(ourXlsxBuf);
    console.log("\nOur Excel files:");
    ourXlsxZip.forEach(p => console.log(`  ${p}`));
    
    // Dump all Excel XML
    for (const [path, file] of Object.entries(ourXlsxZip.files)) {
      if (file.dir) continue;
      if (path.endsWith(".xml") || path.endsWith(".rels")) {
        const content = await file.async("text");
        console.log(`\n--- OUR ${path} ---`);
        console.log(content);
      }
    }
  }

  // Find reference Excel
  const refEmbedPaths: string[] = [];
  refZip.forEach(p => { if (p.startsWith("ppt/embeddings/")) refEmbedPaths.push(p); });
  console.log("\nReference embedding paths:", refEmbedPaths);
  
  if (refEmbedPaths.length > 0) {
    const refXlsxFile = refZip.file(refEmbedPaths[0])!;
    const refXlsxBuf = await refXlsxFile.async("nodebuffer");
    const refXlsxZip = await JSZip.loadAsync(refXlsxBuf);
    console.log("\nReference Excel files:");
    refXlsxZip.forEach(p => console.log(`  ${p}`));
    
    for (const [path, file] of Object.entries(refXlsxZip.files)) {
      if (file.dir) continue;
      if (path.endsWith(".xml") || path.endsWith(".rels")) {
        const content = await file.async("text");
        console.log(`\n--- REF ${path} ---`);
        console.log(content);
      }
    }
  }
  
  // Specifically check the _rels/presentation.xml.rels 
  console.log(`\n${"=".repeat(80)}`);
  console.log("PRESENTATION RELS COMPARISON");
  console.log("=".repeat(80));
  
  const ourPresRels = await ourZip.file("ppt/_rels/presentation.xml.rels")?.async("text");
  const refPresRels = await refZip.file("ppt/_rels/presentation.xml.rels")?.async("text");
  console.log("\n--- OURS ---");
  console.log(ourPresRels);
  console.log("\n--- REF ---");
  console.log(refPresRels);

  // Check _rels/.rels
  console.log(`\n${"=".repeat(80)}`);
  console.log("ROOT RELS COMPARISON");
  console.log("=".repeat(80));
  const ourRootRels = await ourZip.file("_rels/.rels")?.async("text");
  const refRootRels = await refZip.file("_rels/.rels")?.async("text");
  console.log("\n--- OURS ---");
  console.log(ourRootRels);
  console.log("\n--- REF ---");
  console.log(refRootRels);

  // Check theme
  console.log(`\n${"=".repeat(80)}`);
  console.log("THEME CHECK");
  console.log("=".repeat(80));
  const ourTheme = ourZip.file("ppt/theme/theme1.xml");
  const refTheme = refZip.file("ppt/theme/theme1.xml");
  console.log("Our theme exists:", !!ourTheme);
  console.log("Ref theme exists:", !!refTheme);
  if (ourTheme) {
    const t = await ourTheme.async("text");
    console.log("Our theme length:", t.length);
    console.log("Our theme first 500 chars:", t.substring(0, 500));
  }

  // Check slideLayout and slideMaster
  const ourLayout = ourZip.file("ppt/slideLayouts/slideLayout1.xml");
  const ourMaster = ourZip.file("ppt/slideMasters/slideMaster1.xml");
  console.log("\nOur slideLayout1:", !!ourLayout);
  console.log("Our slideMaster1:", !!ourMaster);
  
  const refLayout = refZip.file("ppt/slideLayouts/slideLayout1.xml");
  const refMaster = refZip.file("ppt/slideMasters/slideMaster1.xml");
  console.log("Ref slideLayout1:", !!refLayout);
  console.log("Ref slideMaster1:", !!refMaster);
}

main().catch(console.error);
