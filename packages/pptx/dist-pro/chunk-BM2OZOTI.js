import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  XMLParser
} from "./chunk-E7KL3QDK.js";
import {
  require_lib
} from "./chunk-5GZJ6PGT.js";
import {
  PaperDocumentSchema
} from "./chunk-7V4ECWKA.js";
import {
  __toESM
} from "./chunk-VIXD5LXH.js";

// src/quality/packageDiff.ts
var import_jszip = __toESM(require_lib(), 1);
var VOLATILE_PATH_PATTERNS = [
  /^docProps\/core\.xml$/,
  /^docProps\/app\.xml$/,
  /^ppt\/presProps\.xml$/,
  /^ppt\/viewProps\.xml$/
];
var xmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});
function isVolatilePath(path) {
  return VOLATILE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}
function normalizeXml(xml) {
  try {
    return JSON.stringify(xmlParser.parse(xml));
  } catch {
    return xml.replace(/\s+/g, " ").trim();
  }
}
async function loadComparableEntries(buffer) {
  const zip = await import_jszip.default.loadAsync(buffer);
  const entries = /* @__PURE__ */ new Map();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || isVolatilePath(path)) continue;
    if (path.endsWith(".xml") || path.endsWith(".rels")) {
      entries.set(path, normalizeXml(await entry.async("string")));
      continue;
    }
    entries.set(path, await entry.async("nodebuffer"));
  }
  return entries;
}
async function diffNormalizedPackages(original, candidate) {
  const base = await loadComparableEntries(original);
  const next = await loadComparableEntries(candidate);
  const issues = [];
  for (const path of base.keys()) {
    if (!next.has(path)) {
      issues.push({ path, type: "removed" });
    }
  }
  for (const path of next.keys()) {
    if (!base.has(path)) {
      issues.push({ path, type: "added" });
      continue;
    }
    const left = base.get(path);
    const right = next.get(path);
    if (typeof left === "string" && typeof right === "string") {
      if (left !== right) {
        issues.push({ path, type: "modified" });
      }
      continue;
    }
    if (Buffer.isBuffer(left) && Buffer.isBuffer(right) && !left.equals(right)) {
      issues.push({ path, type: "modified" });
    }
  }
  return {
    passed: issues.length === 0,
    issues
  };
}

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/clone.js
function cloneRegExp(re) {
  var _a;
  const regexMatch = /^\/(.*)\/([gimyu]*)$/.exec(re.toString());
  if (!regexMatch) {
    throw new Error("Invalid RegExp");
  }
  return new RegExp((_a = regexMatch[1]) !== null && _a !== void 0 ? _a : "", regexMatch[2]);
}
function clone(arg) {
  if (typeof arg !== "object") {
    return arg;
  }
  if (arg === null) {
    return null;
  }
  if (Array.isArray(arg)) {
    return arg.map(clone);
  }
  if (arg instanceof Date) {
    return new Date(arg.getTime());
  }
  if (arg instanceof RegExp) {
    return cloneRegExp(arg);
  }
  const cloned = {};
  for (const name in arg) {
    if (Object.prototype.hasOwnProperty.call(arg, name)) {
      cloned[name] = clone(arg[name]);
    }
  }
  return cloned;
}

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/assertions/arrays.js
function assertNonEmptyArray(arr, message) {
  if (arr.length === 0) {
    throw new Error(message || "Expected a non-empty array");
  }
}
var lastNonEmpty = (arr) => arr[arr.length - 1];

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/contexts/context.js
var Context = class {
  setResult(result) {
    this.result = result;
    this.hasResult = true;
    return this;
  }
  exit() {
    this.exiting = true;
    return this;
  }
  push(child, name) {
    child.parent = this;
    if (typeof name !== "undefined") {
      child.childName = name;
    }
    child.root = this.root || this;
    child.options = child.options || this.options;
    if (!this.children) {
      this.children = [child];
      this.nextAfterChildren = this.next || null;
      this.next = child;
    } else {
      assertNonEmptyArray(this.children);
      lastNonEmpty(this.children).next = child;
      this.children.push(child);
    }
    child.next = this;
    return this;
  }
};

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/contexts/diff.js
var DiffContext = class extends Context {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
    this.pipe = "diff";
  }
  prepareDeltaResult(result) {
    var _a, _b, _c, _d;
    if (typeof result === "object") {
      if (((_a = this.options) === null || _a === void 0 ? void 0 : _a.omitRemovedValues) && Array.isArray(result) && result.length > 1 && (result.length === 2 || // modified
      result[2] === 0 || // deleted
      result[2] === 3)) {
        result[0] = 0;
      }
      if ((_b = this.options) === null || _b === void 0 ? void 0 : _b.cloneDiffValues) {
        const clone2 = typeof ((_c = this.options) === null || _c === void 0 ? void 0 : _c.cloneDiffValues) === "function" ? (_d = this.options) === null || _d === void 0 ? void 0 : _d.cloneDiffValues : clone;
        if (typeof result[0] === "object") {
          result[0] = clone2(result[0]);
        }
        if (typeof result[1] === "object") {
          result[1] = clone2(result[1]);
        }
      }
    }
    return result;
  }
  setResult(result) {
    this.prepareDeltaResult(result);
    return super.setResult(result);
  }
};
var diff_default = DiffContext;

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/contexts/patch.js
var PatchContext = class extends Context {
  constructor(left, delta) {
    super();
    this.left = left;
    this.delta = delta;
    this.pipe = "patch";
  }
};
var patch_default = PatchContext;

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/contexts/reverse.js
var ReverseContext = class extends Context {
  constructor(delta) {
    super();
    this.delta = delta;
    this.pipe = "reverse";
  }
};
var reverse_default = ReverseContext;

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/pipe.js
var Pipe = class {
  constructor(name) {
    this.name = name;
    this.filters = [];
  }
  process(input) {
    if (!this.processor) {
      throw new Error("add this pipe to a processor before using it");
    }
    const debug = this.debug;
    const length = this.filters.length;
    const context = input;
    for (let index = 0; index < length; index++) {
      const filter = this.filters[index];
      if (!filter)
        continue;
      if (debug) {
        this.log(`filter: ${filter.filterName}`);
      }
      filter(context);
      if (typeof context === "object" && context.exiting) {
        context.exiting = false;
        break;
      }
    }
    if (!context.next && this.resultCheck) {
      this.resultCheck(context);
    }
  }
  log(msg) {
    console.log(`[jsondiffpatch] ${this.name} pipe, ${msg}`);
  }
  append(...args) {
    this.filters.push(...args);
    return this;
  }
  prepend(...args) {
    this.filters.unshift(...args);
    return this;
  }
  indexOf(filterName) {
    if (!filterName) {
      throw new Error("a filter name is required");
    }
    for (let index = 0; index < this.filters.length; index++) {
      const filter = this.filters[index];
      if ((filter === null || filter === void 0 ? void 0 : filter.filterName) === filterName) {
        return index;
      }
    }
    throw new Error(`filter not found: ${filterName}`);
  }
  list() {
    return this.filters.map((f) => f.filterName);
  }
  after(filterName, ...params) {
    const index = this.indexOf(filterName);
    this.filters.splice(index + 1, 0, ...params);
    return this;
  }
  before(filterName, ...params) {
    const index = this.indexOf(filterName);
    this.filters.splice(index, 0, ...params);
    return this;
  }
  replace(filterName, ...params) {
    const index = this.indexOf(filterName);
    this.filters.splice(index, 1, ...params);
    return this;
  }
  remove(filterName) {
    const index = this.indexOf(filterName);
    this.filters.splice(index, 1);
    return this;
  }
  clear() {
    this.filters.length = 0;
    return this;
  }
  shouldHaveResult(should) {
    if (should === false) {
      this.resultCheck = null;
      return this;
    }
    if (this.resultCheck) {
      return this;
    }
    this.resultCheck = (context) => {
      if (!context.hasResult) {
        console.log(context);
        const error = new Error(`${this.name} failed`);
        error.noResult = true;
        throw error;
      }
    };
    return this;
  }
};
var pipe_default = Pipe;

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/processor.js
var Processor = class {
  constructor(options) {
    this.selfOptions = options || {};
    this.pipes = {};
  }
  options(options) {
    if (options) {
      this.selfOptions = options;
    }
    return this.selfOptions;
  }
  pipe(name, pipeArg) {
    let pipe = pipeArg;
    if (typeof name === "string") {
      if (typeof pipe === "undefined") {
        return this.pipes[name];
      }
      this.pipes[name] = pipe;
    }
    if (name && name.name) {
      pipe = name;
      if (pipe.processor === this) {
        return pipe;
      }
      this.pipes[pipe.name] = pipe;
    }
    if (!pipe) {
      throw new Error(`pipe is not defined: ${name}`);
    }
    pipe.processor = this;
    return pipe;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process(input, pipe) {
    let context = input;
    context.options = this.options();
    let nextPipe = pipe || input.pipe || "default";
    let lastPipe = void 0;
    while (nextPipe) {
      if (typeof context.nextAfterChildren !== "undefined") {
        context.next = context.nextAfterChildren;
        context.nextAfterChildren = null;
      }
      if (typeof nextPipe === "string") {
        nextPipe = this.pipe(nextPipe);
      }
      nextPipe.process(context);
      lastPipe = nextPipe;
      nextPipe = null;
      if (context) {
        if (context.next) {
          context = context.next;
          nextPipe = context.pipe || lastPipe;
        }
      }
    }
    return context.hasResult ? context.result : void 0;
  }
};
var processor_default = Processor;

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/filters/lcs.js
var defaultMatch = (array1, array2, index1, index2) => array1[index1] === array2[index2];
var lengthMatrix = (array1, array2, match, context) => {
  var _a, _b, _c;
  const len1 = array1.length;
  const len2 = array2.length;
  let x;
  let y;
  const matrix = new Array(len1 + 1);
  for (x = 0; x < len1 + 1; x++) {
    const matrixNewRow = new Array(len2 + 1);
    for (y = 0; y < len2 + 1; y++) {
      matrixNewRow[y] = 0;
    }
    matrix[x] = matrixNewRow;
  }
  matrix.match = match;
  for (x = 1; x < len1 + 1; x++) {
    const matrixRowX = matrix[x];
    if (matrixRowX === void 0) {
      throw new Error("LCS matrix row is undefined");
    }
    const matrixRowBeforeX = matrix[x - 1];
    if (matrixRowBeforeX === void 0) {
      throw new Error("LCS matrix row is undefined");
    }
    for (y = 1; y < len2 + 1; y++) {
      if (match(array1, array2, x - 1, y - 1, context)) {
        matrixRowX[y] = ((_a = matrixRowBeforeX[y - 1]) !== null && _a !== void 0 ? _a : 0) + 1;
      } else {
        matrixRowX[y] = Math.max((_b = matrixRowBeforeX[y]) !== null && _b !== void 0 ? _b : 0, (_c = matrixRowX[y - 1]) !== null && _c !== void 0 ? _c : 0);
      }
    }
  }
  return matrix;
};
var backtrack = (matrix, array1, array2, context) => {
  let index1 = array1.length;
  let index2 = array2.length;
  const subsequence = {
    sequence: [],
    indices1: [],
    indices2: []
  };
  while (index1 !== 0 && index2 !== 0) {
    if (matrix.match === void 0) {
      throw new Error("LCS matrix match function is undefined");
    }
    const sameLetter = matrix.match(array1, array2, index1 - 1, index2 - 1, context);
    if (sameLetter) {
      subsequence.sequence.unshift(array1[index1 - 1]);
      subsequence.indices1.unshift(index1 - 1);
      subsequence.indices2.unshift(index2 - 1);
      --index1;
      --index2;
    } else {
      const matrixRowIndex1 = matrix[index1];
      if (matrixRowIndex1 === void 0) {
        throw new Error("LCS matrix row is undefined");
      }
      const valueAtMatrixAbove = matrixRowIndex1[index2 - 1];
      if (valueAtMatrixAbove === void 0) {
        throw new Error("LCS matrix value is undefined");
      }
      const matrixRowBeforeIndex1 = matrix[index1 - 1];
      if (matrixRowBeforeIndex1 === void 0) {
        throw new Error("LCS matrix row is undefined");
      }
      const valueAtMatrixLeft = matrixRowBeforeIndex1[index2];
      if (valueAtMatrixLeft === void 0) {
        throw new Error("LCS matrix value is undefined");
      }
      if (valueAtMatrixAbove > valueAtMatrixLeft) {
        --index2;
      } else {
        --index1;
      }
    }
  }
  return subsequence;
};
var get = (array1, array2, match, context) => {
  const innerContext = context || {};
  const matrix = lengthMatrix(array1, array2, match || defaultMatch, innerContext);
  return backtrack(matrix, array1, array2, innerContext);
};
var lcs_default = {
  get
};

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/filters/arrays.js
var ARRAY_MOVE = 3;
function arraysHaveMatchByRef(array1, array2, len1, len2) {
  for (let index1 = 0; index1 < len1; index1++) {
    const val1 = array1[index1];
    for (let index2 = 0; index2 < len2; index2++) {
      const val2 = array2[index2];
      if (index1 !== index2 && val1 === val2) {
        return true;
      }
    }
  }
  return false;
}
function matchItems(array1, array2, index1, index2, context) {
  const value1 = array1[index1];
  const value2 = array2[index2];
  if (value1 === value2) {
    return true;
  }
  if (typeof value1 !== "object" || typeof value2 !== "object") {
    return false;
  }
  const objectHash = context.objectHash;
  if (!objectHash) {
    return context.matchByPosition && index1 === index2;
  }
  context.hashCache1 = context.hashCache1 || [];
  let hash1 = context.hashCache1[index1];
  if (typeof hash1 === "undefined") {
    context.hashCache1[index1] = hash1 = objectHash(value1, index1);
  }
  if (typeof hash1 === "undefined") {
    return false;
  }
  context.hashCache2 = context.hashCache2 || [];
  let hash2 = context.hashCache2[index2];
  if (typeof hash2 === "undefined") {
    context.hashCache2[index2] = hash2 = objectHash(value2, index2);
  }
  if (typeof hash2 === "undefined") {
    return false;
  }
  return hash1 === hash2;
}
var diffFilter = function arraysDiffFilter(context) {
  var _a, _b, _c, _d, _e;
  if (!context.leftIsArray) {
    return;
  }
  const matchContext = {
    objectHash: (_a = context.options) === null || _a === void 0 ? void 0 : _a.objectHash,
    matchByPosition: (_b = context.options) === null || _b === void 0 ? void 0 : _b.matchByPosition
  };
  let commonHead = 0;
  let commonTail = 0;
  let index;
  let index1;
  let index2;
  const array1 = context.left;
  const array2 = context.right;
  const len1 = array1.length;
  const len2 = array2.length;
  let child;
  if (len1 > 0 && len2 > 0 && !matchContext.objectHash && typeof matchContext.matchByPosition !== "boolean") {
    matchContext.matchByPosition = !arraysHaveMatchByRef(array1, array2, len1, len2);
  }
  while (commonHead < len1 && commonHead < len2 && matchItems(array1, array2, commonHead, commonHead, matchContext)) {
    index = commonHead;
    child = new diff_default(array1[index], array2[index]);
    context.push(child, index);
    commonHead++;
  }
  while (commonTail + commonHead < len1 && commonTail + commonHead < len2 && matchItems(array1, array2, len1 - 1 - commonTail, len2 - 1 - commonTail, matchContext)) {
    index1 = len1 - 1 - commonTail;
    index2 = len2 - 1 - commonTail;
    child = new diff_default(array1[index1], array2[index2]);
    context.push(child, index2);
    commonTail++;
  }
  let result;
  if (commonHead + commonTail === len1) {
    if (len1 === len2) {
      context.setResult(void 0).exit();
      return;
    }
    result = result || {
      _t: "a"
    };
    for (index = commonHead; index < len2 - commonTail; index++) {
      result[index] = [array2[index]];
      context.prepareDeltaResult(result[index]);
    }
    context.setResult(result).exit();
    return;
  }
  if (commonHead + commonTail === len2) {
    result = result || {
      _t: "a"
    };
    for (index = commonHead; index < len1 - commonTail; index++) {
      const key = `_${index}`;
      result[key] = [array1[index], 0, 0];
      context.prepareDeltaResult(result[key]);
    }
    context.setResult(result).exit();
    return;
  }
  matchContext.hashCache1 = void 0;
  matchContext.hashCache2 = void 0;
  const trimmed1 = array1.slice(commonHead, len1 - commonTail);
  const trimmed2 = array2.slice(commonHead, len2 - commonTail);
  const seq = lcs_default.get(trimmed1, trimmed2, matchItems, matchContext);
  const removedItems = [];
  result = result || {
    _t: "a"
  };
  for (index = commonHead; index < len1 - commonTail; index++) {
    if (seq.indices1.indexOf(index - commonHead) < 0) {
      const key = `_${index}`;
      result[key] = [array1[index], 0, 0];
      context.prepareDeltaResult(result[key]);
      removedItems.push(index);
    }
  }
  let detectMove = true;
  if (((_c = context.options) === null || _c === void 0 ? void 0 : _c.arrays) && context.options.arrays.detectMove === false) {
    detectMove = false;
  }
  let includeValueOnMove = false;
  if ((_e = (_d = context.options) === null || _d === void 0 ? void 0 : _d.arrays) === null || _e === void 0 ? void 0 : _e.includeValueOnMove) {
    includeValueOnMove = true;
  }
  const removedItemsLength = removedItems.length;
  for (index = commonHead; index < len2 - commonTail; index++) {
    const indexOnArray2 = seq.indices2.indexOf(index - commonHead);
    if (indexOnArray2 < 0) {
      let isMove = false;
      if (detectMove && removedItemsLength > 0) {
        for (let removeItemIndex1 = 0; removeItemIndex1 < removedItemsLength; removeItemIndex1++) {
          index1 = removedItems[removeItemIndex1];
          const resultItem = index1 === void 0 ? void 0 : result[`_${index1}`];
          if (index1 !== void 0 && resultItem && matchItems(trimmed1, trimmed2, index1 - commonHead, index - commonHead, matchContext)) {
            resultItem.splice(1, 2, index, ARRAY_MOVE);
            resultItem.splice(1, 2, index, ARRAY_MOVE);
            if (!includeValueOnMove) {
              resultItem[0] = "";
            }
            index2 = index;
            child = new diff_default(array1[index1], array2[index2]);
            context.push(child, index2);
            removedItems.splice(removeItemIndex1, 1);
            isMove = true;
            break;
          }
        }
      }
      if (!isMove) {
        result[index] = [array2[index]];
        context.prepareDeltaResult(result[index]);
      }
    } else {
      if (seq.indices1[indexOnArray2] === void 0) {
        throw new Error(`Invalid indexOnArray2: ${indexOnArray2}, seq.indices1: ${seq.indices1}`);
      }
      index1 = seq.indices1[indexOnArray2] + commonHead;
      if (seq.indices2[indexOnArray2] === void 0) {
        throw new Error(`Invalid indexOnArray2: ${indexOnArray2}, seq.indices2: ${seq.indices2}`);
      }
      index2 = seq.indices2[indexOnArray2] + commonHead;
      child = new diff_default(array1[index1], array2[index2]);
      context.push(child, index2);
    }
  }
  context.setResult(result).exit();
};
diffFilter.filterName = "arrays";
var compare = {
  numerically(a, b) {
    return a - b;
  },
  numericallyBy(name) {
    return (a, b) => a[name] - b[name];
  }
};
var patchFilter = function nestedPatchFilter(context) {
  var _a;
  if (!context.nested) {
    return;
  }
  const nestedDelta = context.delta;
  if (nestedDelta._t !== "a") {
    return;
  }
  let index;
  let index1;
  const delta = nestedDelta;
  const array = context.left;
  let toRemove = [];
  let toInsert = [];
  const toModify = [];
  for (index in delta) {
    if (index !== "_t") {
      if (index[0] === "_") {
        const removedOrMovedIndex = index;
        if (delta[removedOrMovedIndex] !== void 0 && (delta[removedOrMovedIndex][2] === 0 || delta[removedOrMovedIndex][2] === ARRAY_MOVE)) {
          toRemove.push(Number.parseInt(index.slice(1), 10));
        } else {
          throw new Error(`only removal or move can be applied at original array indices, invalid diff type: ${(_a = delta[removedOrMovedIndex]) === null || _a === void 0 ? void 0 : _a[2]}`);
        }
      } else {
        const numberIndex = index;
        if (delta[numberIndex].length === 1) {
          toInsert.push({
            index: Number.parseInt(numberIndex, 10),
            value: delta[numberIndex][0]
          });
        } else {
          toModify.push({
            index: Number.parseInt(numberIndex, 10),
            delta: delta[numberIndex]
          });
        }
      }
    }
  }
  toRemove = toRemove.sort(compare.numerically);
  for (index = toRemove.length - 1; index >= 0; index--) {
    index1 = toRemove[index];
    if (index1 === void 0)
      continue;
    const indexDiff = delta[`_${index1}`];
    const removedValue = array.splice(index1, 1)[0];
    if ((indexDiff === null || indexDiff === void 0 ? void 0 : indexDiff[2]) === ARRAY_MOVE) {
      toInsert.push({
        index: indexDiff[1],
        value: removedValue
      });
    }
  }
  toInsert = toInsert.sort(compare.numericallyBy("index"));
  const toInsertLength = toInsert.length;
  for (index = 0; index < toInsertLength; index++) {
    const insertion = toInsert[index];
    if (insertion === void 0)
      continue;
    array.splice(insertion.index, 0, insertion.value);
  }
  const toModifyLength = toModify.length;
  if (toModifyLength > 0) {
    for (index = 0; index < toModifyLength; index++) {
      const modification = toModify[index];
      if (modification === void 0)
        continue;
      const child = new patch_default(array[modification.index], modification.delta);
      context.push(child, modification.index);
    }
  }
  if (!context.children) {
    context.setResult(array).exit();
    return;
  }
  context.exit();
};
patchFilter.filterName = "arrays";
var collectChildrenPatchFilter = function collectChildrenPatchFilter2(context) {
  if (!context || !context.children) {
    return;
  }
  const deltaWithChildren = context.delta;
  if (deltaWithChildren._t !== "a") {
    return;
  }
  const array = context.left;
  const length = context.children.length;
  for (let index = 0; index < length; index++) {
    const child = context.children[index];
    if (child === void 0)
      continue;
    const arrayIndex = child.childName;
    array[arrayIndex] = child.result;
  }
  context.setResult(array).exit();
};
collectChildrenPatchFilter.filterName = "arraysCollectChildren";
var reverseFilter = function arraysReverseFilter(context) {
  if (!context.nested) {
    const nonNestedDelta = context.delta;
    if (nonNestedDelta[2] === ARRAY_MOVE) {
      const arrayMoveDelta = nonNestedDelta;
      context.newName = `_${arrayMoveDelta[1]}`;
      context.setResult([
        arrayMoveDelta[0],
        Number.parseInt(context.childName.substring(1), 10),
        ARRAY_MOVE
      ]).exit();
    }
    return;
  }
  const nestedDelta = context.delta;
  if (nestedDelta._t !== "a") {
    return;
  }
  const arrayDelta = nestedDelta;
  for (const name in arrayDelta) {
    if (name === "_t") {
      continue;
    }
    const child = new reverse_default(arrayDelta[name]);
    context.push(child, name);
  }
  context.exit();
};
reverseFilter.filterName = "arrays";
var reverseArrayDeltaIndex = (delta, index, itemDelta) => {
  if (typeof index === "string" && index[0] === "_") {
    return Number.parseInt(index.substring(1), 10);
  }
  if (Array.isArray(itemDelta) && itemDelta[2] === 0) {
    return `_${index}`;
  }
  let reverseIndex = +index;
  for (const deltaIndex in delta) {
    const deltaItem = delta[deltaIndex];
    if (Array.isArray(deltaItem)) {
      if (deltaItem[2] === ARRAY_MOVE) {
        const moveFromIndex = Number.parseInt(deltaIndex.substring(1), 10);
        const moveToIndex = deltaItem[1];
        if (moveToIndex === +index) {
          return moveFromIndex;
        }
        if (moveFromIndex <= reverseIndex && moveToIndex > reverseIndex) {
          reverseIndex++;
        } else if (moveFromIndex >= reverseIndex && moveToIndex < reverseIndex) {
          reverseIndex--;
        }
      } else if (deltaItem[2] === 0) {
        const deleteIndex = Number.parseInt(deltaIndex.substring(1), 10);
        if (deleteIndex <= reverseIndex) {
          reverseIndex++;
        }
      } else if (deltaItem.length === 1 && Number.parseInt(deltaIndex, 10) <= reverseIndex) {
        reverseIndex--;
      }
    }
  }
  return reverseIndex;
};
var collectChildrenReverseFilter = (context) => {
  if (!context || !context.children) {
    return;
  }
  const deltaWithChildren = context.delta;
  if (deltaWithChildren._t !== "a") {
    return;
  }
  const arrayDelta = deltaWithChildren;
  const length = context.children.length;
  const delta = {
    _t: "a"
  };
  for (let index = 0; index < length; index++) {
    const child = context.children[index];
    if (child === void 0)
      continue;
    let name = child.newName;
    if (typeof name === "undefined") {
      if (child.childName === void 0) {
        throw new Error("child.childName is undefined");
      }
      name = reverseArrayDeltaIndex(arrayDelta, child.childName, child.result);
    }
    if (delta[name] !== child.result) {
      delta[name] = child.result;
    }
  }
  context.setResult(delta).exit();
};
collectChildrenReverseFilter.filterName = "arraysCollectChildren";

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/filters/dates.js
var diffFilter2 = function datesDiffFilter(context) {
  if (context.left instanceof Date) {
    if (context.right instanceof Date) {
      if (context.left.getTime() !== context.right.getTime()) {
        context.setResult([context.left, context.right]);
      } else {
        context.setResult(void 0);
      }
    } else {
      context.setResult([context.left, context.right]);
    }
    context.exit();
  } else if (context.right instanceof Date) {
    context.setResult([context.left, context.right]).exit();
  }
};
diffFilter2.filterName = "dates";

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/filters/nested.js
var collectChildrenDiffFilter = (context) => {
  if (!context || !context.children) {
    return;
  }
  const length = context.children.length;
  let result = context.result;
  for (let index = 0; index < length; index++) {
    const child = context.children[index];
    if (child === void 0)
      continue;
    if (typeof child.result === "undefined") {
      continue;
    }
    result = result || {};
    if (child.childName === void 0) {
      throw new Error("diff child.childName is undefined");
    }
    result[child.childName] = child.result;
  }
  if (result && context.leftIsArray) {
    result._t = "a";
  }
  context.setResult(result).exit();
};
collectChildrenDiffFilter.filterName = "collectChildren";
var objectsDiffFilter = (context) => {
  var _a;
  if (context.leftIsArray || context.leftType !== "object") {
    return;
  }
  const left = context.left;
  const right = context.right;
  const propertyFilter = (_a = context.options) === null || _a === void 0 ? void 0 : _a.propertyFilter;
  for (const name in left) {
    if (!Object.prototype.hasOwnProperty.call(left, name)) {
      continue;
    }
    if (propertyFilter && !propertyFilter(name, context)) {
      continue;
    }
    const child = new diff_default(left[name], right[name]);
    context.push(child, name);
  }
  for (const name in right) {
    if (!Object.prototype.hasOwnProperty.call(right, name)) {
      continue;
    }
    if (propertyFilter && !propertyFilter(name, context)) {
      continue;
    }
    if (typeof left[name] === "undefined") {
      const child = new diff_default(void 0, right[name]);
      context.push(child, name);
    }
  }
  if (!context.children || context.children.length === 0) {
    context.setResult(void 0).exit();
    return;
  }
  context.exit();
};
objectsDiffFilter.filterName = "objects";
var patchFilter2 = function nestedPatchFilter2(context) {
  if (!context.nested) {
    return;
  }
  const nestedDelta = context.delta;
  if (nestedDelta._t) {
    return;
  }
  const objectDelta = nestedDelta;
  for (const name in objectDelta) {
    const child = new patch_default(context.left[name], objectDelta[name]);
    context.push(child, name);
  }
  context.exit();
};
patchFilter2.filterName = "objects";
var collectChildrenPatchFilter3 = function collectChildrenPatchFilter4(context) {
  if (!context || !context.children) {
    return;
  }
  const deltaWithChildren = context.delta;
  if (deltaWithChildren._t) {
    return;
  }
  const object = context.left;
  const length = context.children.length;
  for (let index = 0; index < length; index++) {
    const child = context.children[index];
    if (child === void 0)
      continue;
    const property = child.childName;
    if (Object.prototype.hasOwnProperty.call(context.left, property) && child.result === void 0) {
      delete object[property];
    } else if (object[property] !== child.result) {
      object[property] = child.result;
    }
  }
  context.setResult(object).exit();
};
collectChildrenPatchFilter3.filterName = "collectChildren";
var reverseFilter2 = function nestedReverseFilter(context) {
  if (!context.nested) {
    return;
  }
  const nestedDelta = context.delta;
  if (nestedDelta._t) {
    return;
  }
  const objectDelta = context.delta;
  for (const name in objectDelta) {
    const child = new reverse_default(objectDelta[name]);
    context.push(child, name);
  }
  context.exit();
};
reverseFilter2.filterName = "objects";
var collectChildrenReverseFilter2 = (context) => {
  if (!context || !context.children) {
    return;
  }
  const deltaWithChildren = context.delta;
  if (deltaWithChildren._t) {
    return;
  }
  const length = context.children.length;
  const delta = {};
  for (let index = 0; index < length; index++) {
    const child = context.children[index];
    if (child === void 0)
      continue;
    const property = child.childName;
    if (delta[property] !== child.result) {
      delta[property] = child.result;
    }
  }
  context.setResult(delta).exit();
};
collectChildrenReverseFilter2.filterName = "collectChildren";

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/filters/texts.js
var TEXT_DIFF = 2;
var DEFAULT_MIN_LENGTH = 60;
var cachedDiffPatch = null;
function getDiffMatchPatch(options, required) {
  var _a;
  if (!cachedDiffPatch) {
    let instance;
    if ((_a = options === null || options === void 0 ? void 0 : options.textDiff) === null || _a === void 0 ? void 0 : _a.diffMatchPatch) {
      instance = new options.textDiff.diffMatchPatch();
    } else {
      if (!required) {
        return null;
      }
      const error = new Error("The diff-match-patch library was not provided. Pass the library in through the options or use the `jsondiffpatch/with-text-diffs` entry-point.");
      error.diff_match_patch_not_found = true;
      throw error;
    }
    cachedDiffPatch = {
      diff: (txt1, txt2) => instance.patch_toText(instance.patch_make(txt1, txt2)),
      patch: (txt1, patch) => {
        const results = instance.patch_apply(instance.patch_fromText(patch), txt1);
        for (const resultOk of results[1]) {
          if (!resultOk) {
            const error = new Error("text patch failed");
            error.textPatchFailed = true;
            throw error;
          }
        }
        return results[0];
      }
    };
  }
  return cachedDiffPatch;
}
var diffFilter3 = function textsDiffFilter(context) {
  var _a, _b;
  if (context.leftType !== "string") {
    return;
  }
  const left = context.left;
  const right = context.right;
  const minLength = ((_b = (_a = context.options) === null || _a === void 0 ? void 0 : _a.textDiff) === null || _b === void 0 ? void 0 : _b.minLength) || DEFAULT_MIN_LENGTH;
  if (left.length < minLength || right.length < minLength) {
    context.setResult([left, right]).exit();
    return;
  }
  const diffMatchPatch = getDiffMatchPatch(context.options);
  if (!diffMatchPatch) {
    context.setResult([left, right]).exit();
    return;
  }
  const diff = diffMatchPatch.diff;
  context.setResult([diff(left, right), 0, TEXT_DIFF]).exit();
};
diffFilter3.filterName = "texts";
var patchFilter3 = function textsPatchFilter(context) {
  if (context.nested) {
    return;
  }
  const nonNestedDelta = context.delta;
  if (nonNestedDelta[2] !== TEXT_DIFF) {
    return;
  }
  const textDiffDelta = nonNestedDelta;
  const patch = getDiffMatchPatch(context.options, true).patch;
  context.setResult(patch(context.left, textDiffDelta[0])).exit();
};
patchFilter3.filterName = "texts";
var textDeltaReverse = (delta) => {
  var _a, _b, _c;
  const headerRegex = /^@@ +-(\d+),(\d+) +\+(\d+),(\d+) +@@$/;
  const lines = delta.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === void 0)
      continue;
    const lineStart = line.slice(0, 1);
    if (lineStart === "@") {
      const header = headerRegex.exec(line);
      if (header !== null) {
        const lineHeader = i;
        lines[lineHeader] = `@@ -${header[3]},${header[4]} +${header[1]},${header[2]} @@`;
      }
    } else if (lineStart === "+") {
      lines[i] = `-${(_a = lines[i]) === null || _a === void 0 ? void 0 : _a.slice(1)}`;
      if (((_b = lines[i - 1]) === null || _b === void 0 ? void 0 : _b.slice(0, 1)) === "+") {
        const lineTmp = lines[i];
        lines[i] = lines[i - 1];
        lines[i - 1] = lineTmp;
      }
    } else if (lineStart === "-") {
      lines[i] = `+${(_c = lines[i]) === null || _c === void 0 ? void 0 : _c.slice(1)}`;
    }
  }
  return lines.join("\n");
};
var reverseFilter3 = function textsReverseFilter(context) {
  if (context.nested) {
    return;
  }
  const nonNestedDelta = context.delta;
  if (nonNestedDelta[2] !== TEXT_DIFF) {
    return;
  }
  const textDiffDelta = nonNestedDelta;
  context.setResult([textDeltaReverse(textDiffDelta[0]), 0, TEXT_DIFF]).exit();
};
reverseFilter3.filterName = "texts";

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/filters/trivial.js
var diffFilter4 = function trivialMatchesDiffFilter(context) {
  if (context.left === context.right) {
    context.setResult(void 0).exit();
    return;
  }
  if (typeof context.left === "undefined") {
    if (typeof context.right === "function") {
      throw new Error("functions are not supported");
    }
    context.setResult([context.right]).exit();
    return;
  }
  if (typeof context.right === "undefined") {
    context.setResult([context.left, 0, 0]).exit();
    return;
  }
  if (typeof context.left === "function" || typeof context.right === "function") {
    throw new Error("functions are not supported");
  }
  context.leftType = context.left === null ? "null" : typeof context.left;
  context.rightType = context.right === null ? "null" : typeof context.right;
  if (context.leftType !== context.rightType) {
    context.setResult([context.left, context.right]).exit();
    return;
  }
  if (context.leftType === "boolean" || context.leftType === "number") {
    context.setResult([context.left, context.right]).exit();
    return;
  }
  if (context.leftType === "object") {
    context.leftIsArray = Array.isArray(context.left);
  }
  if (context.rightType === "object") {
    context.rightIsArray = Array.isArray(context.right);
  }
  if (context.leftIsArray !== context.rightIsArray) {
    context.setResult([context.left, context.right]).exit();
    return;
  }
  if (context.left instanceof RegExp) {
    if (context.right instanceof RegExp) {
      context.setResult([context.left.toString(), context.right.toString()]).exit();
    } else {
      context.setResult([context.left, context.right]).exit();
    }
  }
};
diffFilter4.filterName = "trivial";
var patchFilter4 = function trivialMatchesPatchFilter(context) {
  if (typeof context.delta === "undefined") {
    context.setResult(context.left).exit();
    return;
  }
  context.nested = !Array.isArray(context.delta);
  if (context.nested) {
    return;
  }
  const nonNestedDelta = context.delta;
  if (nonNestedDelta.length === 1) {
    context.setResult(nonNestedDelta[0]).exit();
    return;
  }
  if (nonNestedDelta.length === 2) {
    if (context.left instanceof RegExp) {
      const regexArgs = /^\/(.*)\/([gimyu]+)$/.exec(nonNestedDelta[1]);
      if (regexArgs === null || regexArgs === void 0 ? void 0 : regexArgs[1]) {
        context.setResult(new RegExp(regexArgs[1], regexArgs[2])).exit();
        return;
      }
    }
    context.setResult(nonNestedDelta[1]).exit();
    return;
  }
  if (nonNestedDelta.length === 3 && nonNestedDelta[2] === 0) {
    context.setResult(void 0).exit();
  }
};
patchFilter4.filterName = "trivial";
var reverseFilter4 = function trivialReferseFilter(context) {
  if (typeof context.delta === "undefined") {
    context.setResult(context.delta).exit();
    return;
  }
  context.nested = !Array.isArray(context.delta);
  if (context.nested) {
    return;
  }
  const nonNestedDelta = context.delta;
  if (nonNestedDelta.length === 1) {
    context.setResult([nonNestedDelta[0], 0, 0]).exit();
    return;
  }
  if (nonNestedDelta.length === 2) {
    context.setResult([nonNestedDelta[1], nonNestedDelta[0]]).exit();
    return;
  }
  if (nonNestedDelta.length === 3 && nonNestedDelta[2] === 0) {
    context.setResult([nonNestedDelta[0]]).exit();
  }
};
reverseFilter4.filterName = "trivial";

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/diffpatcher.js
var DiffPatcher = class {
  constructor(options) {
    this.processor = new processor_default(options);
    this.processor.pipe(new pipe_default("diff").append(collectChildrenDiffFilter, diffFilter4, diffFilter2, diffFilter3, objectsDiffFilter, diffFilter).shouldHaveResult());
    this.processor.pipe(new pipe_default("patch").append(collectChildrenPatchFilter3, collectChildrenPatchFilter, patchFilter4, patchFilter3, patchFilter2, patchFilter).shouldHaveResult());
    this.processor.pipe(new pipe_default("reverse").append(collectChildrenReverseFilter2, collectChildrenReverseFilter, reverseFilter4, reverseFilter3, reverseFilter2, reverseFilter).shouldHaveResult());
  }
  options(options) {
    return this.processor.options(options);
  }
  diff(left, right) {
    return this.processor.process(new diff_default(left, right));
  }
  patch(left, delta) {
    return this.processor.process(new patch_default(left, delta));
  }
  reverse(delta) {
    return this.processor.process(new reverse_default(delta));
  }
  unpatch(right, delta) {
    return this.patch(right, this.reverse(delta));
  }
  clone(value) {
    return clone(value);
  }
};
var diffpatcher_default = DiffPatcher;

