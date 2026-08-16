# Pinned font assets

These are the unmodified, static TrueType binaries admitted by the Stage 0
font registry. `manifest.json` is authoritative for hashes, byte lengths,
internal names, cmap coverage, embedding flags, embedded license metadata,
source archive members, and requested-family roles. Assets may not be updated
or added without updating the manifest and passing `node ga/check-font-assets.mjs`.

Carlito and Gelasio do not publish GitHub releases or tags, so their sources
are pinned to full commits in their canonical repositories. Liberation Fonts
and Source Sans 3 are pinned to release tags and the SHA-256 of the downloaded
release archive is recorded in every corresponding manifest entry. Source Sans
3's upstream `It` and `BoldIt` filenames are stored locally as `Italic` and
`BoldItalic`; the binary bytes are unchanged.

| Asset | Requested-family role | Pinned source | Revision | License | Notice |
|---|---|---|---|---|---|
| `Carlito-Regular.ttf` | Aptos, Aptos Display, Calibri, Calibri Light | [TTF](https://raw.githubusercontent.com/googlefonts/carlito/3a810cab78ebd6e2e4eed42af9e8453c4f9b850a/fonts/ttf/Carlito-Regular.ttf) | commit `3a810cab78ebd6e2e4eed42af9e8453c4f9b850a` | OFL-1.1 | `LICENSES/Carlito-OFL.txt` |
| `Carlito-Bold.ttf` | Aptos, Aptos Display, Calibri, Calibri Light | [TTF](https://raw.githubusercontent.com/googlefonts/carlito/3a810cab78ebd6e2e4eed42af9e8453c4f9b850a/fonts/ttf/Carlito-Bold.ttf) | commit `3a810cab78ebd6e2e4eed42af9e8453c4f9b850a` | OFL-1.1 | `LICENSES/Carlito-OFL.txt` |
| `Carlito-Italic.ttf` | Aptos, Aptos Display, Calibri, Calibri Light | [TTF](https://raw.githubusercontent.com/googlefonts/carlito/3a810cab78ebd6e2e4eed42af9e8453c4f9b850a/fonts/ttf/Carlito-Italic.ttf) | commit `3a810cab78ebd6e2e4eed42af9e8453c4f9b850a` | OFL-1.1 | `LICENSES/Carlito-OFL.txt` |
| `Carlito-BoldItalic.ttf` | Aptos, Aptos Display, Calibri, Calibri Light | [TTF](https://raw.githubusercontent.com/googlefonts/carlito/3a810cab78ebd6e2e4eed42af9e8453c4f9b850a/fonts/ttf/Carlito-BoldItalic.ttf) | commit `3a810cab78ebd6e2e4eed42af9e8453c4f9b850a` | OFL-1.1 | `LICENSES/Carlito-OFL.txt` |
| `LiberationSans-Regular.ttf` | Arial | [2.1.5 TTF archive](https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz) | tag `2.1.5` | OFL-1.1 | `LICENSES/LiberationSans-OFL.txt` |
| `LiberationSans-Bold.ttf` | Arial | [2.1.5 TTF archive](https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz) | tag `2.1.5` | OFL-1.1 | `LICENSES/LiberationSans-OFL.txt` |
| `LiberationSans-Italic.ttf` | Arial | [2.1.5 TTF archive](https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz) | tag `2.1.5` | OFL-1.1 | `LICENSES/LiberationSans-OFL.txt` |
| `LiberationSans-BoldItalic.ttf` | Arial | [2.1.5 TTF archive](https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz) | tag `2.1.5` | OFL-1.1 | `LICENSES/LiberationSans-OFL.txt` |
| `LiberationMono-Regular.ttf` | Courier New | [2.1.5 TTF archive](https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz) | tag `2.1.5` | OFL-1.1 | `LICENSES/LiberationMono-OFL.txt` |
| `LiberationMono-Bold.ttf` | Courier New | [2.1.5 TTF archive](https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz) | tag `2.1.5` | OFL-1.1 | `LICENSES/LiberationMono-OFL.txt` |
| `LiberationMono-Italic.ttf` | Courier New | [2.1.5 TTF archive](https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz) | tag `2.1.5` | OFL-1.1 | `LICENSES/LiberationMono-OFL.txt` |
| `LiberationMono-BoldItalic.ttf` | Courier New | [2.1.5 TTF archive](https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz) | tag `2.1.5` | OFL-1.1 | `LICENSES/LiberationMono-OFL.txt` |
| `Gelasio-Regular.ttf` | Georgia | [TTF](https://raw.githubusercontent.com/SorkinType/Gelasio/7ab20e7e5c42791e603b9ee3201a0b49849cfdb2/fonts/ttf/Gelasio-Regular.ttf) | commit `7ab20e7e5c42791e603b9ee3201a0b49849cfdb2` | OFL-1.1 | `LICENSES/Gelasio-OFL.txt` |
| `Gelasio-Bold.ttf` | Georgia | [TTF](https://raw.githubusercontent.com/SorkinType/Gelasio/7ab20e7e5c42791e603b9ee3201a0b49849cfdb2/fonts/ttf/Gelasio-Bold.ttf) | commit `7ab20e7e5c42791e603b9ee3201a0b49849cfdb2` | OFL-1.1 | `LICENSES/Gelasio-OFL.txt` |
| `Gelasio-Italic.ttf` | Georgia | [TTF](https://raw.githubusercontent.com/SorkinType/Gelasio/7ab20e7e5c42791e603b9ee3201a0b49849cfdb2/fonts/ttf/Gelasio-Italic.ttf) | commit `7ab20e7e5c42791e603b9ee3201a0b49849cfdb2` | OFL-1.1 | `LICENSES/Gelasio-OFL.txt` |
| `Gelasio-BoldItalic.ttf` | Georgia | [TTF](https://raw.githubusercontent.com/SorkinType/Gelasio/7ab20e7e5c42791e603b9ee3201a0b49849cfdb2/fonts/ttf/Gelasio-BoldItalic.ttf) | commit `7ab20e7e5c42791e603b9ee3201a0b49849cfdb2` | OFL-1.1 | `LICENSES/Gelasio-OFL.txt` |
| `SourceSans3-Regular.ttf` | Trebuchet MS | [3.052R TTF archive](https://github.com/adobe-fonts/source-sans/releases/download/3.052R/TTF-source-sans-3.052R.zip) | tag `3.052R` | OFL-1.1 | `LICENSES/SourceSans3-OFL.txt` |
| `SourceSans3-Bold.ttf` | Trebuchet MS | [3.052R TTF archive](https://github.com/adobe-fonts/source-sans/releases/download/3.052R/TTF-source-sans-3.052R.zip) | tag `3.052R` | OFL-1.1 | `LICENSES/SourceSans3-OFL.txt` |
| `SourceSans3-Italic.ttf` | Trebuchet MS | [3.052R TTF archive](https://github.com/adobe-fonts/source-sans/releases/download/3.052R/TTF-source-sans-3.052R.zip) | tag `3.052R` | OFL-1.1 | `LICENSES/SourceSans3-OFL.txt` |
| `SourceSans3-BoldItalic.ttf` | Trebuchet MS | [3.052R TTF archive](https://github.com/adobe-fonts/source-sans/releases/download/3.052R/TTF-source-sans-3.052R.zip) | tag `3.052R` | OFL-1.1 | `LICENSES/SourceSans3-OFL.txt` |

The manifest schema uses per-face roles and an open-ended script coverage map,
so future script-specific Noto assets can be admitted without changing the
schema. No Noto or proprietary Microsoft font binaries are included here.
