import { existsSync } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Phase2FontFixture {
  family: string;
  fileName: string;
  key: "arabic" | "cjk" | "devanagari" | "emoji" | "hebrew" | "inter" | "lato" | "sinhala" | "symbols" | "thai";
  url: string;
}

export const PHASE2_FONT_FIXTURES: readonly Phase2FontFixture[] = [
  {
    key: "inter",
    family: "Inter",
    fileName: "Inter-Variable.ttf",
    url: "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf",
  },
  {
    key: "cjk",
    family: "Noto Sans CJK JP",
    fileName: "NotoSansCJKjp-VF.ttf",
    url: "https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/TTF/NotoSansCJKjp-VF.ttf",
  },
  {
    key: "lato",
    family: "Lato",
    fileName: "Lato-Regular.ttf",
    url: "https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf",
  },
  {
    key: "arabic",
    family: "Noto Sans Arabic",
    fileName: "NotoSansArabic-Regular.ttf",
    url: "https://github.com/notofonts/noto-fonts/raw/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf",
  },
  {
    key: "devanagari",
    family: "Noto Sans Devanagari",
    fileName: "NotoSansDevanagari-Regular.ttf",
    url: "https://github.com/notofonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
  },
  {
    key: "hebrew",
    family: "Noto Sans Hebrew",
    fileName: "NotoSansHebrew-Regular.ttf",
    url: "https://github.com/notofonts/noto-fonts/raw/main/hinted/ttf/NotoSansHebrew/NotoSansHebrew-Regular.ttf",
  },
  {
    key: "sinhala",
    family: "Noto Sans Sinhala",
    fileName: "NotoSansSinhala-Regular.ttf",
    url: "https://github.com/notofonts/noto-fonts/raw/main/hinted/ttf/NotoSansSinhala/NotoSansSinhala-Regular.ttf",
  },
  {
    key: "symbols",
    family: "Noto Sans Symbols 2",
    fileName: "NotoSansSymbols2-Regular.ttf",
    url: "https://github.com/notofonts/noto-fonts/raw/main/hinted/ttf/NotoSansSymbols2/NotoSansSymbols2-Regular.ttf",
  },
  {
    key: "thai",
    family: "Noto Sans Thai",
    fileName: "NotoSansThai-Regular.ttf",
    url: "https://github.com/notofonts/noto-fonts/raw/main/hinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf",
  },
  {
    key: "emoji",
    family: "Noto Color Emoji",
    fileName: "NotoColorEmoji.ttf",
    url: "https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf",
  },
] as const;

function packageRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

export function phase2FontsDir(): string {
  return join(packageRoot(), "fixtures", "fonts");
}

export function phase2FontPath(key: Phase2FontFixture["key"]): string {
  const fixture = PHASE2_FONT_FIXTURES.find((entry) => entry.key === key);
  if (!fixture) {
    throw new Error(`Unknown Phase 2 font fixture "${key}"`);
  }
  return join(phase2FontsDir(), fixture.fileName);
}

async function hasUsableFile(path: string): Promise<boolean> {
  if (!existsSync(path)) {
    return false;
  }

  const info = await stat(path);
  return info.size > 0;
}

async function downloadFixture(url: string, destination: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const tempPath = `${destination}.tmp`;
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(tempPath, Buffer.from(arrayBuffer));
  await rename(tempPath, destination);
}

export async function ensurePhase2FontFixtures(): Promise<Record<Phase2FontFixture["key"], string>> {
  const fontsDir = phase2FontsDir();
  await mkdir(fontsDir, { recursive: true });

  const resolved = {} as Record<Phase2FontFixture["key"], string>;

  for (const fixture of PHASE2_FONT_FIXTURES) {
    const path = join(fontsDir, fixture.fileName);
    if (!(await hasUsableFile(path))) {
      await rm(`${path}.tmp`, { force: true });
      await downloadFixture(fixture.url, path);
    }
    resolved[fixture.key] = path;
  }

  return resolved;
}

async function main(): Promise<void> {
  const paths = await ensurePhase2FontFixtures();
  for (const fixture of PHASE2_FONT_FIXTURES) {
    console.log(`${fixture.key}=${paths[fixture.key]}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