// ../../node_modules/.pnpm/jsondiffpatch@0.7.3/node_modules/jsondiffpatch/lib/index.js
function create(options) {
  return new diffpatcher_default(options);
}

// ../document-diff/src/index.ts
var INTERNAL_FIELD_PREFIX = "__diff";
function compareJsonDiffKeys(left, right) {
  const normalize = (value) => {
    if (value.startsWith("_")) {
      return [1, value.slice(1)];
    }
    return [0, value];
  };
  const [leftPrefix, leftValue] = normalize(left);
  const [rightPrefix, rightValue] = normalize(right);
  if (leftPrefix !== rightPrefix) {
    return leftPrefix - rightPrefix;
  }
  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return left.localeCompare(right);
}
function classifyArrayDelta(delta) {
  if (delta.length === 1) {
    return "added";
  }
  if (delta.length >= 3 && delta[1] === 0 && delta[2] === 0) {
    return "removed";
  }
  if (delta.length >= 3 && delta[2] === 3) {
    return "moved";
  }
  return "modified";
}
function flattenDelta(delta, path = []) {
  if (!delta || typeof delta !== "object") {
    return [];
  }
  if (Array.isArray(delta)) {
    return [{ type: classifyArrayDelta(delta), path }];
  }
  const deltaRecord = delta;
  if (deltaRecord._t === "a") {
    const changes2 = [];
    for (const key of Object.keys(deltaRecord).filter((candidate) => candidate !== "_t").sort(compareJsonDiffKeys)) {
      const child = deltaRecord[key];
      if (key.startsWith("_")) {
        const oldIndex = Number(key.slice(1));
        if (Array.isArray(child)) {
          const childKind = classifyArrayDelta(child);
          if (childKind === "moved") {
            changes2.push({
              type: "moved",
              path: [...path, Number(child[1])],
              fromPath: [...path, oldIndex]
            });
          } else if (childKind === "removed") {
            changes2.push({
              type: "removed",
              path: [...path, oldIndex]
            });
          } else {
            changes2.push({
              type: childKind,
              path: [...path, oldIndex]
            });
          }
          continue;
        }
        changes2.push(...flattenDelta(child, [...path, oldIndex]));
        continue;
      }
      const newIndex = Number(key);
      if (Array.isArray(child) && classifyArrayDelta(child) === "added") {
        changes2.push({
          type: "added",
          path: [...path, newIndex]
        });
        continue;
      }
      changes2.push(...flattenDelta(child, [...path, newIndex]));
    }
    return changes2;
  }
  const changes = [];
  for (const key of Object.keys(deltaRecord).sort()) {
    const child = deltaRecord[key];
    if (Array.isArray(child)) {
      changes.push({
        type: classifyArrayDelta(child),
        path: [...path, key]
      });
      continue;
    }
    changes.push(...flattenDelta(child, [...path, key]));
  }
  return changes;
}
function getValueAtPath(value, path) {
  let current = value;
  for (const segment of path) {
    if (current == null || typeof current !== "object") {
      return void 0;
    }
    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return void 0;
      }
      current = current[segment];
      continue;
    }
    current = current[segment];
  }
  return current;
}
function formatPath(path) {
  return path.reduce((result, segment) => {
    if (typeof segment === "number") {
      return `${result}[${segment}]`;
    }
    if (result.length === 0) {
      return segment;
    }
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
      return `${result}.${segment}`;
    }
    return `${result}[${JSON.stringify(segment)}]`;
  }, "");
}
function defaultDescription(type, pathString) {
  if (type === "added") {
    return `${pathString} added`;
  }
  if (type === "removed") {
    return `${pathString} removed`;
  }
  if (type === "moved") {
    return `${pathString} moved`;
  }
  return `${pathString} modified`;
}
function defaultSeverity(type) {
  if (type === "modified") {
    return "minor";
  }
  return "major";
}
function createEmptyStatistics() {
  return {
    added: 0,
    removed: 0,
    modified: 0,
    moved: 0
  };
}
function buildStatistics(changes) {
  const statistics = createEmptyStatistics();
  for (const change of changes) {
    statistics[change.type] += 1;
  }
  return statistics;
}
function buildSummary(changes, summaryLabels, options) {
  if (options?.includeSummary === false) {
    return "";
  }
  if (changes.length === 0) {
    return "No changes";
  }
  const grouped = /* @__PURE__ */ new Map();
  for (const label of summaryLabels) {
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  }
  const fragments = [...grouped.entries()].map(([label, count]) => `${count} ${label}`);
  const noun = changes.length === 1 ? "change" : "changes";
  return `${changes.length} ${noun}: ${fragments.join(", ")}`;
}
function shouldSuppressInternalPath(path, fromPath) {
  const includesInternalField = (segments) => Boolean(segments?.some((segment) => typeof segment === "string" && segment.startsWith(INTERNAL_FIELD_PREFIX)));
  return includesInternalField(path) || includesInternalField(fromPath);
}
function defaultSummaryLabel(type) {
  if (type === "added") {
    return "item added";
  }
  if (type === "removed") {
    return "item removed";
  }
  if (type === "moved") {
    return "item moved";
  }
  return "item modified";
}
function defaultObjectHash(value, index) {
  if (!value || typeof value !== "object") {
    return void 0;
  }
  return value.__diffKey ?? (typeof index === "number" ? `__index:${index}` : void 0);
}
function diffDocuments(before, after, plugin, options) {
  const normalizedBefore = plugin.normalize(before);
  const normalizedAfter = plugin.normalize(after);
  const diffPatch = create({
    objectHash: defaultObjectHash,
    arrays: {
      detectMove: true,
      includeValueOnMove: false
    }
  });
  const delta = diffPatch.diff(normalizedBefore, normalizedAfter);
  if (!delta) {
    return {
      changes: [],
      summary: options?.includeSummary === false ? "" : "No changes",
      statistics: createEmptyStatistics()
    };
  }
  const rawChanges = flattenDelta(delta);
  const changes = [];
  const summaryLabels = [];
  for (const rawChange of rawChanges) {
    const pathString = formatPath(rawChange.path);
    const fromPathString = rawChange.fromPath ? formatPath(rawChange.fromPath) : void 0;
    const context = {
      type: rawChange.type,
      path: rawChange.path,
      pathString,
      fromPath: rawChange.fromPath,
      fromPathString,
      before: rawChange.fromPath ? getValueAtPath(normalizedBefore, rawChange.fromPath) : getValueAtPath(normalizedBefore, rawChange.path),
      after: getValueAtPath(normalizedAfter, rawChange.path),
      normalizedBefore,
      normalizedAfter
    };
    if (shouldSuppressInternalPath(rawChange.path, rawChange.fromPath) || plugin.shouldSuppress?.(context)) {
      continue;
    }
    const interpreted = plugin.interpretChange?.(context);
    if (interpreted === null) {
      continue;
    }
    changes.push({
      type: rawChange.type,
      path: pathString,
      description: interpreted?.description ?? defaultDescription(rawChange.type, pathString),
      before: context.before,
      after: context.after,
      severity: interpreted?.severity ?? defaultSeverity(rawChange.type)
    });
    summaryLabels.push(interpreted?.summaryLabel ?? defaultSummaryLabel(rawChange.type));
  }
  const statistics = buildStatistics(changes);
  return {
    changes,
    summary: buildSummary(changes, summaryLabels, options),
    statistics
  };
}
function createDiffKey(...parts) {
  return parts.filter((part) => part !== void 0 && part !== null && part !== "").join(":");
}

