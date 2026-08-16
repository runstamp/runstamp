import {
  PaperEngine,
  applyElasticPagination,
  compileAgentDocument,
  setDeterministicMode,
} from "../../src/index.js";
import { registerPptxPackageContractSuite } from "../../../../scripts/test-support/registerPptxPackageContractSuite.ts";

registerPptxPackageContractSuite("@runstamp/pptx package contracts", {
  PaperEngine,
  applyElasticPagination,
  compileAgentDocument,
  setDeterministicMode,
});
