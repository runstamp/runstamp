import type { PaperDocument } from "../../src/types/ast.js";
import { textVectors } from "./text.js";
import { layoutVectors } from "./layout.js";
import { tableVectors } from "./table.js";
import { chartVectors } from "./chart.js";
import { groupVectors } from "./group.js";
import { imageVectors } from "./image.js";
import { compositeVectors } from "./composite.js";
import { edgeVectors } from "./edge.js";
import { effectsVectors } from "./effects.js";
import { typographyVectors } from "./typography.js";
import { advancedChartVectors } from "./advanced-chart.js";
import { styledTableVectors } from "./styled-table.js";
import { connectorVectors } from "./connectors.js";
import { backgroundVectors } from "./backgrounds.js";
import { transformVectors } from "./transforms.js";
import { strategyDeckVectors } from "./strategy-deck.js";
import { pitchDeckVectors } from "./pitch-deck.js";
import { qbrDeckVectors } from "./qbr-deck.js";

export const allVectors: Record<string, PaperDocument> = {
  ...textVectors,
  ...layoutVectors,
  ...tableVectors,
  ...chartVectors,
  ...groupVectors,
  ...imageVectors,
  ...compositeVectors,
  ...edgeVectors,
  ...effectsVectors,
  ...typographyVectors,
  ...advancedChartVectors,
  ...styledTableVectors,
  ...connectorVectors,
  ...backgroundVectors,
  ...transformVectors,
  ...strategyDeckVectors,
  ...pitchDeckVectors,
  ...qbrDeckVectors,
};