// src/quality/document-diff.ts
function asRecord(value) {
  return value && typeof value === "object" ? value : void 0;
}
function getValueAtPath2(value, path) {
  let current = value;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return void 0;
    }
    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return void 0;
      }
      current = current[segment];
      continue;
    }
    current = current[segment];
  }
  return current;
}
function findNearestNode(context) {
  for (let index = context.path.length; index > 0; index -= 1) {
    const candidatePath = context.path.slice(0, index);
    const afterNode = asRecord(getValueAtPath2(context.normalizedAfter, candidatePath));
    if (afterNode && typeof afterNode.type === "string") {
      return { node: afterNode, path: candidatePath };
    }
    const beforeNode = asRecord(getValueAtPath2(context.normalizedBefore, candidatePath));
    if (beforeNode && typeof beforeNode.type === "string") {
      return { node: beforeNode, path: candidatePath };
    }
  }
  return void 0;
}
function firstNumericAfter(path, segmentName) {
  const segmentIndex = path.indexOf(segmentName);
  if (segmentIndex === -1) {
    return void 0;
  }
  const candidate = path[segmentIndex + 1];
  return typeof candidate === "number" ? candidate : void 0;
}
function pathIncludes(path, segmentName) {
  return path.includes(segmentName);
}
function capitalize(value) {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
function isTextLikeNode(node) {
  if (node.type === "Text") {
    return true;
  }
  if (node.type !== "View") {
    return false;
  }
  return typeof node.textContent === "string" || Array.isArray(node.textContent) || Array.isArray(node.textParagraphs);
}
function nodeNoun(node) {
  if (isTextLikeNode(node)) {
    return "text";
  }
  switch (node.type) {
    case "Image":
      return "image";
    case "Table":
      return "table";
    case "Chart":
      return "chart";
    case "Group":
      return "group";
    case "Connector":
      return "connector";
    case "Video":
      return "video";
    case "Audio":
      return "audio";
    case "View":
      return "shape";
    default:
      return "content";
  }
}
function formatSlideLabel(slideIndex) {
  return slideIndex === void 0 ? "document" : `slide ${slideIndex + 1}`;
}
function verbPhrase(type) {
  switch (type) {
    case "added":
      return "added";
    case "removed":
      return "removed";
    case "moved":
      return "moved";
    default:
      return "changed";
  }
}
function annotateChartData(chartData) {
  if (!chartData) {
    return;
  }
  if (Array.isArray(chartData.series)) {
    for (const entry of chartData.series) {
      const record = asRecord(entry);
      if (record && typeof record.name === "string") {
        record.__diffKey = createDiffKey("chart-series", record.name);
      }
    }
  }
  const visitCategories = (items) => {
    for (const item of items) {
      const record = asRecord(item);
      if (!record || typeof record.name !== "string") {
        continue;
      }
      record.__diffKey = createDiffKey("chart-category", record.name);
      if (Array.isArray(record.children)) {
        visitCategories(record.children);
      }
    }
  };
  if (Array.isArray(chartData.categories)) {
    visitCategories(chartData.categories);
  }
}
function annotateNode(node) {
  const record = node;
  const placeholder = asRecord(record.placeholder);
  const placeholderType = typeof placeholder?.type === "string" ? placeholder.type : void 0;
  const placeholderIndex = typeof placeholder?.idx === "number" ? placeholder.idx : void 0;
  const morphId = typeof record.morphId === "string" ? record.morphId : void 0;
  const diffKey = morphId ? createDiffKey(node.type, "morph", morphId) : createDiffKey(node.type, "placeholder", placeholderIndex ?? placeholderType);
  if (diffKey) {
    record.__diffKey = diffKey;
  }
  if (node.type === "View" && node.children) {
    node.children.forEach(annotateNode);
  }
  if (node.type === "Group") {
    node.children.forEach(annotateNode);
  }
  if (node.type === "Chart") {
    annotateChartData(node.chartData);
  }
}
function normalizePaperDocument(document) {
  const parsed = PaperDocumentSchema.parse(document);
  parsed.slides.forEach((slide) => {
    slide.children.forEach(annotateNode);
    slide.comments?.forEach((comment, index) => {
      const record = comment;
      const author = typeof record.author === "string" ? record.author : void 0;
      record.__diffKey = createDiffKey("comment", author, index);
    });
  });
  parsed.masters?.forEach((master) => {
    master.__diffKey = createDiffKey("master", master.name);
    master.layouts.forEach((layout) => {
      layout.__diffKey = createDiffKey("layout", master.name, layout.name);
    });
  });
  parsed.sections?.forEach((section) => {
    section.__diffKey = createDiffKey("section", section.name);
  });
  parsed.customShows?.forEach((show) => {
    show.__diffKey = createDiffKey("custom-show", show.name);
  });
  parsed.customProperties?.forEach((property) => {
    property.__diffKey = createDiffKey("custom-property", property.name);
  });
  parsed.embeddedFonts?.forEach((font) => {
    font.__diffKey = createDiffKey("font", font.fontFamily, font.bold ? "bold" : "", font.italic ? "italic" : "");
  });
  return parsed;
}
function interpretTopLevel(context) {
  if (context.path[0] === "slides" && typeof context.path[1] === "number" && context.path.length === 2) {
    const slideNumber = context.path[1] + 1;
    return {
      description: `Slide ${slideNumber} ${verbPhrase(context.type)}`,
      severity: "major",
      summaryLabel: `slide ${context.type === "modified" ? "modified" : context.type}`
    };
  }
  if (context.path[0] === "template") {
    return {
      description: "Presentation template changed",
      severity: "major",
      summaryLabel: "template modified"
    };
  }
  if (context.path[0] === "masters") {
    return {
      description: "Slide master configuration changed",
      severity: "major",
      summaryLabel: "master modified"
    };
  }
  if (context.path[0] === "theme") {
    return {
      description: "Presentation theme changed",
      severity: "cosmetic",
      summaryLabel: "theme modified"
    };
  }
  if (context.path[0] === "slideSize" || context.path[0] === "notesSize") {
    return {
      description: `${String(context.path[0])} changed`,
      severity: "major",
      summaryLabel: "layout modified"
    };
  }
  return void 0;
}
function interpretPaperChange(context) {
  const topLevel = interpretTopLevel(context);
  if (topLevel) {
    return topLevel;
  }
  const slideIndex = firstNumericAfter(context.path, "slides");
  const slideLabel = formatSlideLabel(slideIndex);
  if (slideIndex !== void 0 && pathIncludes(context.path, "notes")) {
    return {
      description: `Speaker notes changed on ${slideLabel}`,
      severity: "minor",
      summaryLabel: "notes modified"
    };
  }
  if (slideIndex !== void 0 && pathIncludes(context.path, "comments")) {
    return {
      description: `Comments changed on ${slideLabel}`,
      severity: "minor",
      summaryLabel: "comment modified"
    };
  }
  if (slideIndex !== void 0 && pathIncludes(context.path, "layoutName")) {
    return {
      description: `Layout changed on ${slideLabel}`,
      severity: "major",
      summaryLabel: "layout modified"
    };
  }
  if (slideIndex !== void 0 && pathIncludes(context.path, "masterName")) {
    return {
      description: `Master changed on ${slideLabel}`,
      severity: "major",
      summaryLabel: "master modified"
    };
  }
  if (slideIndex !== void 0 && pathIncludes(context.path, "background")) {
    return {
      description: `Background changed on ${slideLabel}`,
      severity: "cosmetic",
      summaryLabel: "background modified"
    };
  }
  if (slideIndex !== void 0 && pathIncludes(context.path, "transition")) {
    return {
      description: `Transition changed on ${slideLabel}`,
      severity: "minor",
      summaryLabel: "transition modified"
    };
  }
  if (slideIndex !== void 0 && pathIncludes(context.path, "tableData") && pathIncludes(context.path, "rows")) {
    const rowIndex = firstNumericAfter(context.path, "rows");
    const cellIndex = firstNumericAfter(context.path, "cells");
    if (rowIndex !== void 0 && cellIndex !== void 0) {
      return {
        description: `Table cell changed on ${slideLabel}`,
        severity: "minor",
        summaryLabel: "table cell modified"
      };
    }
    if (rowIndex !== void 0) {
      return {
        description: `Table row ${rowIndex + 1} ${verbPhrase(context.type)} on ${slideLabel}`,
        severity: context.type === "modified" ? "minor" : "major",
        summaryLabel: `table row ${context.type === "modified" ? "modified" : context.type}`
      };
    }
  }
  if (slideIndex !== void 0 && pathIncludes(context.path, "chartData")) {
    return {
      description: `Chart data changed on ${slideLabel}`,
      severity: "minor",
      summaryLabel: "chart modified"
    };
  }
  const nearestNode = findNearestNode(context);
  if (slideIndex !== void 0 && nearestNode) {
    const noun = nodeNoun(nearestNode.node);
    if (nearestNode.path.length === context.path.length && context.type !== "modified") {
      return {
        description: `${capitalize(noun)} ${verbPhrase(context.type)} on ${slideLabel}`,
        severity: "major",
        summaryLabel: `${noun} ${context.type}`
      };
    }
    if (noun === "text") {
      return {
        description: `Text changed on ${slideLabel}`,
        severity: "minor",
        summaryLabel: "text modified"
      };
    }
    return {
      description: `${capitalize(noun)} changed on ${slideLabel}`,
      severity: noun === "image" ? "major" : "minor",
      summaryLabel: `${noun} modified`
    };
  }
  return {
    description: `${context.pathString} ${verbPhrase(context.type)}`,
    severity: context.type === "modified" ? "minor" : "major",
    summaryLabel: `document ${context.type === "modified" ? "modified" : context.type}`
  };
}
var paperDiffPlugin = {
  normalize: normalizePaperDocument,
  interpretChange: interpretPaperChange
};
function diffDocuments2(before, after, options) {
  return diffDocuments(before, after, paperDiffPlugin, options);
}

// src/quality/desktopValidationRecord.ts
import { createHash } from "node:crypto";
function computeDesktopValidationContentHash(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
function recordStatusToSummaryStatus(record) {
  if (record.status === "passed") return "passed";
  if (record.status === "queued" || record.status === "running") return "not_run";
  return "failed";
}
function buildDefaultChecks(record) {
  return [
    {
      id: "desktop.open",
      passed: record.opened,
      severity: record.opened ? "info" : "error",
      message: record.opened ? "Desktop worker opened the generated deck." : "Desktop worker could not open the generated deck."
    },
    {
      id: "desktop.repair_dialog",
      passed: !record.repairDialogDetected,
      severity: record.repairDialogDetected ? "error" : "info",
      message: record.repairDialogDetected ? "Desktop worker detected a presentation repair dialog." : "Desktop worker did not detect a presentation repair dialog."
    },
    {
      id: "desktop.pdf_export",
      passed: record.pdfExport.succeeded,
      severity: record.pdfExport.succeeded ? "info" : "error",
      message: record.pdfExport.succeeded ? "Desktop worker exported the generated deck to PDF." : "Desktop worker failed to export the generated deck to PDF."
    },
    {
      id: "desktop.save_copy_roundtrip",
      passed: record.savedCopy.succeeded && record.savedCopy.normalizedPackageDiffPassed !== false,
      severity: record.savedCopy.succeeded && record.savedCopy.normalizedPackageDiffPassed !== false ? "info" : "error",
      message: record.savedCopy.succeeded && record.savedCopy.normalizedPackageDiffPassed !== false ? "Desktop worker saved a copy without normalized package regressions." : "Desktop worker failed the save-copy round-trip check."
    }
  ];
}
function desktopValidationRecordToSummary(record, options) {
  const checks = record.checks.length > 0 ? record.checks : buildDefaultChecks(record);
  return {
    status: recordStatusToSummaryStatus(record),
    available: record.status !== "unavailable",
    backend: record.backend,
    platform: record.platform,
    checks,
    failureCount: checks.filter((check) => !check.passed).length,
    details: record.details.length > 0 ? record.details : void 0,
    artifactPaths: {
      pdfPath: record.pdfExport.artifactPath ?? record.artifactPaths.pdfPath,
      savedCopyPath: record.savedCopy.artifactPath ?? record.artifactPaths.savedCopyPath,
      screenshotPath: record.artifactPaths.screenshotPath
    },
    recordUrl: options?.recordUrl,
    recordedAt: record.completedAt ?? record.requestedAt
  };
}

// src/quality/editabilityProbe.ts
var import_jszip2 = __toESM(require_lib(), 1);
function countMatches(xml, pattern) {
  return Array.from(xml.matchAll(pattern)).length;
}
function component(slideIndex, kind, count, native) {
  if (count <= 0) return [];
  return [{ slideIndex, kind, count, native }];
}
function inspectSlideXml(slideIndex, xml) {
  const nativeChartCount = countMatches(xml, /<c:chart\b/g);
  const nativeTableCount = countMatches(xml, /<a:tbl\b/g);
  const nativeBulletParagraphCount = countMatches(xml, /<a:(?:buChar|buAutoNum|buBlip)\b/g);
  const nativeConnectorCount = countMatches(xml, /<p:cxnSp\b/g);
  const presetGeometryCount = countMatches(xml, /<a:prstGeom\b/g);
  const pictureCount = countMatches(xml, /<p:pic\b/g);
  const components = [
    ...component(slideIndex, "native_chart", nativeChartCount, true),
    ...component(slideIndex, "native_table", nativeTableCount, true),
    ...component(slideIndex, "native_bullet_paragraph", nativeBulletParagraphCount, true),
    ...component(slideIndex, "native_connector", nativeConnectorCount, true),
    ...component(slideIndex, "preset_geometry", presetGeometryCount, true),
    ...component(slideIndex, "picture", pictureCount, false)
  ];
  return {
    slideIndex,
    nativeChartCount,
    nativeTableCount,
    nativeBulletParagraphCount,
    nativeConnectorCount,
    presetGeometryCount,
    pictureCount,
    components
  };
}
async function inspectPptxEditability(buffer) {
  const zip = await import_jszip2.default.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a, b) => {
    const aIdx = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
    const bIdx = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
    return aIdx - bIdx;
  });
  const slides = [];
  const failures = [];
  for (const path of slidePaths) {
    const slideIndex = Number(path.match(/slide(\d+)\.xml$/)?.[1] ?? slides.length + 1) - 1;
    const entry = zip.file(path);
    if (!entry) {
      failures.push(`Missing slide XML at ${path}.`);
      continue;
    }
    slides.push(inspectSlideXml(slideIndex, await entry.async("string")));
  }
  const nativeComponentCount = slides.reduce((sum, slide) => sum + slide.nativeChartCount + slide.nativeTableCount + slide.nativeBulletParagraphCount + slide.nativeConnectorCount + slide.presetGeometryCount, 0);
  const visualOnlyComponentCount = slides.reduce((sum, slide) => sum + slide.pictureCount, 0);
  return {
    status: failures.length === 0 ? "passed" : "failed",
    slideCount: slidePaths.length,
    nativeComponentCount,
    visualOnlyComponentCount,
    slides,
    failures
  };
}
function mergeEditabilityProbeIntoQualityReport(report, editabilityProbe) {
  return {
    ...report,
    editabilityProbe
  };
}

// src/quality/chartInventory.ts
var import_jszip3 = __toESM(require_lib(), 1);
var CLASSIC_CHART_TAGS = [
  { tag: "areaChart", kind: "area" },
  { tag: "barChart", kind: "bar" },
  { tag: "bubbleChart", kind: "bubble" },
  { tag: "doughnutChart", kind: "doughnut" },
  { tag: "lineChart", kind: "line" },
  { tag: "pieChart", kind: "pie" },
  { tag: "radarChart", kind: "radar" },
  { tag: "scatterChart", kind: "scatter" },
  { tag: "stockChart", kind: "stock" },
  { tag: "surfaceChart", kind: "surface" }
];
function normalizeZipPath(basePath, target) {
  if (!target) return target;
  const baseParts = basePath.split("/").slice(0, -1);
  const targetParts = target.replace(/^\/+/, "").split("/");
  const parts = target.startsWith("/") ? targetParts : [...baseParts, ...targetParts];
  const normalized = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }
  return normalized.join("/");
}
function extractRelationshipTargets(xml) {
  const targets = [];
  const relationshipPattern = /<Relationship\b[^>]*Target="([^"]+)"[^>]*>/g;
  let match;
  while ((match = relationshipPattern.exec(xml)) !== null) {
    const target = match[1]?.trim();
    if (target) targets.push(target);
  }
  return targets;
}
function extractChartTargets(relsXml) {
  const targets = [];
  const relationshipPattern = /<Relationship\b[^>]*Type="[^"]*\/chart[^"]*"[^>]*Target="([^"]+)"[^>]*>/g;
  let match;
  while ((match = relationshipPattern.exec(relsXml)) !== null) {
    const target = match[1]?.trim();
    if (target) targets.push(target);
  }
  return targets;
}
function detectChartKind(xml, chartPart) {
  if (/<cx:chart\b|<cx:chartData\b/.test(xml) || /chartEx\d+\.xml$/i.test(chartPart)) {
    const layoutId = xml.match(/layoutId="([^"]+)"/)?.[1];
    return {
      family: "chartex",
      kind: layoutId?.trim() || "chartex"
    };
  }
  const classicMatches = CLASSIC_CHART_TAGS.filter(({ tag }) => xml.includes(`<c:${tag}`)).map(({ kind }) => kind);
  if (classicMatches.length > 1) {
    return { family: "classic", kind: "combo" };
  }
  if (classicMatches.length === 1) {
    return { family: "classic", kind: classicMatches[0] ?? "classic" };
  }
  return { family: "unknown", kind: "unknown" };
}
function toEditabilitySupport(family) {
  return family === "classic" ? "supported" : "unsupported";
}
async function inspectChartInventory(buffer) {
  const zip = await import_jszip3.default.loadAsync(buffer);
  const files = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir);
  const slideRels = files.filter((path) => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(path)).sort((a, b) => a.localeCompare(b, void 0, { numeric: true }));
  const items = [];
  for (const relsPath of slideRels) {
    const relsXml = await zip.file(relsPath)?.async("string");
    if (!relsXml) continue;
    const slideIndexMatch = relsPath.match(/slide(\d+)\.xml\.rels$/);
    const slideIndex = slideIndexMatch ? Number(slideIndexMatch[1]) - 1 : items.length;
    for (const target of extractChartTargets(relsXml)) {
      const chartPart = normalizeZipPath(relsPath, target);
      const chartXml = await zip.file(chartPart)?.async("string");
      if (!chartXml) continue;
      const chartRelsPath = `${chartPart.replace(/\.xml$/i, ".xml.rels").replace("/charts/", "/charts/_rels/")}`;
      const chartRelsXml = await zip.file(chartRelsPath)?.async("string");
      const workbookPaths = (chartRelsXml ? extractRelationshipTargets(chartRelsXml) : []).map((workbookTarget) => normalizeZipPath(chartRelsPath, workbookTarget)).filter((workbookPath) => workbookPath.endsWith(".xlsx") || workbookPath.includes("/embeddings/"));
      const kind = detectChartKind(chartXml, chartPart);
      items.push({
        slideIndex,
        chartPart,
        family: kind.family,
        kind: kind.kind,
        embeddedWorkbook: workbookPaths.some((workbookPath) => files.includes(workbookPath)),
        workbookPaths,
        editabilitySupport: toEditabilitySupport(kind.family)
      });
    }
  }
  const supportedCount = items.filter((item) => item.editabilitySupport === "supported").length;
  const unsupportedCount = items.length - supportedCount;
  return {
    hasCharts: items.length > 0,
    totalCount: items.length,
    supportedCount,
    unsupportedCount,
    items
  };
}

export {
  diffNormalizedPackages,
  diffDocuments2 as diffDocuments,
  computeDesktopValidationContentHash,
  desktopValidationRecordToSummary,
  inspectPptxEditability,
  mergeEditabilityProbeIntoQualityReport,
  inspectChartInventory
};
//# sourceMappingURL=chunk-BM2OZOTI.js.map
