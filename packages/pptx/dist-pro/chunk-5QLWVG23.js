import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  getCachedShapedRuns,
  knuthPlassLineBreak,
  precomputeShapedSegments
} from "./chunk-DX2BYFTQ.js";
import {
  isSubstitutedFont,
  resolveLineHeightPixels
} from "./chunk-IQGCGBYO.js";
import {
  DEFAULT_SLIDE_HEIGHT_PX,
  DEFAULT_SLIDE_WIDTH_PX
} from "./chunk-XU7YQ73E.js";
import {
  getLogger
} from "./chunk-MV7M6AY2.js";

// ../../node_modules/.pnpm/yoga-wasm-web@0.3.3/node_modules/yoga-wasm-web/dist/wrapAsm-f766f97f.js
var YGEnums = {};
var ALIGN_AUTO = YGEnums.ALIGN_AUTO = 0;
var ALIGN_FLEX_START = YGEnums.ALIGN_FLEX_START = 1;
var ALIGN_CENTER = YGEnums.ALIGN_CENTER = 2;
var ALIGN_FLEX_END = YGEnums.ALIGN_FLEX_END = 3;
var ALIGN_STRETCH = YGEnums.ALIGN_STRETCH = 4;
var ALIGN_BASELINE = YGEnums.ALIGN_BASELINE = 5;
var ALIGN_SPACE_BETWEEN = YGEnums.ALIGN_SPACE_BETWEEN = 6;
var ALIGN_SPACE_AROUND = YGEnums.ALIGN_SPACE_AROUND = 7;
var DIMENSION_WIDTH = YGEnums.DIMENSION_WIDTH = 0;
var DIMENSION_HEIGHT = YGEnums.DIMENSION_HEIGHT = 1;
var DIRECTION_INHERIT = YGEnums.DIRECTION_INHERIT = 0;
var DIRECTION_LTR = YGEnums.DIRECTION_LTR = 1;
var DIRECTION_RTL = YGEnums.DIRECTION_RTL = 2;
var DISPLAY_FLEX = YGEnums.DISPLAY_FLEX = 0;
var DISPLAY_NONE = YGEnums.DISPLAY_NONE = 1;
var EDGE_LEFT = YGEnums.EDGE_LEFT = 0;
var EDGE_TOP = YGEnums.EDGE_TOP = 1;
var EDGE_RIGHT = YGEnums.EDGE_RIGHT = 2;
var EDGE_BOTTOM = YGEnums.EDGE_BOTTOM = 3;
var EDGE_START = YGEnums.EDGE_START = 4;
var EDGE_END = YGEnums.EDGE_END = 5;
var EDGE_HORIZONTAL = YGEnums.EDGE_HORIZONTAL = 6;
var EDGE_VERTICAL = YGEnums.EDGE_VERTICAL = 7;
var EDGE_ALL = YGEnums.EDGE_ALL = 8;
var EXPERIMENTAL_FEATURE_WEB_FLEX_BASIS = YGEnums.EXPERIMENTAL_FEATURE_WEB_FLEX_BASIS = 0;
var EXPERIMENTAL_FEATURE_ABSOLUTE_PERCENTAGE_AGAINST_PADDING_EDGE = YGEnums.EXPERIMENTAL_FEATURE_ABSOLUTE_PERCENTAGE_AGAINST_PADDING_EDGE = 1;
var EXPERIMENTAL_FEATURE_FIX_ABSOLUTE_TRAILING_COLUMN_MARGIN = YGEnums.EXPERIMENTAL_FEATURE_FIX_ABSOLUTE_TRAILING_COLUMN_MARGIN = 2;
var FLEX_DIRECTION_COLUMN = YGEnums.FLEX_DIRECTION_COLUMN = 0;
var FLEX_DIRECTION_COLUMN_REVERSE = YGEnums.FLEX_DIRECTION_COLUMN_REVERSE = 1;
var FLEX_DIRECTION_ROW = YGEnums.FLEX_DIRECTION_ROW = 2;
var FLEX_DIRECTION_ROW_REVERSE = YGEnums.FLEX_DIRECTION_ROW_REVERSE = 3;
var GUTTER_COLUMN = YGEnums.GUTTER_COLUMN = 0;
var GUTTER_ROW = YGEnums.GUTTER_ROW = 1;
var GUTTER_ALL = YGEnums.GUTTER_ALL = 2;
var JUSTIFY_FLEX_START = YGEnums.JUSTIFY_FLEX_START = 0;
var JUSTIFY_CENTER = YGEnums.JUSTIFY_CENTER = 1;
var JUSTIFY_FLEX_END = YGEnums.JUSTIFY_FLEX_END = 2;
var JUSTIFY_SPACE_BETWEEN = YGEnums.JUSTIFY_SPACE_BETWEEN = 3;
var JUSTIFY_SPACE_AROUND = YGEnums.JUSTIFY_SPACE_AROUND = 4;
var JUSTIFY_SPACE_EVENLY = YGEnums.JUSTIFY_SPACE_EVENLY = 5;
var LOG_LEVEL_ERROR = YGEnums.LOG_LEVEL_ERROR = 0;
var LOG_LEVEL_WARN = YGEnums.LOG_LEVEL_WARN = 1;
var LOG_LEVEL_INFO = YGEnums.LOG_LEVEL_INFO = 2;
var LOG_LEVEL_DEBUG = YGEnums.LOG_LEVEL_DEBUG = 3;
var LOG_LEVEL_VERBOSE = YGEnums.LOG_LEVEL_VERBOSE = 4;
var LOG_LEVEL_FATAL = YGEnums.LOG_LEVEL_FATAL = 5;
var MEASURE_MODE_UNDEFINED = YGEnums.MEASURE_MODE_UNDEFINED = 0;
var MEASURE_MODE_EXACTLY = YGEnums.MEASURE_MODE_EXACTLY = 1;
var MEASURE_MODE_AT_MOST = YGEnums.MEASURE_MODE_AT_MOST = 2;
var NODE_TYPE_DEFAULT = YGEnums.NODE_TYPE_DEFAULT = 0;
var NODE_TYPE_TEXT = YGEnums.NODE_TYPE_TEXT = 1;
var OVERFLOW_VISIBLE = YGEnums.OVERFLOW_VISIBLE = 0;
var OVERFLOW_HIDDEN = YGEnums.OVERFLOW_HIDDEN = 1;
var OVERFLOW_SCROLL = YGEnums.OVERFLOW_SCROLL = 2;
var POSITION_TYPE_STATIC = YGEnums.POSITION_TYPE_STATIC = 0;
var POSITION_TYPE_RELATIVE = YGEnums.POSITION_TYPE_RELATIVE = 1;
var POSITION_TYPE_ABSOLUTE = YGEnums.POSITION_TYPE_ABSOLUTE = 2;
var PRINT_OPTIONS_LAYOUT = YGEnums.PRINT_OPTIONS_LAYOUT = 1;
var PRINT_OPTIONS_STYLE = YGEnums.PRINT_OPTIONS_STYLE = 2;
var PRINT_OPTIONS_CHILDREN = YGEnums.PRINT_OPTIONS_CHILDREN = 4;
var UNIT_UNDEFINED = YGEnums.UNIT_UNDEFINED = 0;
var UNIT_POINT = YGEnums.UNIT_POINT = 1;
var UNIT_PERCENT = YGEnums.UNIT_PERCENT = 2;
var UNIT_AUTO = YGEnums.UNIT_AUTO = 3;
var WRAP_NO_WRAP = YGEnums.WRAP_NO_WRAP = 0;
var WRAP_WRAP = YGEnums.WRAP_WRAP = 1;
var WRAP_WRAP_REVERSE = YGEnums.WRAP_WRAP_REVERSE = 2;
var wrapAsm = (E) => {
  function _(E2, _2, T2) {
    let N2 = E2[_2];
    E2[_2] = function(...E3) {
      return T2.call(this, N2, ...E3);
    };
  }
  for (let T2 of ["setPosition", "setMargin", "setFlexBasis", "setWidth", "setHeight", "setMinWidth", "setMinHeight", "setMaxWidth", "setMaxHeight", "setPadding"]) {
    let N2 = { [YGEnums.UNIT_POINT]: E.Node.prototype[T2], [YGEnums.UNIT_PERCENT]: E.Node.prototype[`${T2}Percent`], [YGEnums.UNIT_AUTO]: E.Node.prototype[`${T2}Auto`] };
    _(E.Node.prototype, T2, function(E2, ..._2) {
      let I, L;
      let O = _2.pop();
      if ("auto" === O) I = YGEnums.UNIT_AUTO, L = void 0;
      else if ("object" == typeof O) I = O.unit, L = O.valueOf();
      else if (I = "string" == typeof O && O.endsWith("%") ? YGEnums.UNIT_PERCENT : YGEnums.UNIT_POINT, L = parseFloat(O), !Number.isNaN(O) && Number.isNaN(L)) throw Error(`Invalid value ${O} for ${T2}`);
      if (!N2[I]) throw Error(`Failed to execute "${T2}": Unsupported unit '${O}'`);
      return void 0 !== L ? N2[I].call(this, ..._2, L) : N2[I].call(this, ..._2);
    });
  }
  function T(_2) {
    return E.MeasureCallback.implement({ measure: (...E2) => {
      let { width: T2, height: N2 } = _2(...E2);
      return { width: T2 ?? NaN, height: N2 ?? NaN };
    } });
  }
  function N(_2) {
    return E.DirtiedCallback.implement({ dirtied: _2 });
  }
  return _(E.Node.prototype, "setMeasureFunc", function(E2, _2) {
    return _2 ? E2.call(this, T(_2)) : this.unsetMeasureFunc();
  }), _(E.Node.prototype, "setDirtiedFunc", function(E2, _2) {
    E2.call(this, N(_2));
  }), _(E.Config.prototype, "free", function() {
    E.Config.destroy(this);
  }), _(E.Node, "create", (_2, T2) => T2 ? E.Node.createWithConfig(T2) : E.Node.createDefault()), _(E.Node.prototype, "free", function() {
    E.Node.destroy(this);
  }), _(E.Node.prototype, "freeRecursive", function() {
    for (let E2 = 0, _2 = this.getChildCount(); E2 < _2; ++E2) this.getChild(0).freeRecursive();
    this.free();
  }), _(E.Node.prototype, "calculateLayout", function(E2, _2 = NaN, T2 = NaN, N2 = YGEnums.DIRECTION_LTR) {
    return E2.call(this, _2, T2, N2);
  }), { Config: E.Config, Node: E.Node, ...YGEnums };
};

// ../../node_modules/.pnpm/yoga-wasm-web@0.3.3/node_modules/yoga-wasm-web/dist/index.js
var yoga = (() => {
  var n = "undefined" != typeof document && document.currentScript ? document.currentScript.src : void 0;
  return function(t = {}) {
    u || (u = void 0 !== t ? t : {}), u.ready = new Promise(function(n2, t2) {
      c = n2, f = t2;
    });
    var r, e, a = Object.assign({}, u), i = "";
    "undefined" != typeof document && document.currentScript && (i = document.currentScript.src), n && (i = n), i = 0 !== i.indexOf("blob:") ? i.substr(0, i.replace(/[?#].*/, "").lastIndexOf("/") + 1) : "";
    var o = console.log.bind(console), s = console.warn.bind(console);
    Object.assign(u, a), a = null, "object" != typeof WebAssembly && w("no native wasm support detected");
    var u, c, f, l, h = false;
    function p(n2, t2, r2) {
      r2 = t2 + r2;
      for (var e2 = ""; !(t2 >= r2); ) {
        var a2 = n2[t2++];
        if (!a2) break;
        if (128 & a2) {
          var i2 = 63 & n2[t2++];
          if (192 == (224 & a2)) e2 += String.fromCharCode((31 & a2) << 6 | i2);
          else {
            var o2 = 63 & n2[t2++];
            65536 > (a2 = 224 == (240 & a2) ? (15 & a2) << 12 | i2 << 6 | o2 : (7 & a2) << 18 | i2 << 12 | o2 << 6 | 63 & n2[t2++]) ? e2 += String.fromCharCode(a2) : (a2 -= 65536, e2 += String.fromCharCode(55296 | a2 >> 10, 56320 | 1023 & a2));
          }
        } else e2 += String.fromCharCode(a2);
      }
      return e2;
    }
    function v() {
      var n2 = l.buffer;
      u.HEAP8 = d = new Int8Array(n2), u.HEAP16 = m = new Int16Array(n2), u.HEAP32 = g = new Int32Array(n2), u.HEAPU8 = y = new Uint8Array(n2), u.HEAPU16 = E = new Uint16Array(n2), u.HEAPU32 = _ = new Uint32Array(n2), u.HEAPF32 = T = new Float32Array(n2), u.HEAPF64 = L = new Float64Array(n2);
    }
    var d, y, m, E, g, _, T, L, A, O = [], P = [], b = [], N = 0, I = null;
    function w(n2) {
      throw s(n2 = "Aborted(" + n2 + ")"), h = true, f(n2 = new WebAssembly.RuntimeError(n2 + ". Build with -sASSERTIONS for more info.")), n2;
    }
    function S() {
      return r.startsWith("data:application/octet-stream;base64,");
    }
    function R() {
      try {
        throw "both async and sync fetching of the wasm failed";
      } catch (n2) {
        w(n2);
      }
    }
    function C(n2) {
      for (; 0 < n2.length; ) n2.shift()(u);
    }
    function W(n2) {
      if (void 0 === n2) return "_unknown";
      var t2 = (n2 = n2.replace(/[^a-zA-Z0-9_]/g, "$")).charCodeAt(0);
      return 48 <= t2 && 57 >= t2 ? "_" + n2 : n2;
    }
    function U(n2, t2) {
      return n2 = W(n2), function() {
        return t2.apply(this, arguments);
      };
    }
    r = "yoga.wasm", S() || (r = i + r);
    var M = [{}, { value: void 0 }, { value: null }, { value: true }, { value: false }], F = [];
    function D(n2) {
      var t2 = Error, r2 = U(n2, function(t3) {
        this.name = n2, this.message = t3, void 0 !== (t3 = Error(t3).stack) && (this.stack = this.toString() + "\n" + t3.replace(/^Error(:[^\n]*)?\n/, ""));
      });
      return r2.prototype = Object.create(t2.prototype), r2.prototype.constructor = r2, r2.prototype.toString = function() {
        return void 0 === this.message ? this.name : this.name + ": " + this.message;
      }, r2;
    }
    var k = void 0;
    function V(n2) {
      throw new k(n2);
    }
    var j = (n2) => (n2 || V("Cannot use deleted val. handle = " + n2), M[n2].value), G = (n2) => {
      switch (n2) {
        case void 0:
          return 1;
        case null:
          return 2;
        case true:
          return 3;
        case false:
          return 4;
        default:
          var t2 = F.length ? F.pop() : M.length;
          return M[t2] = { fa: 1, value: n2 }, t2;
      }
    }, Y = void 0, X = void 0;
    function B(n2) {
      for (var t2 = ""; y[n2]; ) t2 += X[y[n2++]];
      return t2;
    }
    var H = [];
    function x() {
      for (; H.length; ) {
        var n2 = H.pop();
        n2.L.Z = false, n2.delete();
      }
    }
    var z = void 0, $ = {};
    function Z(n2, t2) {
      for (void 0 === t2 && V("ptr should not be undefined"); n2.P; ) t2 = n2.aa(t2), n2 = n2.P;
      return t2;
    }
    var J = {};
    function q(n2) {
      var t2 = B(n2 = nz(n2));
      return nZ(n2), t2;
    }
    function K(n2, t2) {
      var r2 = J[n2];
      return void 0 === r2 && V(t2 + " has unknown type " + q(n2)), r2;
    }
    function Q() {
    }
    var nn = false;
    function nt(n2) {
      --n2.count.value, 0 === n2.count.value && (n2.S ? n2.T.V(n2.S) : n2.O.M.V(n2.N));
    }
    var nr = {}, ne = void 0;
    function na(n2) {
      throw new ne(n2);
    }
    function ni(n2, t2) {
      return t2.O && t2.N || na("makeClassHandle requires ptr and ptrType"), !!t2.T != !!t2.S && na("Both smartPtrType and smartPtr must be specified"), t2.count = { value: 1 }, no(Object.create(n2, { L: { value: t2 } }));
    }
    function no(n2) {
      return "undefined" == typeof FinalizationRegistry ? (no = (n3) => n3, n2) : (nn = new FinalizationRegistry((n3) => {
        nt(n3.L);
      }), no = (n3) => {
        var t2 = n3.L;
        return t2.S && nn.register(n3, { L: t2 }, n3), n3;
      }, Q = (n3) => {
        nn.unregister(n3);
      }, no(n2));
    }
    var ns = {};
    function nu(n2) {
      for (; n2.length; ) {
        var t2 = n2.pop();
        n2.pop()(t2);
      }
    }
    function nc(n2) {
      return this.fromWireType(g[n2 >> 2]);
    }
    var nf = {}, nl = {};
    function nh(n2, t2, r2) {
      function e2(t3) {
        (t3 = r2(t3)).length !== n2.length && na("Mismatched type converter count");
        for (var e3 = 0; e3 < n2.length; ++e3) nv(n2[e3], t3[e3]);
      }
      n2.forEach(function(n3) {
        nl[n3] = t2;
      });
      var a2 = Array(t2.length), i2 = [], o2 = 0;
      t2.forEach((n3, t3) => {
        J.hasOwnProperty(n3) ? a2[t3] = J[n3] : (i2.push(n3), nf.hasOwnProperty(n3) || (nf[n3] = []), nf[n3].push(() => {
          a2[t3] = J[n3], ++o2 === i2.length && e2(a2);
        }));
      }), 0 === i2.length && e2(a2);
    }
    function np(n2) {
      switch (n2) {
        case 1:
          return 0;
        case 2:
          return 1;
        case 4:
          return 2;
        case 8:
          return 3;
        default:
          throw TypeError("Unknown type size: " + n2);
      }
    }
    function nv(n2, t2, r2 = {}) {
      if (!("argPackAdvance" in t2)) throw TypeError("registerType registeredInstance requires argPackAdvance");
      var e2 = t2.name;
      if (n2 || V('type "' + e2 + '" must have a positive integer typeid pointer'), J.hasOwnProperty(n2)) {
        if (r2.ta) return;
        V("Cannot register type '" + e2 + "' twice");
      }
      J[n2] = t2, delete nl[n2], nf.hasOwnProperty(n2) && (t2 = nf[n2], delete nf[n2], t2.forEach((n3) => n3()));
    }
    function nd(n2) {
      V(n2.L.O.M.name + " instance already deleted");
    }
    function ny() {
    }
    function nm(n2, t2, r2) {
      if (void 0 === n2[t2].R) {
        var e2 = n2[t2];
        n2[t2] = function() {
          return n2[t2].R.hasOwnProperty(arguments.length) || V("Function '" + r2 + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + n2[t2].R + ")!"), n2[t2].R[arguments.length].apply(this, arguments);
        }, n2[t2].R = [], n2[t2].R[e2.Y] = e2;
      }
    }
    function nE(n2, t2, r2, e2, a2, i2, o2, s2) {
      this.name = n2, this.constructor = t2, this.W = r2, this.V = e2, this.P = a2, this.oa = i2, this.aa = o2, this.ma = s2, this.ia = [];
    }
    function ng(n2, t2, r2) {
      for (; t2 !== r2; ) t2.aa || V("Expected null or instance of " + r2.name + ", got an instance of " + t2.name), n2 = t2.aa(n2), t2 = t2.P;
      return n2;
    }
    function n_(n2, t2) {
      return null === t2 ? (this.da && V("null is not a valid " + this.name), 0) : (t2.L || V('Cannot pass "' + nC(t2) + '" as a ' + this.name), t2.L.N || V("Cannot pass deleted object as a pointer of type " + this.name), ng(t2.L.N, t2.L.O.M, this.M));
    }
    function nT(n2, t2) {
      if (null === t2) {
        if (this.da && V("null is not a valid " + this.name), this.ca) {
          var r2 = this.ea();
          return null !== n2 && n2.push(this.V, r2), r2;
        }
        return 0;
      }
      if (t2.L || V('Cannot pass "' + nC(t2) + '" as a ' + this.name), t2.L.N || V("Cannot pass deleted object as a pointer of type " + this.name), !this.ba && t2.L.O.ba && V("Cannot convert argument of type " + (t2.L.T ? t2.L.T.name : t2.L.O.name) + " to parameter type " + this.name), r2 = ng(t2.L.N, t2.L.O.M, this.M), this.ca) switch (void 0 === t2.L.S && V("Passing raw pointer to smart pointer is illegal"), this.Aa) {
        case 0:
          t2.L.T === this ? r2 = t2.L.S : V("Cannot convert argument of type " + (t2.L.T ? t2.L.T.name : t2.L.O.name) + " to parameter type " + this.name);
          break;
        case 1:
          r2 = t2.L.S;
          break;
        case 2:
          if (t2.L.T === this) r2 = t2.L.S;
          else {
            var e2 = t2.clone();
            r2 = this.wa(r2, G(function() {
              e2.delete();
            })), null !== n2 && n2.push(this.V, r2);
          }
          break;
        default:
          V("Unsupporting sharing policy");
      }
      return r2;
    }
    function nL(n2, t2) {
      return null === t2 ? (this.da && V("null is not a valid " + this.name), 0) : (t2.L || V('Cannot pass "' + nC(t2) + '" as a ' + this.name), t2.L.N || V("Cannot pass deleted object as a pointer of type " + this.name), t2.L.O.ba && V("Cannot convert argument of type " + t2.L.O.name + " to parameter type " + this.name), ng(t2.L.N, t2.L.O.M, this.M));
    }
    function nA(n2, t2, r2, e2) {
      this.name = n2, this.M = t2, this.da = r2, this.ba = e2, this.ca = false, this.V = this.wa = this.ea = this.ja = this.Aa = this.va = void 0, void 0 !== t2.P ? this.toWireType = nT : (this.toWireType = e2 ? n_ : nL, this.U = null);
    }
    var nO = [];
    function nP(n2) {
      var t2 = nO[n2];
      return t2 || (n2 >= nO.length && (nO.length = n2 + 1), nO[n2] = t2 = A.get(n2)), t2;
    }
    function nb(n2, t2) {
      var r2, e2, a2 = (n2 = B(n2)).includes("j") ? (r2 = n2, e2 = [], function() {
        if (e2.length = 0, Object.assign(e2, arguments), r2.includes("j")) {
          var n3 = u["dynCall_" + r2];
          n3 = e2 && e2.length ? n3.apply(null, [t2].concat(e2)) : n3.call(null, t2);
        } else n3 = nP(t2).apply(null, e2);
        return n3;
      }) : nP(t2);
      return "function" != typeof a2 && V("unknown function pointer with signature " + n2 + ": " + t2), a2;
    }
    var nN = void 0;
    function nI(n2, t2) {
      var r2 = [], e2 = {};
      throw t2.forEach(function n3(t3) {
        e2[t3] || J[t3] || (nl[t3] ? nl[t3].forEach(n3) : (r2.push(t3), e2[t3] = true));
      }), new nN(n2 + ": " + r2.map(q).join([", "]));
    }
    function nw(n2, t2, r2, e2, a2) {
      var i2 = t2.length;
      2 > i2 && V("argTypes array size mismatch! Must at least get return value and 'this' types!");
      var o2 = null !== t2[1] && null !== r2, s2 = false;
      for (r2 = 1; r2 < t2.length; ++r2) if (null !== t2[r2] && void 0 === t2[r2].U) {
        s2 = true;
        break;
      }
      var u2 = "void" !== t2[0].name, c2 = i2 - 2, f2 = Array(c2), l2 = [], h2 = [];
      return function() {
        if (arguments.length !== c2 && V("function " + n2 + " called with " + arguments.length + " arguments, expected " + c2 + " args!"), h2.length = 0, l2.length = o2 ? 2 : 1, l2[0] = a2, o2) {
          var r3 = t2[1].toWireType(h2, this);
          l2[1] = r3;
        }
        for (var i3 = 0; i3 < c2; ++i3) f2[i3] = t2[i3 + 2].toWireType(h2, arguments[i3]), l2.push(f2[i3]);
        if (i3 = e2.apply(null, l2), s2) nu(h2);
        else for (var p2 = o2 ? 1 : 2; p2 < t2.length; p2++) {
          var v2 = 1 === p2 ? r3 : f2[p2 - 2];
          null !== t2[p2].U && t2[p2].U(v2);
        }
        return u2 ? t2[0].fromWireType(i3) : void 0;
      };
    }
    function nS(n2, t2) {
      for (var r2 = [], e2 = 0; e2 < n2; e2++) r2.push(_[t2 + 4 * e2 >> 2]);
      return r2;
    }
    function nR(n2) {
      4 < n2 && 0 == --M[n2].fa && (M[n2] = void 0, F.push(n2));
    }
    function nC(n2) {
      if (null === n2) return "null";
      var t2 = typeof n2;
      return "object" === t2 || "array" === t2 || "function" === t2 ? n2.toString() : "" + n2;
    }
    function nW(n2, t2) {
      for (var r2 = "", e2 = 0; !(e2 >= t2 / 2); ++e2) {
        var a2 = m[n2 + 2 * e2 >> 1];
        if (0 == a2) break;
        r2 += String.fromCharCode(a2);
      }
      return r2;
    }
    function nU(n2, t2, r2) {
      if (void 0 === r2 && (r2 = 2147483647), 2 > r2) return 0;
      r2 -= 2;
      var e2 = t2;
      r2 = r2 < 2 * n2.length ? r2 / 2 : n2.length;
      for (var a2 = 0; a2 < r2; ++a2) m[t2 >> 1] = n2.charCodeAt(a2), t2 += 2;
      return m[t2 >> 1] = 0, t2 - e2;
    }
    function nM(n2) {
      return 2 * n2.length;
    }
    function nF(n2, t2) {
      for (var r2 = 0, e2 = ""; !(r2 >= t2 / 4); ) {
        var a2 = g[n2 + 4 * r2 >> 2];
        if (0 == a2) break;
        ++r2, 65536 <= a2 ? (a2 -= 65536, e2 += String.fromCharCode(55296 | a2 >> 10, 56320 | 1023 & a2)) : e2 += String.fromCharCode(a2);
      }
      return e2;
    }
    function nD(n2, t2, r2) {
      if (void 0 === r2 && (r2 = 2147483647), 4 > r2) return 0;
      var e2 = t2;
      r2 = e2 + r2 - 4;
      for (var a2 = 0; a2 < n2.length; ++a2) {
        var i2 = n2.charCodeAt(a2);
        if (55296 <= i2 && 57343 >= i2 && (i2 = 65536 + ((1023 & i2) << 10) | 1023 & n2.charCodeAt(++a2)), g[t2 >> 2] = i2, (t2 += 4) + 4 > r2) break;
      }
      return g[t2 >> 2] = 0, t2 - e2;
    }
    function nk(n2) {
      for (var t2 = 0, r2 = 0; r2 < n2.length; ++r2) {
        var e2 = n2.charCodeAt(r2);
        55296 <= e2 && 57343 >= e2 && ++r2, t2 += 4;
      }
      return t2;
    }
    var nV = {};
    function nj(n2) {
      var t2 = nV[n2];
      return void 0 === t2 ? B(n2) : t2;
    }
    var nG = [], nY = [], nX = [null, [], []];
    k = u.BindingError = D("BindingError"), u.count_emval_handles = function() {
      for (var n2 = 0, t2 = 5; t2 < M.length; ++t2) void 0 !== M[t2] && ++n2;
      return n2;
    }, u.get_first_emval = function() {
      for (var n2 = 5; n2 < M.length; ++n2) if (void 0 !== M[n2]) return M[n2];
      return null;
    }, Y = u.PureVirtualError = D("PureVirtualError");
    for (var nB = Array(256), nH = 0; 256 > nH; ++nH) nB[nH] = String.fromCharCode(nH);
    X = nB, u.getInheritedInstanceCount = function() {
      return Object.keys($).length;
    }, u.getLiveInheritedInstances = function() {
      var n2, t2 = [];
      for (n2 in $) $.hasOwnProperty(n2) && t2.push($[n2]);
      return t2;
    }, u.flushPendingDeletes = x, u.setDelayFunction = function(n2) {
      z = n2, H.length && z && z(x);
    }, ne = u.InternalError = D("InternalError"), ny.prototype.isAliasOf = function(n2) {
      if (!(this instanceof ny && n2 instanceof ny)) return false;
      var t2 = this.L.O.M, r2 = this.L.N, e2 = n2.L.O.M;
      for (n2 = n2.L.N; t2.P; ) r2 = t2.aa(r2), t2 = t2.P;
      for (; e2.P; ) n2 = e2.aa(n2), e2 = e2.P;
      return t2 === e2 && r2 === n2;
    }, ny.prototype.clone = function() {
      if (this.L.N || nd(this), this.L.$) return this.L.count.value += 1, this;
      var n2 = no, t2 = Object, r2 = t2.create, e2 = Object.getPrototypeOf(this), a2 = this.L;
      return n2 = n2(r2.call(t2, e2, { L: { value: { count: a2.count, Z: a2.Z, $: a2.$, N: a2.N, O: a2.O, S: a2.S, T: a2.T } } })), n2.L.count.value += 1, n2.L.Z = false, n2;
    }, ny.prototype.delete = function() {
      this.L.N || nd(this), this.L.Z && !this.L.$ && V("Object already scheduled for deletion"), Q(this), nt(this.L), this.L.$ || (this.L.S = void 0, this.L.N = void 0);
    }, ny.prototype.isDeleted = function() {
      return !this.L.N;
    }, ny.prototype.deleteLater = function() {
      return this.L.N || nd(this), this.L.Z && !this.L.$ && V("Object already scheduled for deletion"), H.push(this), 1 === H.length && z && z(x), this.L.Z = true, this;
    }, nA.prototype.pa = function(n2) {
      return this.ja && (n2 = this.ja(n2)), n2;
    }, nA.prototype.ga = function(n2) {
      this.V && this.V(n2);
    }, nA.prototype.argPackAdvance = 8, nA.prototype.readValueFromPointer = nc, nA.prototype.deleteObject = function(n2) {
      null !== n2 && n2.delete();
    }, nA.prototype.fromWireType = function(n2) {
      function t2() {
        return this.ca ? ni(this.M.W, { O: this.va, N: e2, T: this, S: n2 }) : ni(this.M.W, { O: this, N: n2 });
      }
      var r2, e2 = this.pa(n2);
      if (!e2) return this.ga(n2), null;
      var a2 = $[Z(this.M, e2)];
      if (void 0 !== a2) return 0 === a2.L.count.value ? (a2.L.N = e2, a2.L.S = n2, a2.clone()) : (a2 = a2.clone(), this.ga(n2), a2);
      if (!(a2 = nr[a2 = this.M.oa(e2)])) return t2.call(this);
      a2 = this.ba ? a2.ka : a2.pointerType;
      var i2 = (function n3(t3, r3, e3) {
        return r3 === e3 ? t3 : void 0 === e3.P ? null : null === (t3 = n3(t3, r3, e3.P)) ? null : e3.ma(t3);
      })(e2, this.M, a2.M);
      return null === i2 ? t2.call(this) : this.ca ? ni(a2.M.W, { O: a2, N: i2, T: this, S: n2 }) : ni(a2.M.W, { O: a2, N: i2 });
    }, nN = u.UnboundTypeError = D("UnboundTypeError");
    var nx = { q: function(n2, t2, r2) {
      n2 = B(n2), t2 = K(t2, "wrapper"), r2 = j(r2);
      var e2 = [].slice, a2 = t2.M, i2 = a2.W, o2 = a2.P.W, s2 = a2.P.constructor;
      for (var u2 in n2 = U(n2, function() {
        a2.P.ia.forEach((function(n3) {
          if (this[n3] === o2[n3]) throw new Y("Pure virtual function " + n3 + " must be implemented in JavaScript");
        }).bind(this)), Object.defineProperty(this, "__parent", { value: i2 }), this.__construct.apply(this, e2.call(arguments));
      }), i2.__construct = function() {
        this === i2 && V("Pass correct 'this' to __construct");
        var n3 = s2.implement.apply(void 0, [this].concat(e2.call(arguments)));
        Q(n3);
        var t3 = n3.L;
        n3.notifyOnDestruction(), t3.$ = true, Object.defineProperties(this, { L: { value: t3 } }), no(this), n3 = Z(a2, n3 = t3.N), $.hasOwnProperty(n3) ? V("Tried to register registered instance: " + n3) : $[n3] = this;
      }, i2.__destruct = function() {
        this === i2 && V("Pass correct 'this' to __destruct"), Q(this);
        var n3 = this.L.N;
        n3 = Z(a2, n3), $.hasOwnProperty(n3) ? delete $[n3] : V("Tried to unregister unregistered instance: " + n3);
      }, n2.prototype = Object.create(i2), r2) n2.prototype[u2] = r2[u2];
      return G(n2);
    }, l: function(n2) {
      var t2 = ns[n2];
      delete ns[n2];
      var r2 = t2.ea, e2 = t2.V, a2 = t2.ha;
      nh([n2], a2.map((n3) => n3.sa).concat(a2.map((n3) => n3.ya)), (n3) => {
        var i2 = {};
        return a2.forEach((t3, r3) => {
          var e3 = n3[r3], o2 = t3.qa, s2 = t3.ra, u2 = n3[r3 + a2.length], c2 = t3.xa, f2 = t3.za;
          i2[t3.na] = { read: (n4) => e3.fromWireType(o2(s2, n4)), write: (n4, t4) => {
            var r4 = [];
            c2(f2, n4, u2.toWireType(r4, t4)), nu(r4);
          } };
        }), [{ name: t2.name, fromWireType: function(n4) {
          var t3, r3 = {};
          for (t3 in i2) r3[t3] = i2[t3].read(n4);
          return e2(n4), r3;
        }, toWireType: function(n4, t3) {
          for (var a3 in i2) if (!(a3 in t3)) throw TypeError('Missing field:  "' + a3 + '"');
          var o2 = r2();
          for (a3 in i2) i2[a3].write(o2, t3[a3]);
          return null !== n4 && n4.push(e2, o2), o2;
        }, argPackAdvance: 8, readValueFromPointer: nc, U: e2 }];
      });
    }, v: function() {
    }, B: function(n2, t2, r2, e2, a2) {
      var i2 = np(r2);
      nv(n2, { name: t2 = B(t2), fromWireType: function(n3) {
        return !!n3;
      }, toWireType: function(n3, t3) {
        return t3 ? e2 : a2;
      }, argPackAdvance: 8, readValueFromPointer: function(n3) {
        if (1 === r2) var e3 = d;
        else if (2 === r2) e3 = m;
        else if (4 === r2) e3 = g;
        else throw TypeError("Unknown boolean type size: " + t2);
        return this.fromWireType(e3[n3 >> i2]);
      }, U: null });
    }, h: function(n2, t2, r2, e2, a2, i2, o2, s2, c2, f2, l2, h2, p2) {
      l2 = B(l2), i2 = nb(a2, i2), s2 && (s2 = nb(o2, s2)), f2 && (f2 = nb(c2, f2)), p2 = nb(h2, p2);
      var v2, d2 = W(l2);
      v2 = function() {
        nI("Cannot construct " + l2 + " due to unbound types", [e2]);
      }, u.hasOwnProperty(d2) ? (V("Cannot register public name '" + d2 + "' twice"), nm(u, d2, d2), u.hasOwnProperty(void 0) && V("Cannot register multiple overloads of a function with the same number of arguments (undefined)!"), u[d2].R[void 0] = v2) : u[d2] = v2, nh([n2, t2, r2], e2 ? [e2] : [], function(t3) {
        if (t3 = t3[0], e2) var r3, a3 = t3.M, o3 = a3.W;
        else o3 = ny.prototype;
        t3 = U(d2, function() {
          if (Object.getPrototypeOf(this) !== c3) throw new k("Use 'new' to construct " + l2);
          if (void 0 === h3.X) throw new k(l2 + " has no accessible constructor");
          var n3 = h3.X[arguments.length];
          if (void 0 === n3) throw new k("Tried to invoke ctor of " + l2 + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(h3.X).toString() + ") parameters instead!");
          return n3.apply(this, arguments);
        });
        var c3 = Object.create(o3, { constructor: { value: t3 } });
        t3.prototype = c3;
        var h3 = new nE(l2, t3, c3, p2, a3, i2, s2, f2);
        a3 = new nA(l2, h3, true, false), o3 = new nA(l2 + "*", h3, false, false);
        var v3 = new nA(l2 + " const*", h3, false, true);
        return nr[n2] = { pointerType: o3, ka: v3 }, r3 = t3, u.hasOwnProperty(d2) || na("Replacing nonexistant public symbol"), u[d2] = r3, u[d2].Y = void 0, [a3, o3, v3];
      });
    }, d: function(n2, t2, r2, e2, a2, i2, o2) {
      var s2 = nS(r2, e2);
      t2 = B(t2), i2 = nb(a2, i2), nh([], [n2], function(n3) {
        function e3() {
          nI("Cannot call " + a3 + " due to unbound types", s2);
        }
        var a3 = (n3 = n3[0]).name + "." + t2;
        t2.startsWith("@@") && (t2 = Symbol[t2.substring(2)]);
        var u2 = n3.M.constructor;
        return void 0 === u2[t2] ? (e3.Y = r2 - 1, u2[t2] = e3) : (nm(u2, t2, a3), u2[t2].R[r2 - 1] = e3), nh([], s2, function(n4) {
          return n4 = nw(a3, [n4[0], null].concat(n4.slice(1)), null, i2, o2), void 0 === u2[t2].R ? (n4.Y = r2 - 1, u2[t2] = n4) : u2[t2].R[r2 - 1] = n4, [];
        }), [];
      });
    }, p: function(n2, t2, r2, e2, a2, i2) {
      0 < t2 || w();
      var o2 = nS(t2, r2);
      a2 = nb(e2, a2), nh([], [n2], function(n3) {
        var r3 = "constructor " + (n3 = n3[0]).name;
        if (void 0 === n3.M.X && (n3.M.X = []), void 0 !== n3.M.X[t2 - 1]) throw new k("Cannot register multiple constructors with identical number of parameters (" + (t2 - 1) + ") for class '" + n3.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
        return n3.M.X[t2 - 1] = () => {
          nI("Cannot construct " + n3.name + " due to unbound types", o2);
        }, nh([], o2, function(e3) {
          return e3.splice(1, 0, null), n3.M.X[t2 - 1] = nw(r3, e3, null, a2, i2), [];
        }), [];
      });
    }, a: function(n2, t2, r2, e2, a2, i2, o2, s2) {
      var u2 = nS(r2, e2);
      t2 = B(t2), i2 = nb(a2, i2), nh([], [n2], function(n3) {
        function e3() {
          nI("Cannot call " + a3 + " due to unbound types", u2);
        }
        var a3 = (n3 = n3[0]).name + "." + t2;
        t2.startsWith("@@") && (t2 = Symbol[t2.substring(2)]), s2 && n3.M.ia.push(t2);
        var c2 = n3.M.W, f2 = c2[t2];
        return void 0 === f2 || void 0 === f2.R && f2.className !== n3.name && f2.Y === r2 - 2 ? (e3.Y = r2 - 2, e3.className = n3.name, c2[t2] = e3) : (nm(c2, t2, a3), c2[t2].R[r2 - 2] = e3), nh([], u2, function(e4) {
          return e4 = nw(a3, e4, n3, i2, o2), void 0 === c2[t2].R ? (e4.Y = r2 - 2, c2[t2] = e4) : c2[t2].R[r2 - 2] = e4, [];
        }), [];
      });
    }, A: function(n2, t2) {
      nv(n2, { name: t2 = B(t2), fromWireType: function(n3) {
        var t3 = j(n3);
        return nR(n3), t3;
      }, toWireType: function(n3, t3) {
        return G(t3);
      }, argPackAdvance: 8, readValueFromPointer: nc, U: null });
    }, n: function(n2, t2, r2) {
      r2 = np(r2), nv(n2, { name: t2 = B(t2), fromWireType: function(n3) {
        return n3;
      }, toWireType: function(n3, t3) {
        return t3;
      }, argPackAdvance: 8, readValueFromPointer: (function(n3, t3) {
        switch (t3) {
          case 2:
            return function(n4) {
              return this.fromWireType(T[n4 >> 2]);
            };
          case 3:
            return function(n4) {
              return this.fromWireType(L[n4 >> 3]);
            };
          default:
            throw TypeError("Unknown float type: " + n3);
        }
      })(t2, r2), U: null });
    }, e: function(n2, t2, r2, e2, a2) {
      t2 = B(t2), -1 === a2 && (a2 = 4294967295), a2 = np(r2);
      var i2 = (n3) => n3;
      if (0 === e2) {
        var o2 = 32 - 8 * r2;
        i2 = (n3) => n3 << o2 >>> o2;
      }
      r2 = t2.includes("unsigned") ? function(n3, t3) {
        return t3 >>> 0;
      } : function(n3, t3) {
        return t3;
      }, nv(n2, { name: t2, fromWireType: i2, toWireType: r2, argPackAdvance: 8, readValueFromPointer: (function(n3, t3, r3) {
        switch (t3) {
          case 0:
            return r3 ? function(n4) {
              return d[n4];
            } : function(n4) {
              return y[n4];
            };
          case 1:
            return r3 ? function(n4) {
              return m[n4 >> 1];
            } : function(n4) {
              return E[n4 >> 1];
            };
          case 2:
            return r3 ? function(n4) {
              return g[n4 >> 2];
            } : function(n4) {
              return _[n4 >> 2];
            };
          default:
            throw TypeError("Unknown integer type: " + n3);
        }
      })(t2, a2, 0 !== e2), U: null });
    }, b: function(n2, t2, r2) {
      function e2(n3) {
        n3 >>= 2;
        var t3 = _;
        return new a2(t3.buffer, t3[n3 + 1], t3[n3]);
      }
      var a2 = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array][t2];
      nv(n2, { name: r2 = B(r2), fromWireType: e2, argPackAdvance: 8, readValueFromPointer: e2 }, { ta: true });
    }, o: function(n2, t2) {
      var r2 = "std::string" === (t2 = B(t2));
      nv(n2, { name: t2, fromWireType: function(n3) {
        var t3 = _[n3 >> 2], e2 = n3 + 4;
        if (r2) for (var a2 = e2, i2 = 0; i2 <= t3; ++i2) {
          var o2 = e2 + i2;
          if (i2 == t3 || 0 == y[o2]) {
            if (a2 = a2 ? p(y, a2, o2 - a2) : "", void 0 === s2) var s2 = a2;
            else s2 += "\0" + a2;
            a2 = o2 + 1;
          }
        }
        else {
          for (i2 = 0, s2 = Array(t3); i2 < t3; ++i2) s2[i2] = String.fromCharCode(y[e2 + i2]);
          s2 = s2.join("");
        }
        return nZ(n3), s2;
      }, toWireType: function(n3, t3) {
        t3 instanceof ArrayBuffer && (t3 = new Uint8Array(t3));
        var e2, a2 = "string" == typeof t3;
        if (a2 || t3 instanceof Uint8Array || t3 instanceof Uint8ClampedArray || t3 instanceof Int8Array || V("Cannot pass non-string to std::string"), r2 && a2) {
          var i2 = 0;
          for (e2 = 0; e2 < t3.length; ++e2) {
            var o2 = t3.charCodeAt(e2);
            127 >= o2 ? i2++ : 2047 >= o2 ? i2 += 2 : 55296 <= o2 && 57343 >= o2 ? (i2 += 4, ++e2) : i2 += 3;
          }
          e2 = i2;
        } else e2 = t3.length;
        if (o2 = (i2 = n$(4 + e2 + 1)) + 4, _[i2 >> 2] = e2, r2 && a2) {
          if (a2 = o2, o2 = e2 + 1, e2 = y, 0 < o2) {
            o2 = a2 + o2 - 1;
            for (var s2 = 0; s2 < t3.length; ++s2) {
              var u2 = t3.charCodeAt(s2);
              if (55296 <= u2 && 57343 >= u2 && (u2 = 65536 + ((1023 & u2) << 10) | 1023 & t3.charCodeAt(++s2)), 127 >= u2) {
                if (a2 >= o2) break;
                e2[a2++] = u2;
              } else {
                if (2047 >= u2) {
                  if (a2 + 1 >= o2) break;
                  e2[a2++] = 192 | u2 >> 6;
                } else {
                  if (65535 >= u2) {
                    if (a2 + 2 >= o2) break;
                    e2[a2++] = 224 | u2 >> 12;
                  } else {
                    if (a2 + 3 >= o2) break;
                    e2[a2++] = 240 | u2 >> 18, e2[a2++] = 128 | u2 >> 12 & 63;
                  }
                  e2[a2++] = 128 | u2 >> 6 & 63;
                }
                e2[a2++] = 128 | 63 & u2;
              }
            }
            e2[a2] = 0;
          }
        } else if (a2) for (a2 = 0; a2 < e2; ++a2) 255 < (s2 = t3.charCodeAt(a2)) && (nZ(o2), V("String has UTF-16 code units that do not fit in 8 bits")), y[o2 + a2] = s2;
        else for (a2 = 0; a2 < e2; ++a2) y[o2 + a2] = t3[a2];
        return null !== n3 && n3.push(nZ, i2), i2;
      }, argPackAdvance: 8, readValueFromPointer: nc, U: function(n3) {
        nZ(n3);
      } });
    }, k: function(n2, t2, r2) {
      if (r2 = B(r2), 2 === t2) var e2 = nW, a2 = nU, i2 = nM, o2 = () => E, s2 = 1;
      else 4 === t2 && (e2 = nF, a2 = nD, i2 = nk, o2 = () => _, s2 = 2);
      nv(n2, { name: r2, fromWireType: function(n3) {
        for (var r3, a3 = _[n3 >> 2], i3 = o2(), u2 = n3 + 4, c2 = 0; c2 <= a3; ++c2) {
          var f2 = n3 + 4 + c2 * t2;
          (c2 == a3 || 0 == i3[f2 >> s2]) && (u2 = e2(u2, f2 - u2), void 0 === r3 ? r3 = u2 : r3 += "\0" + u2, u2 = f2 + t2);
        }
        return nZ(n3), r3;
      }, toWireType: function(n3, e3) {
        "string" != typeof e3 && V("Cannot pass non-string to C++ string type " + r2);
        var o3 = i2(e3), u2 = n$(4 + o3 + t2);
        return _[u2 >> 2] = o3 >> s2, a2(e3, u2 + 4, o3 + t2), null !== n3 && n3.push(nZ, u2), u2;
      }, argPackAdvance: 8, readValueFromPointer: nc, U: function(n3) {
        nZ(n3);
      } });
    }, m: function(n2, t2, r2, e2, a2, i2) {
      ns[n2] = { name: B(t2), ea: nb(r2, e2), V: nb(a2, i2), ha: [] };
    }, c: function(n2, t2, r2, e2, a2, i2, o2, s2, u2, c2) {
      ns[n2].ha.push({ na: B(t2), sa: r2, qa: nb(e2, a2), ra: i2, ya: o2, xa: nb(s2, u2), za: c2 });
    }, C: function(n2, t2) {
      nv(n2, { ua: true, name: t2 = B(t2), argPackAdvance: 0, fromWireType: function() {
      }, toWireType: function() {
      } });
    }, t: function(n2, t2, r2, e2, a2) {
      n2 = nG[n2], t2 = j(t2), r2 = nj(r2);
      var i2 = [];
      return _[e2 >> 2] = G(i2), n2(t2, r2, i2, a2);
    }, j: function(n2, t2, r2, e2) {
      n2 = nG[n2], n2(t2 = j(t2), r2 = nj(r2), null, e2);
    }, f: nR, g: function(n2, t2) {
      var r2, e2, a2 = (function(n3, t3) {
        for (var r3 = Array(n3), e3 = 0; e3 < n3; ++e3) r3[e3] = K(_[t3 + 4 * e3 >> 2], "parameter " + e3);
        return r3;
      })(n2, t2), i2 = a2[0], o2 = nY[t2 = i2.name + "_$" + a2.slice(1).map(function(n3) {
        return n3.name;
      }).join("_") + "$"];
      if (void 0 !== o2) return o2;
      var s2 = Array(n2 - 1);
      return r2 = (t3, r3, e3, o3) => {
        for (var u2 = 0, c2 = 0; c2 < n2 - 1; ++c2) s2[c2] = a2[c2 + 1].readValueFromPointer(o3 + u2), u2 += a2[c2 + 1].argPackAdvance;
        for (c2 = 0, t3 = t3[r3].apply(t3, s2); c2 < n2 - 1; ++c2) a2[c2 + 1].la && a2[c2 + 1].la(s2[c2]);
        if (!i2.ua) return i2.toWireType(e3, t3);
      }, e2 = nG.length, nG.push(r2), o2 = e2, nY[t2] = o2;
    }, r: function(n2) {
      4 < n2 && (M[n2].fa += 1);
    }, s: function(n2) {
      nu(j(n2)), nR(n2);
    }, i: function() {
      w("");
    }, x: function(n2, t2, r2) {
      y.copyWithin(n2, t2, t2 + r2);
    }, w: function(n2) {
      var t2 = y.length;
      if (2147483648 < (n2 >>>= 0)) return false;
      for (var r2 = 1; 4 >= r2; r2 *= 2) {
        var e2 = t2 * (1 + 0.2 / r2);
        e2 = Math.min(e2, n2 + 100663296);
        var a2 = Math, i2 = a2.min;
        e2 = Math.max(n2, e2), e2 += (65536 - e2 % 65536) % 65536;
        n: {
          var o2 = l.buffer;
          try {
            l.grow(i2.call(a2, 2147483648, e2) - o2.byteLength + 65535 >>> 16), v();
            var s2 = 1;
            break n;
          } catch (n3) {
          }
          s2 = void 0;
        }
        if (s2) return true;
      }
      return false;
    }, z: function() {
      return 52;
    }, u: function() {
      return 70;
    }, y: function(n2, t2, r2, e2) {
      for (var a2 = 0, i2 = 0; i2 < r2; i2++) {
        var u2 = _[t2 >> 2], c2 = _[t2 + 4 >> 2];
        t2 += 8;
        for (var f2 = 0; f2 < c2; f2++) {
          var l2 = y[u2 + f2], h2 = nX[n2];
          0 === l2 || 10 === l2 ? ((1 === n2 ? o : s)(p(h2, 0)), h2.length = 0) : h2.push(l2);
        }
        a2 += c2;
      }
      return _[e2 >> 2] = a2, 0;
    } };
    !(function() {
      function n2(n3) {
        u.asm = n3.exports, l = u.asm.D, v(), A = u.asm.I, P.unshift(u.asm.E), 0 == --N && I && (n3 = I, I = null, n3());
      }
      function t2(t3) {
        n2(t3.instance);
      }
      function e2(n3) {
        return ("function" == typeof fetch ? fetch(r, { credentials: "same-origin" }).then(function(n4) {
          if (!n4.ok) throw "failed to load wasm binary file at '" + r + "'";
          return n4.arrayBuffer();
        }).catch(function() {
          return R();
        }) : Promise.resolve().then(function() {
          return R();
        })).then(function(n4) {
          return WebAssembly.instantiate(n4, a2);
        }).then(function(n4) {
          return n4;
        }).then(n3, function(n4) {
          s("failed to asynchronously prepare wasm: " + n4), w(n4);
        });
      }
      var a2 = { a: nx };
      if (N++, u.instantiateWasm) try {
        return u.instantiateWasm(a2, n2);
      } catch (n3) {
        s("Module.instantiateWasm callback failed with error: " + n3), f(n3);
      }
      ("function" != typeof WebAssembly.instantiateStreaming || S() || "function" != typeof fetch ? e2(t2) : fetch(r, { credentials: "same-origin" }).then(function(n3) {
        return WebAssembly.instantiateStreaming(n3, a2).then(t2, function(n4) {
          return s("wasm streaming compile failed: " + n4), s("falling back to ArrayBuffer instantiation"), e2(t2);
        });
      })).catch(f);
    })();
    var nz = u.___getTypeName = function() {
      return (nz = u.___getTypeName = u.asm.F).apply(null, arguments);
    };
    function n$() {
      return (n$ = u.asm.H).apply(null, arguments);
    }
    function nZ() {
      return (nZ = u.asm.J).apply(null, arguments);
    }
    function nJ() {
      0 < N || (C(O), 0 < N || e || (e = true, u.calledRun = true, h || (C(P), c(u), C(b))));
    }
    return u.__embind_initialize_bindings = function() {
      return (u.__embind_initialize_bindings = u.asm.G).apply(null, arguments);
    }, u.dynCall_jiji = function() {
      return (u.dynCall_jiji = u.asm.K).apply(null, arguments);
    }, I = function n2() {
      e || nJ(), e || (I = n2);
    }, nJ(), t.ready;
  };
})();
async function initYoga(t) {
  let r = await yoga({ instantiateWasm(n, r2) {
    WebAssembly.instantiate(t, n).then((n2) => {
      n2 instanceof WebAssembly.Instance ? r2(n2) : r2(n2.instance);
    });
  } });
  return wrapAsm(r);
}

// src/layout/yoga.ts
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// src/normalizer.ts
function normalizeStyle(style) {
  const {
    padding,
    margin,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    ...base
  } = style;
  const result = { ...base };
  if (padding !== void 0) {
    result.paddingTop = padding;
    result.paddingRight = padding;
    result.paddingBottom = padding;
    result.paddingLeft = padding;
  }
  if (paddingTop !== void 0) result.paddingTop = paddingTop;
  if (paddingRight !== void 0) result.paddingRight = paddingRight;
  if (paddingBottom !== void 0) result.paddingBottom = paddingBottom;
  if (paddingLeft !== void 0) result.paddingLeft = paddingLeft;
  if (margin !== void 0) {
    result.marginTop = margin;
    result.marginRight = margin;
    result.marginBottom = margin;
    result.marginLeft = margin;
  }
  if (marginTop !== void 0) result.marginTop = marginTop;
  if (marginRight !== void 0) result.marginRight = marginRight;
  if (marginBottom !== void 0) result.marginBottom = marginBottom;
  if (marginLeft !== void 0) result.marginLeft = marginLeft;
  return result;
}

// src/layout/yoga.ts
function wasmCandidates() {
  const out = [];
  try {
    out.push(fileURLToPath(new URL("./yoga.wasm", import.meta.url)));
  } catch {
  }
  try {
    out.push(createRequire(import.meta.url).resolve("yoga-wasm-web/dist/yoga.wasm"));
  } catch {
  }
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    for (const rel of [
      "packages/core/dist-pro/yoga.wasm",
      "packages/core/dist/yoga.wasm",
      "packages/lite/dist-lite/yoga.wasm",
      "node_modules/yoga-wasm-web/dist/yoga.wasm"
    ]) {
      out.push(join(dir, rel));
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}
async function loadYoga() {
  if ("AGFzbQEAAAABogM0YAF/AGABfwF/YAJ/fwBgAn98AGADf39/AGACf38Bf2ADf39/AX9gAABgA39/fABgAX8BfGAFf39/f38Bf2ADf399AX1gAn9/AXxgAAF/YAZ/f31/fX8AYAJ/fwF9YAV/f39/fwBgBH9/f38AYAZ/f39/f38Bf2ADf35/AX5gB39/f39/f38AYAZ/f39/f38AYAR/f39/AX9gBn98f39/fwF/YAJ/fQBgBH98fH8AYAh/f39/f39/fwBgCn9/f39/f39/f38AYA1/f39/f39/f39/f39/AGAFf39/f38BfGAEf399fQF9YAF8AXxgDn99fX9/f319f39/f39/AX9gAn5/AX9gAX8BfWAEf319fwF9YAN/fX0BfWAEf3x8fABgBX9/fX19AX1gDn99fX9/f319f39/f39/AGAHf399f31/fwBgDX99f31/fX99fX19fX8Bf2AFf399fX0AYAR/f35+AGAHf39/f39/fwF/YAJ8fwF8YAV/f3x8fwBgA39/fwF9YAN/f38BfGAEf39/fABgA39/fQBgBn9/fX99fwF/Aq8BHQFhAWEAGgFhAWIABAFhAWMAGwFhAWQAFAFhAWUAEAFhAWYAAAFhAWcABQFhAWgAHAFhAWkABwFhAWoAEQFhAWsABAFhAWwAAAFhAW0AFQFhAW4ABAFhAW8AAgFhAXAAFQFhAXEABgFhAXIAAAFhAXMAAAFhAXQAHQFhAXUACgFhAXYAFAFhAXcAAQFhAXgABAFhAXkAFgFhAXoAAQFhAUEAAgFhAUIAEAFhAUMAAgPdAdsBAQsLCwsPHg8EEAAHAgUfBgsgBCEFCwYiBwsBAAEGAQAECAwABwAFACUAJicpBgUAKisHBREBCywKLQEHAAUGEQIBAgUCAAcKAQgCCAgIAwMDAwMDAwMDAAMDAAMDAwMAAwMDAgICCAgCAgICAgIICAICAAENAQEFAgIYBA0KCgYTAQIXEwYBBwEOAAEAAAEFLi8wDAUGCDEFAQQFDQ0NMgEEAQEBBAYBATMBDAwMAgkJCQkJCRkBAAAAAgAOAgUBAQIEAQ8EDAkCAgICAgIJCQIBAQQBAQEBAQEEBAcBcAHJAckBBQcBAYACgIACBg0CfwFBoL8EC38BQQALByQIAUQCAAFFAEEBRgClAQFHAKQBAUgAOQFJAQABSgAnAUsA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ACABc0EDcUUEQAJAIABBA3FFBEAgACECDAELIAJFBEAgACECDAELIAAhAgNAIAIgAS0AADoAACABQQFqIQEgAkEBaiICQQNxRQ0BIAIgA0kNAAsLAkAgA0F8cSIEQcAASQ0AIAIgBEFAaiIFSw0AA0AgAiABKAIANgIAIAIgASgCBDYCBCACIAEoAgg2AgggAiABKAIMNgIMIAIgASgCEDYCECACIAEoAhQ2AhQgAiABKAIYNgIYIAIgASgCHDYCHCACIAEoAiA2AiAgAiABKAIkNgIkIAIgASgCKDYCKCACIAEoAiw2AiwgAiABKAIwNgIwIAIgASgCNDYCNCACIAEoAjg2AjggAiABKAI8NgI8IAFBQGshASACQUBrIgIgBU0NAAsLIAIgBE8NAQNAIAIgASgCADYCACABQQRqIQEgAkEEaiICIARJDQALDAELIANBBEkEQCAAIQIMAQsgACADQQRrIgRLBEAgACECDAELIAAhAgNAIAIgAS0AADoAACACIAEtAAE6AAEgAiABLQACOgACIAIgAS0AAzoAAyABQQRqIQEgAkEEaiICIARNDQALCyACIANJBEADQCACIAEtAAA6AAAgAUEBaiEBIAJBAWoiAiADRw0ACwsgAAunBAICfQJ/IABB0ABqIQUgAUECdEH8IGooAgAhBgJAAkACQCABQX5xQQJGBEAgACgCYCIBQfDhg/wHRg0BIAFBj568/AdGDQEgAUGq1ar9B0YNASABviIDIANbDQEgBSAGQQJ0aigCACIBQfDhg/wHRg0BIAFBj568/AdGDQEgAUGq1ar9B0YNASABviIDIANbDQEgACgCaCIBQfDhg/wHRg0BIAFBj568/AdGDQEgAUGq1ar9B0YNASABviIDIANbDQEgACgCcCIBQfDhg/wHRg0BIAFBj568/AdGDQEgAUGq1ar9B0YNASABviIDIANbDQEMAgsgBSAGQQJ0aigCACIBQfDhg/wHRg0AIAFBj568/AdGDQAgAUGq1ar9B0YNACABviIDIANbDQAgACgCbCIBQfDhg/wHRg0AIAFBj568/AdGDQAgAUGq1ar9B0YNACABviIDIANbDQAgACgCcCIBQfDhg/wHRg0AIAFBj568/AdGDQAgAUGq1ar9B0YNACABviIDIANcDQELQwAAAAAhAwJAAkAgAUHw4YP8B0YNACAB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QwAAwH8hDwwBCyApQf////97cUGAgICAAmq+IQ8LIAACfSAOIA5cIgAgByACIA9DAAAAAJdDAAAAACAPvEH/////B3FBgICA/AdNG5KSIgEgAVxyRQRAIA4gASAOlyABvEH/////B3FBgICA/AdLGyABIA68Qf////8HcUGAgID8B00bDAELIAEgDiAAGws4AogEDAcLAkAgAC0ABEEQcQRAIDJBGGogACABIAQgDyAFQQAgAxEoAAwBCyAyQRhqIAAgASAEIA8gBSADEQ4ACyAKIAooAhRBAWo2AhQgCiANQQJ0aiIDIAMoAhhBAWo2AhggAAJ9IABBAiAUIDIqAhiSIgEgFSAEQQJGGyABIAQbIAYQIyIPIA9cIgMgAEECIAYQISAAQQIQIpIgAEECIAYQICAAQQIQJJKSIgEgAVxyRQRAIA8gASAPlyABvEH/////B3FBgICA/AdLGyABIA+8Qf////8HcUGAgID8B00bDAELIAEgDyADGws4AoQEIABBACAOIDIqAhySIgEgAiAFQQJGGyABIAUbIAcQIyEOIABBACAGECEhBwJAAkAgACgCnAEiA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGDQAgA74iASABWw0AIAAoArQBIgNB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRg0AIAO+IgEgAVsNACAAKAK4ASIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YNACADviIBIAFbDQBDAAAAACECDAELQwAAAAAhAiADQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YEQEMAAMB/IQIMAQsgA74iASABXARAQwAAwH8hAgwBCyADQf////97cUGAgICAAmq+IQILQwAAAAAhDyAHIAJDAAAAAJdDAAAAACACvEH/////B3FBgICA/AdNG5IhByAAQQAgBhAgIQICQAJAIAAoAqQBIgNB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRg0AIAO+IgEgAVsNACAAKAK0ASIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YNACADviIBIAFbDQAgACgCuAEiA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGDQAgA74iASABWw0ADAELIANB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRgRAQwAAwH8hDwwBCyADviIBIAFcBEBDAADAfyEPDAELIANB/////3txQYCAgIACar4hDwsgAAJ9IA4gDlwiACAHIAIgD0MAAAAAl0MAAAAAIA+8Qf////8HcUGAgID8B00bkpIiASABXHJFBEAgDiABIA6XIAG8Qf////8HcUGAgID8B0sbIAEgDrxB/////wdxQYCAgPwHTRsMAQsgASAOIAAbCzgCiAQMBgsgACgCsAQiLyAAKAKsBCIDRgRAIAIgGZMhAiAAAn0gAEECIARBfXEEfSABIBWTBSAAKgKcAiAAKgKkApIgACoCjAKSIAAqApQCkgsgBhAjIhQgFFwiAyAAQQIgBhAhIABBAhAikiAAQQIgBhAgIABBAhAkkpIiASABXHJFBEAgFCABIBSXIAG8Qf////8HcUGAgID8B0sbIAEgFLxB/////wdxQYCAgPwHTRsMAQsgASAUIAMbCzgChAQgAEEAIAIgDyAOkiATkiAQkiAFQX1xGyAHECMhDiAAQQAgBhAhIQcCQAJAICpB8OGD/AdGDQAgKkGPnrz8B0YNACAqQarVqv0HRg0AICq+IgEgAVsNACAAKAK0ASIqQfDhg/wHRg0AICpBj568/AdGDQAgKkGq1ar9B0YNACAqviIBIAFbDQAgACgCuAEiKkHw4YP8B0YNACAqQY+evPwHRg0AICpBqtWq/QdGDQAgKr4iASABWw0AQwAAAAAhAgwBC0MAAAAAIQIgKkHw4YP8B0YNACAqQY+evPwHRg0AICpBqtWq/QdGBEBDAADAfyECDAELICq+IgEgAVwEQEMAAMB/IQIMAQsgKkH/////e3FBgICAgAJqviECC0MAAAAAIQ8gByACQwAAAACXQwAAAAAgArxB/////wdxQYCAgPwHTRuSIQcgAEEAIAYQICECAkACQCApQfDhg/wHRg0AIClBj568/AdGDQAgKUGq1ar9B0YNACApviIBIAFbDQAgACgCtAEiKUHw4YP8B0YNACApQY+evPwHRg0AIClBqtWq/QdGDQAgKb4iASABWw0AIAAoArgBIilB8OGD/AdGDQAgKUGPnrz8B0YNACApQarVqv0HRg0AICm+IgEgAVsNAAwBCyApQfDhg/wHRg0AIClBj568/AdGDQAgKUGq1ar9B0YEQEMAAMB/IQ8MAQsgKb4iASABXARAQwAAwH8hDwwBCyApQf////97cUGAgICAAmq+IQ8LIAACfSAOIA5cIgAgByACIA9DAAAAAJdDAAAAACAPvEH/////B3FBgICA/AdNG5KSIgEgAVxyRQRAIA4gASAOlyABvEH/////B3FBgICA/AdLGyABIA68Qf////8HcUGAgID8B00bDAELIAEgDiAAGws4AogEDAYLAkAgCA0AIAIgGZMhDwJAIARBAkYgASAVkyIOQwAAAABfcQ0AAkAgD0MAAAAAX0UNACAFQQJHDQAgDyAPWw0BCyAEQQFHDQEgBUEBRw0BCyAAAn0gAEECQwAAAAAgDiAOQwAAAABdGyAOIARBAkYbQwAAAAAgDiAOWxsgBhAjIgIgAlwiAyAAQQIgBhAhIABBAhAikiAAQQIgBhAgIABBAhAkkpIiASABXHJFBEAgAiABIAKXIAG8Qf////8HcUGAgID8B0sbIAEgArxB/////wdxQYCAgPwHTRsMAQsgASACIAMbCzgChARDAAAAACECIABBAEMAAAAAQwAAAAAgDyAPQwAAAABdGyAPIAVBAkYbIA8gD1wbIAcQIyEOIABBACAGECEhBwJAAkAgKkHw4YP8B0YNACAqQY+evPwHRg0AICpBqtWq/QdGDQAgKr4iASABWw0AIAAoArQBIipB8OGD/AdGDQAgKkGPnrz8B0YNACAqQarVqv0HRg0AICq+IgEgAVsNACAAKAK4ASIqQfDhg/wHRg0AICpBj568/AdGDQAgKkGq1ar9B0YNACAqviIBIAFbDQAMAQsgKkHw4YP8B0YNACAqQY+evPwHRg0AICpBqtWq/QdGBEBDAADAfyECDAELICq+IgEgAVwEQEMAAMB/IQIMAQsgKkH/////e3FBgICAgAJqviECC0MAAAAAIQ8gByACQwAAAACXQwAAAAAgArxB/////wdxQYCAgPwHTRuSIQcgAEEAIAYQICECAkACQCApQfDhg/wHRg0AIClBj568/AdGDQAgKUGq1ar9B0YNACApviIBIAFbDQAgACgCtAEiKUHw4YP8B0YNACApQY+evPwHRg0AIClBqtWq/QdGDQAgKb4iASABWw0AIAAoArgBIilB8OGD/AdGDQAgKUGPnrz8B0YNACApQarVqv0HRg0AICm+IgEgAVsNAAwBCyApQfDhg/wHRg0A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AkACQCA+QQFrDgIBAAILIBIgApRDCtcjPJQhAgsgDiACIgFfDQILAkAgASABWw0AIA4gDlsNACABIQIMAgsgASAOXQRAIA4hAgwCCyAOIAEgASABXBshAgwBCwJAIEINACA1QQFzDQAgLUEAIBIQISEOAkACQCAtKAKcASIrQfDhg/wHRg0AICtBj568/AdGDQAgK0Gq1ar9B0YNACArviIBIAFbDQAgLSgCtAEiK0Hw4YP8B0YNACArQY+evPwHRg0AICtBqtWq/QdGDQAgK74iASABWw0AIC0oArgBIitB8OGD/AdGDQAgK0GPnrz8B0YNACArQarVqv0HRg0AICu+IgEgAVsNAEMAAAAAIQIMAQtDAAAAACECICtB8OGD/AdGDQAgK0GPnrz8B0YNACArQarVqv0HRgRAQwAAwH8hAgwBCyArviIBIAFcBEBDAADAfyECDAELICtB/////3txQYCAgIACar4hAgsgDiACQwAAAACXQwAAAAAgArxB/////wdxQYCAgPwHTRuSIREgLUEAIBIQICEOAkACQCAtKAKkASIrQfDhg/wHRg0AICtBj568/AdGDQAgK0Gq1ar9B0YNACArviIBIAFbDQAgLSgCtAEiK0Hw4YP8B0YNACArQY+evPwHRg0AICtBqtWq/QdGDQAgK74iASABWw0AIC0oArgBIitB8OGD/AdGDQAgK0GPnrz8B0YNACArQarVqv0HRg0AICu+IgEgAVsNAEMAAAAAIQIMAQtDAAAAACECICtB8OGD/AdGDQAgK0GPnrz8B0YNACArQarVqv0HRgRAQwAAwH8hAgwBCyArviIBIAFcBEBDAADAfyECDAELICtB/////3txQYCAgIACar4hAgsgESAOIAJDAAAAAJdDAAAAACACvEH/////B3FBgICA/AdNG5KSIQFDAADAfyECAkACQAJAIDpBAWsOAgEAAgsgGCAQlEMK1yM8lCEQCyABIBAiAl8NAgsgAiACXCABIAFccQ0BIAEgAl4EQCABIQIMAgsgASACIAIgAlwbIQIMAQsgLUECIBIQHiEWIC1BAiASEB8hDiAtKAIwIi8hAwJAAkAgL0Hw4YP8B0YiNA0AIC9Bj568/AdGDQAgL0Gq1ar9B0YNACAvviIBIAFbDQAgLSgCSCIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq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cUGAgID8B00bDAELIAEgAiADGws4AgAgAEEAICcgBxAjIRQgAEEAIAYQISECAkACQCAAKAKcASIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YNACADviIBIAFbDQAgACgCtAEiA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGDQAgA74iASABWw0AIAAoArgBIgNB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRg0AIAO+IgEgAVsNAEMAAAAAIQ8MAQtDAAAAACEPIANB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRgRAQwAAwH8hDwwBCyADviIBIAFcBEBDAADAfyEPDAELIANB/////3txQYCAgIACar4hDwtDAAAAACEBIAIgD0MAAAAAl0MAAAAAIA+8Qf////8HcUGAgID8B00bkiEOIABBACAGECAhBwJAAkAgACgCpAEiA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGDQAgA74iAiACWw0AIAAoArQBIgNB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRg0AIAO+IgIgAlsNACAAKAK4ASIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YNACADviICIAJbDQAMAQsgA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGBEBDAADAfyEBDAELIAO+IgEgAVwEQEMAAMB/IQEMAQsgA0H/////e3FBgICAgAJqviEBCyAAAn0gFCAUXCIDIA4gByABQwAAAACXQwAAAAAgAbxB/////wdxQYCAgPwHTRuSkiIBIAFcckUEQCAUIAEgFJcgAbxB/////wdxQYCAgPwHSxsgASAUvEH/////B3FBgICA/AdNGwwBCyABIBQgAxsLOAKIBAJAAn0CQCBHBEAgACgCGEEUdkEDcSIDQQJGDQEgR0ECRw0BCyAAICogICAhECMiAiACXCIDIAAgKiAGECEgACAqECKSIAAgKiAGECAgACAqECSSkiIBIAFcckUEQCACIAEgApcgAbxB/////wdxQYCAgPwHSxsgASACvEH/////B3FBgICA/AdNGwwCCyABIAIgAxsMAQsgR0ECRw0BIANBAkcNAQJ9IB4gGZIiAiACXCIDIAAgKiAgICEQIyIBIAFcckUE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AkEBIAFBgICAgARxGwsiBAJ/AkAgA0Hw4YP8B0cEQEMAAMB/IQZBAyADQarVqv0HRg0CGiADQY+evPwHRw0BQwAAAAAhBkEBDAILQwAAAAAhBkECDAELQQAgA74iByAHXA0AGiADQf////97cUGAgICAAmq+IQZBAkEBIANBgICAgARxGwtHDQACQCAERQ0AIAUgBVwgBiAGXHENACAFIAaTi0MXt9E4XUUNAQsCQCABQfDhg/wHRwRAQQEgAUGPnrz8B0YNBRogAUGq1ar9B0cNAQwEC0ECDAQLIAG+IgUgBVwNASABQf////97cUGAgICAAmohAkECQQEgAUGAgICABHEbDAMLIAAoAsgBIgFB8OGD/AdHBEBBASABQY+evPwHRg0DGiABQarVqv0HRg0CIAG+IgUgBVwNASABQf////97cUGAgICAAmohAkECQQEgAUGAgICABHEbDAMLQQIMAgtBgICA/gchAkEADAELQYCAgP4HIQJBAwshBCAAIAI2ArwEIAAgBDYCwAQgAAJ/AkACQAJAAkACQCAAKALcASIBQfDhg/wHRiIEDQAgAUGPnrz8B0YNACABQarVqv0HRg0AIAG+IgUgBVwNAQsgACgC1AEhA0MAAAAAIQZBAiECQwAAAAAhBQJ/QQIgBA0AGgJAIAFBqtWq/QdHBEAgAUGPnrz8B0cNAUEBDAILQwAAwH8hBUEDDAELIAG+IgUgBVwEQEMAAMB/IQVBAAwBCyABQf////97cUGAgICAAmq+IQVBAkEBIAFBgICAgARxGwshBAJAIANB8OGD/AdGDQACQCADQarVqv0HRwRAIANBj568/AdHDQFBASECDAILQwAAwH8hBkEDIQIMAQsgA74iBiAGXARAQwAAwH8hBkEAIQIMAQtBAkEBIANBgICAgARxGyECIANB/////3txQYCAgIACar4hBgsgAiAERw0AAkAgBEUNACAFIAVcIAYgBlxxDQAgBSAGk4tDF7fROF1FDQELIAFBqtWq/QdGDQFBACECQQEgAUGPnrz8B0YNBBpBAiABQfDhg/wHRg0EGiABviIFIAVcDQMgAUH/////e3FBgICAgAJqIQJBAkEBIAFBgICAgARxGwwECyAAKALMASIBQarVqv0HRg0AQQAhAkEBIAFBj568/AdGDQMaIAFB8OGD/AdHDQFBAgwDC0GA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AEEAEABBCBAdIgBBADYCBCAAQdcANgIAQcs2QewSQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQdgANgIAQcs2Qd8LQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQdkANgIAQcs2QbsRQQNBwCRB+CNBzQAgAEEAEABBCBAdIgBBADYCBCAAQdoANgIAQcs2QcMJQQNBwCRB+CNBzQAgAEEAEABBCBAdIgBBADYCBCAAQdsANgIAQcs2QfAIQQNBwCRB+CNBzQAgAEEAEABBCBAdIgBBADYCBCAAQdwANgIAQcs2QYYJQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQd4ANgIAQcs2QbUOQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQd8ANgIAQcs2QbgLQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeAANgIAQcs2QaoRQQJBrCRB+CFByQAgAEEAEABBCBAdIgBBADYCBCAAQeEANgIAQcs2QasJQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeIANgIAQcs2QcQTQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeMANgIAQcs2QZ4UQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeQANgIAQcs2QYMMQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeUANgIAQcs2QckRQQJBrCRB+CFByQAgAEEAEABBCBAdIgBBADYCBCAAQeYANgIAQcs2QfIMQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQecANgIAQcs2QZMLQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQegANgIAQcs2QZwRQQJBrCRB+CFByQAgAEEAEABBCBAdIgBBADYCBCAAQekANgIAQcs2QbAUQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeoANgIAQcs2QZMMQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQesANgIAQcs2QYYNQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQewANgIAQcs2QaQLQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQe0ANgIAQcs2QYYUQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQe4ANgIAQcs2QfALQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQe8ANgIAQcs2QdgMQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQfAANgIAQcs2Qf8KQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQfEANgIAQcs2QYASQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQfIANgIAQcs2QawQQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQfMANgIAQcs2QZ4VQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQfQANgIAQcs2QaYMQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQfUANgIAQcs2QYsRQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQfYANgIAQcs2QdEWQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQfgANgIAQcs2QaoSQQNB/CRB4CJB+QAgAEEAEABBCBAdIgBBADYCBCAAQfoANgIAQcs2QdsKQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQfsANgIAQcs2QacOQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQfwANgIAQcs2QZQWQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQf0ANgIAQcs2QdsSQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQf4ANgIAQcs2Qf8QQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQf8ANgIAQcs2QbkKQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQYABNgIAQcs2QfYSQQNB/CRB4CJB+QAgAEEAEABBCBAdIgBBADYCBCAAQYEBNgIAQcs2QcIOQQJBiCVBhCJBggEgAEEAEABBCBAdIgBBADYCBCAAQYMBNgIAQcs2QbcJQQJBkCVBliRBhAEgAEEAEABBCBAdIgBBADYCBCAAQYUBNgIAQcs2QdITQQJBkCVBliRBhAEgAEEAEABBCBAdIgBBADYCBCAAQYYBNgIAQcs2QacUQQJBiCVB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AAAgXSADQwAAAKBecQ0AQ////18gA5giBCAEIAMgA0P////fXRsgA0P///9fXhu8QYCAgIACayEFCwJAIAAgAUECdGoiAUG8AWooAgAgBUYNACABIAU2ArwBA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLcQEBfwJAIAAoAgAiAC0ABCICQQJxQQF2IAFGDQAgACACQf0BcUECQQAgARtyOgAEA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL4wECAn0BfyAAKAIAIQBBgICA/gchBQJAIAK2IgMgA1wNACADi0MAAIB/Ww0AQfDhg/wHIQUgA0MAAAAAWw0AIANDAAAAIF0gA0MAAACgXnENAEP//39fIAOYIgQgBCADIAND//9/310bIAND//9/X14bvEGAgICAAmtBgICAgARyIQULAkAgACABQQJ0aiIBQfQAaigCACAFRg0AIAEgBTYCdANAIAAtAAQiAUEEcQ0BIAAgAUEEcjoABCAAKAIUIgEEQCAAIAERAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9wBAgJ9AX8gACgCACEAQYCAgP4HIQUCQCACtiIDIANcDQAgA4tDAACAf1sNAEGPnrz8ByEFIANDAAAAAFsNACADQwAAACBdIANDAAAAoF5xDQBD////XyADmCIEIAQgAyADQ////99dGyADQ////19eG7xBgICAgAJrIQULAkAgACABQQJ0aiIBQfQAaigCACAFRg0AIAEgBTYCdANAIAAtAAQiAUEEcQ0BIAAgAUEEcjoABCAAKAIUIgEEQCAAIAERAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC90BAgJ9AX8gACgCACEAQYCAgP4HIQUCQCACtiIDIANcDQAgA4tDAACAf1sNAEGPnrz8ByEFIANDAAAAAFsNACADQwAAACBdIANDAAAAoF5xDQBD////XyADmCIEIAQgAyADQ////99dGyADQ////19eG7xBgICAgAJrIQULAkAgACABQQJ0aiIBQZgBaigCACAFRg0AIAEgBTYCmAEDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtzAgJ9AX8CQCAAKAIAIgAqAuABIgMgAbYiAlsNACACIAJcIAMgA1xxDQAgACACOALgAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9kBAgJ9AX8gACgCACEAQYCAgP4HIQQCQCABtiICIAJcDQAgAotDAACAf1sNAEHw4YP8ByEEIAJDAAAAAFsNACACQwAAACBdIAJDAAAAoF5xDQBD//9/XyACmCIDIAMgAiACQ///f99dGyACQ///f19eG7xBgICAgAJrQYCAgIAEciEECwJAIAAoAtwBIARGDQAgACAENgLcAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9IBAgJ9AX8gACgCACEAQYCAgP4HIQQCQCABtiICIAJcDQAgAotDAACAf1sNAEGPnrz8ByEEIAJDAAAAAFsNACACQwAAACBdIAJDAAAAoF5xDQBD////XyACmCIDIAMgAiACQ////99dGyACQ////19eG7xBgICAgAJrIQQLAkAgACgC3AEgBEYNACAAIAQ2AtwBA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL2QECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQfDhg/wHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP//39fIAKYIgMgAyACIAJD//9/310bIAJD//9/X14bvEGAgICAAmtBgICAgARyIQQLAkAgACgC2AEgBEYNACAAIAQ2AtgBA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL0gECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQY+evPwHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP///9fIAKYIgMgAyACIAJD////310bIAJD////X14bvEGAgICAAmshBAsCQCAAKALYASAERg0AIAAgBDYC2AEDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvZAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBB8OGD/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ///f18gApgiAyADIAIgAkP//3/fXRsgAkP//39fXhu8QYCAgIACa0GAgICABHIhBAsCQCAAKALUASAERg0AIAAgBDYC1AEDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvSAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBBj568/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ////18gApgiAyADIAIgAkP////fXRsgAkP///9fXhu8QYCAgIACayEECwJAIAAoAtQBIARGDQAgACAENgLUAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9kBAgJ9AX8gACgCACEAQYCAgP4HIQQCQCABtiICIAJcDQAgAotDAACAf1sNAEHw4YP8ByEEIAJDAAAAAFsNACACQwAAACBdIAJDAAAAoF5xDQBD//9/XyACmCIDIAMgAiACQ///f99dGyACQ///f19eG7xBgICAgAJrQYCAgIAEciEECwJAIAAoAtABIARGDQAgACAENgLQAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9IBAgJ9AX8gACgCACEAQYCAgP4HIQQCQCABtiICIAJcDQAgAotDAACAf1sNAEGPnrz8ByEEIAJDAAAAAFsNACACQwAAACBdIAJDAAAAoF5xDQBD////XyACmCIDIAMgAiACQ////99dGyACQ////19eG7xBgICAgAJrIQQLAkAgACgC0AEgBEYNACAAIAQ2AtABA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLZwEBfwJAIAAoAgAiACgCzAFBqtWq/QdGDQAgAEGq1ar9BzYCzAEDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvZAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBB8OGD/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ///f18gApgiAyADIAIgAkP//3/fXRsgAkP//39fXhu8QYCAgIACa0GAgICABHIhBAsCQCAAKALMASAERg0AIAAgBDYCzAEDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvSAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBBj568/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ////18gApgiAyADIAIgAkP////fXRsgAkP///9fXhu8QYCAgIACayEECwJAIAAoAswBIARGDQAgACAENgLMAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC2cBAX8CQCAAKAIAIgAoAsgBQarVqv0HRg0AIABBqtWq/Qc2AsgBA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL2QECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQfDhg/wHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP//39fIAKYIgMgAyACIAJD//9/310bIAJD//9/X14bvEGAgICAAmtBgICAgARyIQQLAkAgACgCyAEgBEYNACAAIAQ2AsgBA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL0gECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQY+evPwHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP///9fIAKYIgMgAyACIAJD////310bIAJD////X14bvEGAgICAAmshBAsCQCAAKALIASAERg0AIAAgBDYCyAEDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtxAgJ9AX8CQCAAKAIAIgAqAiQiAyABtiICWw0AIAIgAlwgAyADXHENACAAIAI4AiQDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtxAgJ9AX8CQCAAKAIAIgAqAiAiAyABtiICWw0AIAIgAlwgAyADXHENACAAIAI4AiADQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtlAQF/AkAgACgCACIAKAIoQarVqv0HRg0AIABBqtWq/Qc2AigDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvXAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBB8OGD/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ///f18gApgiAyADIAIgAkP//3/fXRsgAkP//39fXhu8QYCAgIACa0GAgICABHIhBAsCQCAAKAIoIARGDQAgACAENgIoA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL0AECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQY+evPwHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP///9fIAKYIgMgAyACIAJD////310bIAJD////X14bvEGAgICAAmshBAsCQCAAKAIoIARGDQAgACAENgIoA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLcQICfQF/AkAgACgCACIAKgIcIgMgAbYiAlsNACACIAJcIAMgA1xxDQAgACACOAIcA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLdwEBfwJAIAAoAgAiACgCGCICQRZ2QQFxIAFGDQAgACACQf///31xIAFBFnRBgICAAnFyNgIYA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLdwEBfwJAIAAoAgAiACgCGCICQRR2QQNxIAFGDQAgACACQf//v35xIAFBFHRBgIDAAXFyNgIYA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLbgACQCAAKAIAIgAgAUECdGoiAUEsaigCAEGq1ar9B0YNACABQarVqv0HNgIsA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL4gECAn0BfyAAKAIAIQBBgICA/gchBQJAIAK2IgMgA1wNACADi0MAAIB/Ww0AQfDhg/wHIQUgA0MAAAAAWw0AIANDAAAAIF0gA0MAAACgXnENAEP//39fIAOYIgQgBCADIAND//9/310bIAND//9/X14bvEGAgICAAmtBgICAgARyIQULAkAgACABQQJ0aiIBQSxqKAIAIAVGDQAgASAFNgIsA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL2wECAn0BfyAAKAIAIQBBgICA/gchBQJAIAK2IgMgA1wNACADi0MAAIB/Ww0AQY+evPwHIQUgA0MAAAAAWw0AIANDAAAAIF0gA0MAAACgXnENAEP///9fIAOYIgQgBCADIAND////310bIAND////X14bvEGAgICAAmshBQsCQCAAIAFBAnRqIgFBLGooAgAgBUYNACABIAU2AiwDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtzAQF/AkAgACgCACIAKAIYIgJBBHZBB3EgAUYNACAAIAJBj39xIAFBBHRB8ABxcjYCGANAIAAtAAQiAUEEcQ0BIAAgAUEEcjoABCAAKAIUIgEEQCAAIAERAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC3UBAX8CQCAAKAIAIgAoAhgiAkESdkEDcSABRg0AIAAgAkH//09xIAFBEnRBgIAwcXI2AhgDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtxAQF/AkAgACgCACIAKAIYIgJBAnZBA3EgAUYNACAAIAJBc3EgAUECdEEMcXI2AhgDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwt1AQF/AkAgACgCACIAKAIYIgJBDXZBB3EgAUYNACAAIAJB/798cSABQQ10QYDAA3FyNgIYA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLcwEBfwJAIAAoAgAiACgCGCICQQp2QQdxIAFGDQAgACACQf9HcSABQQp0QYA4cXI2AhgDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtzAQF/AkAgACgCACIAKAIYIgJBB3ZBB3EgAUYNACAAIAJB/3hxIAFBB3RBgAdxcjYCGANAIAAtAAQiAUEEcQ0BIAAgAUEEcjoABCAAKAIUIgEEQCAAIAERAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC+MBAgJ9AX8gACgCACEAQYCAgP4HIQUCQCACtiIDIANcDQAgA4tDAACAf1sNAEHw4YP8ByEFIANDAAAAAFsNACADQwAAACBdIANDAAAAoF5xDQBD//9/XyADmCIEIAQgAyADQ///f99dGyADQ///f19eG7xBgICAgAJrQYCAgIAEciEFCwJAIAAgAUECdGoiAUHQAGooAgAgBUYNACABIAU2AlADQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvcAQICfQF/IAAoAgAhAEGAgID+ByEFAkAgArYiAyADXA0AIAOLQwAAgH9bDQBBj568/AchBSADQwAAAABbDQAgA0MAAAAgXSADQwAAAKBecQ0AQ////18gA5giBCAEIAMgA0P////fXRsgA0P///9fXhu8QYCAgIACayEFCwJAIAAgAUECdGoiAUHQAGooAgAgBUYNACABIAU2AlADQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwt1AQF/AkAgACgCACIAKAIYIgJBEHZBA3EgAUYNACAAIAJB//9zcSABQRB0QYCADHFyNgIYA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLxgkCAn8DfQJAAkAgASgCACICKAIYIAAoAgAiASgCGHNB////A3ENACACKAIoIQACfwJAIAEoAigiA0Hw4YP8B0cEQEMAAMB/IQRBAyADQarVqv0HRg0CGiADQY+evPwHRw0BQwAAAAAhBEEBDAILQQIMAQtBACADviIFIAVcDQAaIANB/////3txQYCAgIACar4hBEECQQEgA0GAgICABHEbCyEDAn8CQCAAQfDhg/wHRwRAQwAAwH8hBUEDIABBqtWq/QdGDQIaIABBj568/AdHDQFDAAAAACEFQQEMAgtDAAAAACEFQQIMAQtBACAAviIGIAZcDQAaIABB/////3txQYCAgIACar4hBUECQQEgAEGAgICABHEbCyADRw0AAkAgA0UNACAEIARcIAUgBVxxDQAgBCAFk4tDF7fROF1FDQELIAEoAiwgAigCLEcNACABKAIwIAIoAjBHDQAgASgCNCACKAI0Rw0AIAEoAjggAigCOEcNACABKAI8IAIoAjxHDQAgAUFAaygCACACQUBrKAIARw0A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BCAAERMAIgVCIIinJAEgBacLqAEBBX8gACgCVCIDKAIAIQUgAygCBCIEIAAoAhQgACgCHCIHayIGIAQgBkkbIgYEQCAFIAcgBhAsGiADIAMoAgAgBmoiBTYCACADIAMoAgQgBmsiBDYCBAsgBCACIAIgBEsbIgQEQCAFIAEgBBAsGiADIAMoAgAgBGoiBTYCACADIAMoAgQgBGs2AgQLIAVBADoAACAAIAAoAiwiATYCHCAAIAE2AhQgAgsEAEIACwQAQQALigUCBn4CfyABIAEoAgBBB2pBeHEiAUEQajYCACAAIQkgASkDACEDIAEpAwghBiMAQSBrIggkAAJAIAZC////////////AIMiBEKAgICAgIDAgDx9IARCgICAgICAwP/DAH1UBEAgBkIEhiADQjyIhCEEIANC//////////8PgyIDQoGAgICAgICACFoEQCAEQoGAgICAgICAwAB8IQIMAgsgBEKAgICAgICAgEB9IQIgA0KAgICAgICAgAhSDQEgAiAEQgGDfCECDAELIANQIARCgICAgICAwP//AFQgBEKAgICAgIDA//8AURtFBEAgBkIEhiADQjyIhEL/////////A4NCgICAgICAgPz/AIQhAgwBC0KAgICAgICA+P8AIQIgBEL///////+//8MAVg0AQgAhAiAEQjCIpyIAQZH3AEkNACADIQIgBkL///////8/g0KAgICAgIDAAIQiBSEHAkAgAEGB9wBrIgFBwABxBEAgAiABQUBqrYYhB0IAIQIMAQsgAUUNACAHIAGtIgSGIAJBwAAgAWutiIQhByACIASGIQILIAggAjcDECAIIAc3AxgCQEGB+AAgAGsiAEHAAHEEQCAFIABBQGqtiCEDQgAhBQwBCyAARQ0AIAVBwAAgAGuthiADIACtIgKIhCEDIAUgAoghBQsgCCADNwMAIAggBTcDCCAIKQMIQgSGIAgpAwAiA0I8iIQhAiAIKQMQIAgpAxiEQgBSrSADQv//////////D4OEIgNCgYCAgICAgIAIWgRAIAJCAXwhAgwBCyADQoCAgICAgICACFINACACQgGDIAJ8IQILIAhBIGokACAJIAIgBkKAgICAgICAgIB/g4S/OQMAC6IYAxJ/AXwDfiMAQbAEayIMJAAgDEEANgIsAkAgAb0iGUIAUwRAQQEhEUGYCSETIAGa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CyAAKAIIEAUgAAuJAQECfyMAQTBrIgIkACABIAAoAgQiA0EBdWohASAAKAIAIQAgAiABIANBAXEEfyABKAIAIABqKAIABSAACxECAEEwEB0iACACKQMoNwMoIAAgAikDIDcDICAAIAIpAxg3AxggACACKQMQNwMQIAAgAikDCDcDCCAAIAIpAwA3AwAgAkEwaiQAIAALOwEBfyABIAAoAgQiBUEBdWohASAAKAIAIQAgASACIAMgBCAFQQFxBH8gASgCACAAaigCAAUgAAsRGQALNwEBfyABIAAoAgQiA0EBdWohASAAKAIAIQAgASACIANBAXEEfyABKAIAIABqKAIABSAACxEPAAs3AQF/IAEgACgCBCIDQQF1aiEBIAAoAgAhACABIAIgA0EBcQR/IAEoAgAgAGooAgAFIAALEQwACzUBAX8gASAAKAIEIgJBAXVqIQEgACgCACEAIAEgAkEBcQR/IAEoAgAgAGooAgAFIAALEQkAC2EBAn8jAEEQayICJAAgASAAKAIEIgNBAXVqIQEgACgCACEAIAIgASADQQFxBH8gASgCACAAaigCAAUgAAsRAgBBEBAdIgAgAikDCDcDCCAAIAIpAwA3AwAgAkEQaiQAIAALYwECfyMAQRBrIgMkACABIAAoAgQiBEEBdWohASAAKAIAIQAgAyABIAIgBEEBcQR/IAEoAgAgAGooAgAFIAALEQQAQRAQHSIAIAMpAwg3AwggACADKQMANwMAIANBEGokACAACzcBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAIAEgAiADQQFxBH8gASgCACAAaigCAAUgAAsRAwALOQEBfyABIAAoAgQiBEEBdWohASAAKAIAIQAgASACIAMgBEEBcQR/IAEoAgAgAGooAgAFIAALEQgACwkAIAEgABEBAAsFAEHLNgsPACABIAAoAgBqIAI2AgALDQAgASAAKAIAaigCAAsYAQF/QRAQHSIAQgA3AwggAEEANgIAIAALGAEBf0EQEB0iAEIANwMAIABCADcDCCAACzQBAX9BMBAdIgBCADcDACAAQgA3AyggAEIANwMgIABCADcDGCAAQgA3AxAgAEIANwMIIAALNwEBfyABIAAoAgQiA0EBdWohASAAKAIAIQAgASACIANBAXEEfyABKAIAIABqKAIABSAACxEYAAsFAEHGNgsh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IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAtgBIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAtQBIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAtABIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAswBIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAsgBIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIACy4BAX0gACgCACIAKgIkIgEgAVwEfUMAAIA/QwAAAAAgACgCuAQtAAobBSABC7sLGgEBfSAAKAIAKgIgIgFDAAAAACABIAFbG7sLlgEDAX8BfAF9AkACQCABKAIAKAIoIgFBqtWq/QdGBH9BAwUgAUGPnrz8B0YEQEEBIQIMAwsgAUHw4YP8B0YEQEECIQIMAwsgAb4iBCAEWw0BQQALIQJEAAAAAAAA+H8hAwwBC0ECQQEgAUGAgICABHEbIQIgAUH/////e3FBgICAgAJqvrshAwsgACADOQMIIAAgAjYCAAsQACAAKAIAKAIYQRZ2QQFxCxAAIAAoAgAoAhhBFHZBA3ELqgEDAX8BfAF9QQIhAwJAAkAgASgCACACQQJ0aigCLCIBQfDhg/wHRwRARAAAAAAAAPh/IQQgAUGq1ar9B0YEQEEDIQMMAwsgAUGPnrz8B0cNAUQAAAAAAAAAACEEQQEhAwwCCwwBCyABviIFIAVcBEBBACEDDAELQQJBASABQYCAgIAEcRshAyABQf////97cUGAgICAAmq+uyEECyAAIAQ5AwggACADNgIACxAAIAAoAgAoAhhBBHZBB3ELEAAgACgCACgCGEESdkEDcQsQACAAKAIAKAIYQQJ2QQNxCxAAIAAoAgAoAhhBDXZBB3ELEAAgACgCACgCGEEKdkEHcQsQACAAKAIAKAIYQQd2QQdxC6oBAwF/AXwBfUECIQMCQAJAIAEoAgAgAkECdGooAlAiAUHw4YP8B0cEQEQAAAAAAAD4fyEEIAFBqtWq/QdGBEBBAyEDDAMLIAFBj568/AdHDQFEAAAAAAAAAAAhBEEBIQMMAgsMAQsgAb4iBSAFXARAQQAhAwwBC0ECQQEgAUGAgICABHEbIQMgAUH/////e3FBgICAgAJqvrshBAsgACAEOQMIIAAgAzYCAAsL/iEjAEGACAuhGU9ubHkgbGVhZiBub2RlcyB3aXRoIGN1c3RvbSBtZWFzdXJlIGZ1bmN0aW9uc3Nob3VsZCBtYW51YWxseSBtYXJrIHRoZW1zZWx2ZXMgYXMgZGlydHkAaXNEaXJ0eQBtYXJrRGlydHkAZGVzdHJveQBzZXREaXNwbGF5AGdldERpc3BsYXkAc2V0RmxleAAtKyAgIDBYMHgALTBYKzBYIDBYLTB4KzB4IDB4AHNldEZsZXhHcm93AGdldEZsZXhHcm93AHNldE92ZXJmbG93AGdldE92ZXJmbG93AGNhbGN1bGF0ZUxheW91dABnZXRDb21wdXRlZExheW91dAB1bnNpZ25lZCBzaG9ydABnZXRDaGlsZENvdW50AHVuc2lnbmVkIGludABzZXRKdXN0aWZ5Q29udGVudABnZXRKdXN0aWZ5Q29udGVudABzZXRBbGlnbkNvbnRlbnQAZ2V0QWxpZ25Db250ZW50AGdldFBhcmVudABpbXBsZW1lbnQAc2V0TWF4SGVpZ2h0UGVyY2VudABzZXRIZWlnaHRQZXJjZW50AHNldE1pbkhlaWdodFBlcmNlbnQAc2V0RmxleEJhc2lzUGVyY2VudABzZXRQb3NpdGlvblBlcmNlbnQAc2V0TWFyZ2luUGVyY2VudABzZXRNYXhXaWR0aFBlcmNlbnQAc2V0V2lkdGhQZXJjZW50AHNldE1pbldpZHRoUGVyY2VudABzZXRQYWRkaW5nUGVyY2VudABjcmVhdGVEZWZhdWx0AHVuaXQAcmlnaHQAaGVpZ2h0AHNldE1heEhlaWdodABnZXRNYXhIZWlnaHQAc2V0SGVpZ2h0AGdldEhlaWdodABzZXRNaW5IZWlnaHQAZ2V0TWluSGVpZ2h0AGdldENvbXB1dGVkSGVpZ2h0AGdldENvbXB1dGVkUmlnaHQAbGVmdABnZXRDb21wdXRlZExlZnQAcmVzZXQAX19kZXN0cnVjdABmbG9hdAB1aW50NjRfdAB1c2VXZWJEZWZhdWx0cwBzZXRVc2VXZWJEZWZhdWx0cwBzZXRBbGlnbkl0ZW1zAGdldEFsaWduSXRlbXMAc2V0RmxleEJhc2lzAGdldEZsZXhCYXNpcwBDYW5ub3QgZ2V0IGxheW91dCBwcm9wZXJ0aWVzIG9mIG11bHRpLWVkZ2Ugc2hvcnRoYW5kcwB1c2VMZWdhY3lTdHJldGNoQmVoYXZpb3VyAHNldFVzZUxlZ2FjeVN0cmV0Y2hCZWhhdmlvdXIAc2V0UG9pbnRTY2FsZUZhY3RvcgBNZWFzdXJlQ2FsbGJhY2tXcmFwcGVyAERpcnRpZWRDYWxsYmFja1dyYXBwZXIAQ2Fubm90IHJlc2V0IGEgbm9kZSBzdGlsbCBhdHRhY2hlZCB0byBhIG93bmVyAHNldEJvcmRlcgBnZXRCb3JkZXIAZ2V0Q29tcHV0ZWRCb3JkZXIAdW5zaWduZWQgY2hhcgB0b3AAZ2V0Q29tcHV0ZWRUb3AAc2V0RmxleFdyYXAAZ2V0RmxleFdyYXAAc2V0R2FwAGdldEdhcAAlcABzZXRIZWlnaHRBdXRvAHNldEZsZXhCYXNpc0F1dG8Ac2V0TWFyZ2luQXV0bwBzZXRXaWR0aEF1dG8AU2NhbGUgZmFjdG9yIHNob3VsZCBub3QgYmUgbGVzcyB0aGFuIHplcm8Ac2V0QXNwZWN0UmF0aW8AZ2V0QXNwZWN0UmF0aW8Ac2V0UG9zaXRpb24AZ2V0UG9zaXRpb24Abm90aWZ5T25EZXN0cnVjdGlvbgBzZXRGbGV4RGlyZWN0aW9uAGdldEZsZXhEaXJlY3Rpb24Ac2V0TWFyZ2luAGdldE1hcmdpbgBnZXRDb21wdXRlZE1hcmdpbgBuYW4AYm90dG9tAGdldENvbXB1dGVkQm90dG9tAGJvb2wAZW1zY3JpcHRlbjo6dmFsAHNldEZsZXhTaHJpbmsAZ2V0RmxleFNocmluawBNZWFzdXJlQ2FsbGJhY2sARGlydGllZENhbGxiYWNrAHdpZHRoAHNldE1heFdpZHRoAGdldE1heFdpZHRoAHNldFdpZHRoAGdldFdpZHRoAHNldE1pbldpZHRoAGdldE1pbldpZHRoAGdldENvbXB1dGVkV2lkdGgAdW5zaWduZWQgbG9uZwBzdGQ6OndzdHJpbmcAc3RkOjpzdHJpbmcAc3RkOjp1MTZzdHJpbmcAc3RkOjp1MzJzdHJpbmcAc2V0UGFkZGluZwBnZXRQYWRkaW5nAGdldENvbXB1dGVkUGFkZGluZwBUcmllZCB0byBjb25zdHJ1Y3QgWUdOb2RlIHdpdGggbnVsbCBjb25maWcAY3JlYXRlV2l0aENvbmZpZwBpbmYAc2V0QWxpZ25TZWxmAGdldEFsaWduU2VsZgBTaXplAHZhbHVlAFZhbHVlAGNyZWF0ZQBtZWFzdXJlAHNldFBvc2l0aW9uVHlwZQBnZXRQb3NpdGlvblR5cGUAaXNSZWZlcmVuY2VCYXNlbGluZQBzZXRJc1JlZmVyZW5jZUJhc2VsaW5lAGNvcHlTdHlsZQBkb3VibGUATm9kZQBleHRlbmQAaW5zZXJ0Q2hpbGQAZ2V0Q2hpbGQAcmVtb3ZlQ2hpbGQAdm9pZABhdmFpbGFibGVIZWlnaHQgaXMgaW5kZWZpbml0ZSBzbyBoZWlnaHRNZWFzdXJlTW9kZSBtdXN0IGJlIFlHTWVhc3VyZU1vZGVVbmRlZmluZWQAYXZhaWxhYmxlV2lkdGggaXMgaW5kZWZpbml0ZSBzbyB3aWR0aE1lYXN1cmVNb2RlIG11c3QgYmUgWUdNZWFzdXJlTW9kZVVuZGVmaW5lZABzZXRFeHBlcmltZW50YWxGZWF0dXJlRW5hYmxlZABpc0V4cGVyaW1lbnRhbEZlYXR1cmVFbmFibGVkAGRpcnRpZWQAQ2Fubm90IHJlc2V0IGEgbm9kZSB3aGljaCBzdGlsbCBoYXMgY2hpbGRyZW4gYXR0YWNoZWQAdW5zZXRNZWFzdXJlRnVuYwB1bnNldERpcnRpZWRGdW5jAEV4cGVjdCBjdXN0b20gYmFzZWxpbmUgZnVuY3Rpb24gdG8gbm90IHJldHVybiBOYU4ATkFOAElORgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxzaG9ydD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgc2hvcnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgaW50PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxmbG9hdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDhfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGNoYXI+AHN0ZDo6YmFzaWNfc3RyaW5nPHVuc2lnbmVkIGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHNpZ25lZCBjaGFyPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxsb25nPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBsb25nPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxkb3VibGU+AENoaWxkIGFscmVhZHkgaGFzIGEgb3duZXIsIGl0IG11c3QgYmUgcmVtb3ZlZCBmaXJzdC4AQ2Fubm90IHNldCBtZWFzdXJlIGZ1bmN0aW9uOiBOb2RlcyB3aXRoIG1lYXN1cmUgZnVuY3Rpb25zIGNhbm5vdCBoYXZlIGNoaWxkcmVuLgBDYW5ub3QgYWRkIGNoaWxkOiBOb2RlcyB3aXRoIG1lYXN1cmUgZnVuY3Rpb25zIGNhbm5vdCBoYXZlIGNoaWxkcmVuLgAobnVsbCkAJXMKAAABAAAAAwAAAAAAAAACAAAAAwAAAAEAAAACAAAAAAAAAAEAAAABAEGuIQsVwH8AAAAAAADAfwMAAABpaQB2AHZpAEHQIQs3KxsAACkbAABpGwAAYxsAAGkbAABjGwAAaWlpZmlmaQBcGwAALBsAAHZpaQAtGwAAcBsAAGlpaQBBkCILCbkAAAC6AAAAuwBBpCILDrkAAAC8AAAAvQAAAFwbAEHAIgs+KxsAAGkbAABjGwAAaRsAAGMbAABwGwAAaxsAAHAbAABpaWlpAAAAAFwbAABBGwAAXBsAAEMbAABEGwAAcBsAQYgjCwm+AAAAvwAAAMAAQZwjCxa+AAAAwQAAAL0AAABHGwAAXBsAAEcbAEHAIwuSA1wbAABHGwAAYxsAAF0bAAB2aWlpaQAAAFwbAABHGwAAaRsAAHZpaWYAAAAAXBsAAEcbAABdGwAAdmlpaQAAAABdGwAASBsAAGMbAABdGwAARxsAAGkAZGlpAHZpaWQAAEwbAABMGwAARxsAAFwbAABMGwAAXBsAAEwbAABLGwAAXBsAAEwbAABjGwAAAAAAAFwbAABMGwAAYxsAAGobAAB2aWlpZAAAAFwbAABMGwAAahsAAGMbAABNGwAAShsAAE0bAABjGwAAShsAAE0bAABqGwAATRsAAGobAABNGwAAYxsAAGRpaWkAAAAAaRsAAEwbAABjGwAAZmlpaQAAAABcGwAATBsAAEwbAABkGwAAXBsAAEwbAABMGwAAZBsAAE0bAABMGwAATBsAAEwbAABMGwAAZBsAAF0bAABMGwAAXBsAAEwbAABdGwAAXBsAAEwbAAApGwAAXBsAAEwbAABBGwAAXRsAAE0bAAAAAAAAXBsAAEwbAABqGwAAahsAAGMbAAB2aWlkZGkAAEkbAABNGwBB4CYLQRkACgAZGRkAAAAABQAAAAAAAAkAAAAACwAAAAAAAAAAGQARChkZGQMKBwABAAkLGAAACQYLAAALAAYZAAAAGRkZAEGxJwshDgAAAAAAAAAAGQAKDRkZGQANAAACAAkOAAAACQAOAAAOAEHrJwsBDABB9ycLFRMAAAAAEwAAAAAJDAAAAAAADAAADABBpSgLARAAQbEoCxUPAAAABA8AAAAACRAAAAAAABAAABAAQd8oCwESAEHrKAseEQAAAAARAAAAAAkSAAAAAAASAAASAAAaAAAAGhoaAEGiKQsOGgAAABoaGgAAAAAAAAkAQdMpCwEUAEHfKQsVFwAAAAAXAAAAAAkUAAAAAAAUAAAUAEGNKgsBFgBBmSoLJxUAAAAAFQAAAAAJFgAAAAAAFgAAFgAAMDEyMzQ1Njc4OUFCQ0RFRgBB5CoLAccAQYwrCwj//////////wBB0CsLCaAfAQAAAAAABQBB5CsLAcIAQfwrCwrDAAAAxAAAAIQbAEGULAsBAgBBpCwLCP//////////AEHoLAsBBQBB9CwLAcUAQYwtCw7DAAAAxgAAAJgbAAAABABBpC0LAQEAQbQtCwX/////CgBB+C0LAcg=".length > 0) {
    return initYoga(Buffer.from("AGFzbQEAAAABogM0YAF/AGABfwF/YAJ/fwBgAn98AGADf39/AGACf38Bf2ADf39/AX9gAABgA39/fABgAX8BfGAFf39/f38Bf2ADf399AX1gAn9/AXxgAAF/YAZ/f31/fX8AYAJ/fwF9YAV/f39/fwBgBH9/f38AYAZ/f39/f38Bf2ADf35/AX5gB39/f39/f38AYAZ/f39/f38AYAR/f39/AX9gBn98f39/fwF/YAJ/fQBgBH98fH8AYAh/f39/f39/fwBgCn9/f39/f39/f38AYA1/f39/f39/f39/f39/AGAFf39/f38BfGAEf399fQF9YAF8AXxgDn99fX9/f319f39/f39/AX9gAn5/AX9gAX8BfWAEf319fwF9YAN/fX0BfWAEf3x8fABgBX9/fX19AX1gDn99fX9/f319f39/f39/AGAHf399f31/fwBgDX99f31/fX99fX19fX8Bf2AFf399fX0AYAR/f35+AGAHf39/f39/fwF/YAJ8fwF8YAV/f3x8fwBgA39/fwF9YAN/f38BfGAEf39/fABgA39/fQBgBn9/fX99fwF/Aq8BHQFhAWEAGgFhAWIABAFhAWMAGwFhAWQAFAFhAWUAEAFhAWYAAAFhAWcABQFhAWgAHAFhAWkABwFhAWoAEQFhAWsABAFhAWwAAAFhAW0AFQFhAW4ABAFhAW8AAgFhAXAAFQFhAXEABgFhAXIAAAFhAXMAAAFhAXQAHQFhAXUACgFhAXYAFAFhAXcAAQFhAXgABAFhAXkAFgFhAXoAAQFhAUEAAgFhAUIAEAFhAUMAAgPdAdsBAQsLCwsPHg8EEAAHAgUfBgsgBCEFCwYiBwsBAAEGAQAECAwABwAFACUAJicpBgUAKisHBREBCywKLQEHAAUGEQIBAgUCAAcKAQgCCAgIAwMDAwMDAwMDAAMDAAMDAwMAAwMDAgICCAgCAgICAgIICAICAAENAQEFAgIYBA0KCgYTAQIXEwYBBwEOAAEAAAEFLi8wDAUGCDEFAQQFDQ0NMgEEAQEBBAYBATMBDAwMAgkJCQkJCRkBAAAAAgAOAgUBAQIEAQ8EDAkCAgICAgIJCQIBAQQBAQEBAQEEBAcBcAHJAckBBQcBAYACgIACBg0CfwFBoL8EC38BQQALByQIAUQCAAFFAEEBRgClAQFHAKQBAUgAOQFJAQABSgAnAUsA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ACABc0EDcUUEQAJAIABBA3FFBEAgACECDAELIAJFBEAgACECDAELIAAhAgNAIAIgAS0AADoAACABQQFqIQEgAkEBaiICQQNxRQ0BIAIgA0kNAAsLAkAgA0F8cSIEQcAASQ0AIAIgBEFAaiIFSw0AA0AgAiABKAIANgIAIAIgASgCBDYCBCACIAEoAgg2AgggAiABKAIMNgIMIAIgASgCEDYCECACIAEoAhQ2AhQgAiABKAIYNgIYIAIgASgCHDYCHCACIAEoAiA2AiAgAiABKAIkNgIkIAIgASgCKDYCKCACIAEoAiw2AiwgAiABKAIwNgIwIAIgASgCNDYCNCACIAEoAjg2AjggAiABKAI8NgI8IAFBQGshASACQUBrIgIgBU0NAAsLIAIgBE8NAQNAIAIgASgCADYCACABQQRqIQEgAkEEaiICIARJDQALDAELIANBBEkEQCAAIQIMAQsgACADQQRrIgRLBEAgACECDAELIAAhAgNAIAIgAS0AADoAACACIAEtAAE6AAEgAiABLQACOgACIAIgAS0AAzoAAyABQQRqIQEgAkEEaiICIARNDQALCyACIANJBEADQCACIAEtAAA6AAAgAUEBaiEBIAJBAWoiAiADRw0ACwsgAAunBAICfQJ/IABB0ABqIQUgAUECdEH8IGooAgAhBgJAAkACQCABQX5xQQJGBEAgACgCYCIBQfDhg/wHRg0BIAFBj568/AdGDQEgAUGq1ar9B0YNASABviIDIANbDQEgBSAGQQJ0aigCACIBQfDhg/wHRg0BIAFBj568/AdGDQEgAUGq1ar9B0YNASABviIDIANbDQEgACgCaCIBQfDhg/wHRg0BIAFBj568/AdGDQEgAUGq1ar9B0YNASABviIDIANbDQEgACgCcCIBQfDhg/wHRg0BIAFBj568/AdGDQEgAUGq1ar9B0YNASABviIDIANbDQEMAgsgBSAGQQJ0aigCACIBQfDhg/wHRg0AIAFBj568/AdGDQAgAUGq1ar9B0YNACABviIDIANbDQAgACgCbCIBQfDhg/wHRg0AIAFBj568/AdGDQAgAUGq1ar9B0YNACABviIDIANbDQAgACgCcCIBQfDhg/wHRg0AIAFBj568/AdGDQAgAUGq1ar9B0YNACABviIDIANcDQELQwAAAAAhAwJAAkAgAUHw4YP8B0YNACAB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QwAAwH8hDwwBCyApQf////97cUGAgICAAmq+IQ8LIAACfSAOIA5cIgAgByACIA9DAAAAAJdDAAAAACAPvEH/////B3FBgICA/AdNG5KSIgEgAVxyRQRAIA4gASAOlyABvEH/////B3FBgICA/AdLGyABIA68Qf////8HcUGAgID8B00bDAELIAEgDiAAGws4AogEDAcLAkAgAC0ABEEQcQRAIDJBGGogACABIAQgDyAFQQAgAxEoAAwBCyAyQRhqIAAgASAEIA8gBSADEQ4ACyAKIAooAhRBAWo2AhQgCiANQQJ0aiIDIAMoAhhBAWo2AhggAAJ9IABBAiAUIDIqAhiSIgEgFSAEQQJGGyABIAQbIAYQIyIPIA9cIgMgAEECIAYQISAAQQIQIpIgAEECIAYQICAAQQIQJJKSIgEgAVxyRQRAIA8gASAPlyABvEH/////B3FBgICA/AdLGyABIA+8Qf////8HcUGAgID8B00bDAELIAEgDyADGws4AoQEIABBACAOIDIqAhySIgEgAiAFQQJGGyABIAUbIAcQIyEOIABBACAGECEhBwJAAkAgACgCnAEiA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGDQAgA74iASABWw0AIAAoArQBIgNB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRg0AIAO+IgEgAVsNACAAKAK4ASIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YNACADviIBIAFbDQBDAAAAACECDAELQwAAAAAhAiADQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YEQEMAAMB/IQIMAQsgA74iASABXARAQwAAwH8hAgwBCyADQf////97cUGAgICAAmq+IQILQwAAAAAhDyAHIAJDAAAAAJdDAAAAACACvEH/////B3FBgICA/AdNG5IhByAAQQAgBhAgIQICQAJAIAAoAqQBIgNB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRg0AIAO+IgEgAVsNACAAKAK0ASIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YNACADviIBIAFbDQAgACgCuAEiA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGDQAgA74iASABWw0ADAELIANB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRgRAQwAAwH8hDwwBCyADviIBIAFcBEBDAADAfyEPDAELIANB/////3txQYCAgIACar4hDwsgAAJ9IA4gDlwiACAHIAIgD0MAAAAAl0MAAAAAIA+8Qf////8HcUGAgID8B00bkpIiASABXHJFBEAgDiABIA6XIAG8Qf////8HcUGAgID8B0sbIAEgDrxB/////wdxQYCAgPwHTRsMAQsgASAOIAAbCzgCiAQMBgsgACgCsAQiLyAAKAKsBCIDRgRAIAIgGZMhAiAAAn0gAEECIARBfXEEfSABIBWTBSAAKgKcAiAAKgKkApIgACoCjAKSIAAqApQCkgsgBhAjIhQgFFwiAyAAQQIgBhAhIABBAhAikiAAQQIgBhAgIABBAhAkkpIiASABXHJFBEAgFCABIBSXIAG8Qf////8HcUGAgID8B0sbIAEgFLxB/////wdxQYCAgPwHTRsMAQsgASAUIAMbCzgChAQgAEEAIAIgDyAOkiATkiAQkiAFQX1xGyAHECMhDiAAQQAgBhAhIQcCQAJAICpB8OGD/AdGDQAgKkGPnrz8B0YNACAqQarVqv0HRg0AICq+IgEgAVsNACAAKAK0ASIqQfDhg/wHRg0AICpBj568/AdGDQAgKkGq1ar9B0YNACAqviIBIAFbDQAgACgCuAEiKkHw4YP8B0YNACAqQY+evPwHRg0AICpBqtWq/QdGDQAgKr4iASABWw0AQwAAAAAhAgwBC0MAAAAAIQIgKkHw4YP8B0YNACAqQY+evPwHRg0AICpBqtWq/QdGBEBDAADAfyECDAELICq+IgEgAVwEQEMAAMB/IQIMAQsgKkH/////e3FBgICAgAJqviECC0MAAAAAIQ8gByACQwAAAACXQwAAAAAgArxB/////wdxQYCAgPwHTRuSIQcgAEEAIAYQICECAkACQCApQfDhg/wHRg0AIClBj568/AdGDQAgKUGq1ar9B0YNACApviIBIAFbDQAgACgCtAEiKUHw4YP8B0YNACApQY+evPwHRg0AIClBqtWq/QdGDQAgKb4iASABWw0AIAAoArgBIilB8OGD/AdGDQAgKUGPnrz8B0YNACApQarVqv0HRg0AICm+IgEgAVsNAAwBCyApQfDhg/wHRg0AIClBj568/AdGDQAgKUGq1ar9B0YEQEMAAMB/IQ8MAQsgKb4iASABXARAQwAAwH8hDwwBCyApQf////97cUGAgICAAmq+IQ8LIAACfSAOIA5cIgAgByACIA9DAAAAAJdDAAAAACAPvEH/////B3FBgICA/AdNG5KSIgEgAVxyRQRAIA4gASAOlyABvEH/////B3FBgICA/AdLGyABIA68Qf////8HcUGAgID8B00bDAELIAEgDiAAGws4AogEDAYLAkAgCA0AIAIgGZMhDwJAIARBAkYgASAVkyIOQwAAAABfcQ0AAkAgD0MAAAAAX0UNACAFQQJHDQAgDyAPWw0BCyAEQQFHDQEgBUEBRw0BCyAAAn0gAEECQwAAAAAgDiAOQwAAAABdGyAOIARBAkYbQwAAAAAgDiAOWxsgBhAjIgIgAlwiAyAAQQIgBhAhIABBAhAikiAAQQIgBhAgIABBAhAkkpIiASABXHJFBEAgAiABIAKXIAG8Qf////8HcUGAgID8B0sbIAEgArxB/////wdxQYCAgPwHTRsMAQsgASACIAMbCzgChARDAAAAACECIABBAEMAAAAAQwAAAAAgDyAPQwAAAABdGyAPIAVBAkYbIA8gD1wbIAcQIyEOIABBACAGECEhBwJAAkAgKkHw4YP8B0YNACAqQY+evPwHRg0AICpBqtWq/QdGDQAgKr4iASABWw0AIAAoArQBIipB8OGD/AdGDQAgKkGPnrz8B0YNACAqQarVqv0HRg0AICq+IgEgAVsNACAAKAK4ASIqQfDhg/wHRg0AICpBj568/AdGDQAgKkGq1ar9B0YNACAqviIBIAFbDQAMAQsgKkHw4YP8B0YNACAqQY+evPwHRg0AICpBqtWq/QdGBEBDAADAfyECDAELICq+IgEgAVwEQEMAAMB/IQIMAQsgKkH/////e3FBgICAgAJqviECC0MAAAAAIQ8gByACQwAAAACXQwAAAAAgArxB/////wdxQYCAgPwHTRuSIQcgAEEAIAYQICECAkACQCApQfDhg/wHRg0AIClBj568/AdGDQAgKUGq1ar9B0YNACApviIBIAFbDQAgACgCtAEiKUHw4YP8B0YNACApQY+evPwHRg0AIClBqtWq/QdGDQAgKb4iASABWw0AIAAoArgBIilB8OGD/AdGDQAgKUGPnrz8B0YNACApQarVqv0HRg0AICm+IgEgAVsNAAwBCyApQfDhg/wHRg0A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AkACQCA+QQFrDgIBAAILIBIgApRDCtcjPJQhAgsgDiACIgFfDQILAkAgASABWw0AIA4gDlsNACABIQIMAgsgASAOXQRAIA4hAgwCCyAOIAEgASABXBshAgwBCwJAIEINACA1QQFzDQAgLUEAIBIQISEOAkACQCAtKAKcASIrQfDhg/wHRg0AICtBj568/AdGDQAgK0Gq1ar9B0YNACArviIBIAFbDQAgLSgCtAEiK0Hw4YP8B0YNACArQY+evPwHRg0AICtBqtWq/QdGDQAgK74iASABWw0AIC0oArgBIitB8OGD/AdGDQAgK0GPnrz8B0YNACArQarVqv0HRg0AICu+IgEgAVsNAEMAAAAAIQIMAQtDAAAAACECICtB8OGD/AdGDQAgK0GPnrz8B0YNACArQarVqv0HRgRAQwAAwH8hAgwBCyArviIBIAFcBEBDAADAfyECDAELICtB/////3txQYCAgIACar4hAgsgDiACQwAAAACXQwAAAAAgArxB/////wdxQYCAgPwHTRuSIREgLUEAIBIQICEOAkACQCAtKAKkASIrQfDhg/wHRg0AICtBj568/AdGDQAgK0Gq1ar9B0YNACArviIBIAFbDQAgLSgCtAEiK0Hw4YP8B0YNACArQY+evPwHRg0AICtBqtWq/QdGDQAgK74iASABWw0AIC0oArgBIitB8OGD/AdGDQAgK0GPnrz8B0YNACArQarVqv0HRg0AICu+IgEgAVsNAEMAAAAAIQIMAQtDAAAAACECICtB8OGD/AdGDQAgK0GPnrz8B0YNACArQarVqv0HRgRAQwAAwH8hAgwBCyArviIBIAFcBEBDAADAfyECDAELICtB/////3txQYCAgIACar4hAgsgESAOIAJDAAAAAJdDAAAAACACvEH/////B3FBgICA/AdNG5KSIQFDAADAfyECAkACQAJAIDpBAWsOAgEAAgsgGCAQlEMK1yM8lCEQCyABIBAiAl8NAgsgAiACXCABIAFccQ0BIAEgAl4EQCABIQIMAgsgASACIAIgAlwbIQIMAQsgLUECIBIQHiEWIC1BAiASEB8hDiAtKAIwIi8hAwJAAkAgL0Hw4YP8B0YiNA0AIC9Bj568/AdGDQAgL0Gq1ar9B0YNACAvviIBIAFbDQAgLSgCSCIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq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cUGAgID8B00bDAELIAEgAiADGws4AgAgAEEAICcgBxAjIRQgAEEAIAYQISECAkACQCAAKAKcASIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YNACADviIBIAFbDQAgACgCtAEiA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGDQAgA74iASABWw0AIAAoArgBIgNB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRg0AIAO+IgEgAVsNAEMAAAAAIQ8MAQtDAAAAACEPIANB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRgRAQwAAwH8hDwwBCyADviIBIAFcBEBDAADAfyEPDAELIANB/////3txQYCAgIACar4hDwtDAAAAACEBIAIgD0MAAAAAl0MAAAAAIA+8Qf////8HcUGAgID8B00bkiEOIABBACAGECAhBwJAAkAgACgCpAEiA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGDQAgA74iAiACWw0AIAAoArQBIgNB8OGD/AdGDQAgA0GPnrz8B0YNACADQarVqv0HRg0AIAO+IgIgAlsNACAAKAK4ASIDQfDhg/wHRg0AIANBj568/AdGDQAgA0Gq1ar9B0YNACADviICIAJbDQAMAQsgA0Hw4YP8B0YNACADQY+evPwHRg0AIANBqtWq/QdGBEBDAADAfyEBDAELIAO+IgEgAVwEQEMAAMB/IQEMAQsgA0H/////e3FBgICAgAJqviEBCyAAAn0gFCAUXCIDIA4gByABQwAAAACXQwAAAAAgAbxB/////wdxQYCAgPwHTRuSkiIBIAFcckUEQCAUIAEgFJcgAbxB/////wdxQYCAgPwHSxsgASAUvEH/////B3FBgICA/AdNGwwBCyABIBQgAxsLOAKIBAJAAn0CQCBHBEAgACgCGEEUdkEDcSIDQQJGDQEgR0ECRw0BCyAAICogICAhECMiAiACXCIDIAAgKiAGECEgACAqECKSIAAgKiAGECAgACAqECSSkiIBIAFcckUEQCACIAEgApcgAbxB/////wdxQYCAgPwHSxsgASACvEH/////B3FBgICA/AdNGwwCCyABIAIgAxsMAQsgR0ECRw0BIANBAkcNAQJ9IB4gGZIiAiACXCIDIAAgKiAgICEQIyIBIAFcckUE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AkEBIAFBgICAgARxGwsiBAJ/AkAgA0Hw4YP8B0cEQEMAAMB/IQZBAyADQarVqv0HRg0CGiADQY+evPwHRw0BQwAAAAAhBkEBDAILQwAAAAAhBkECDAELQQAgA74iByAHXA0AGiADQf////97cUGAgICAAmq+IQZBAkEBIANBgICAgARxGwtHDQACQCAERQ0AIAUgBVwgBiAGXHENACAFIAaTi0MXt9E4XUUNAQsCQCABQfDhg/wHRwRAQQEgAUGPnrz8B0YNBRogAUGq1ar9B0cNAQwEC0ECDAQLIAG+IgUgBVwNASABQf////97cUGAgICAAmohAkECQQEgAUGAgICABHEbDAMLIAAoAsgBIgFB8OGD/AdHBEBBASABQY+evPwHRg0DGiABQarVqv0HRg0CIAG+IgUgBVwNASABQf////97cUGAgICAAmohAkECQQEgAUGAgICABHEbDAMLQQIMAgtBgICA/gchAkEADAELQYCAgP4HIQJBAwshBCAAIAI2ArwEIAAgBDYCwAQgAAJ/AkACQAJAAkACQCAAKALcASIBQfDhg/wHRiIEDQAgAUGPnrz8B0YNACABQarVqv0HRg0AIAG+IgUgBVwNAQsgACgC1AEhA0MAAAAAIQZBAiECQwAAAAAhBQJ/QQIgBA0AGgJAIAFBqtWq/QdHBEAgAUGPnrz8B0cNAUEBDAILQwAAwH8hBUEDDAELIAG+IgUgBVwEQEMAAMB/IQVBAAwBCyABQf////97cUGAgICAAmq+IQVBAkEBIAFBgICAgARxGwshBAJAIANB8OGD/AdGDQACQCADQarVqv0HRwRAIANBj568/AdHDQFBASECDAILQwAAwH8hBkEDIQIMAQsgA74iBiAGXARAQwAAwH8hBkEAIQIMAQtBAkEBIANBgICAgARxGyECIANB/////3txQYCAgIACar4hBgsgAiAERw0AAkAgBEUNACAFIAVcIAYgBlxxDQAgBSAGk4tDF7fROF1FDQELIAFBqtWq/QdGDQFBACECQQEgAUGPnrz8B0YNBBpBAiABQfDhg/wHRg0EGiABviIFIAVcDQMgAUH/////e3FBgICAgAJqIQJBAkEBIAFBgICAgARxGwwECyAAKALMASIBQarVqv0HRg0AQQAhAkEBIAFBj568/AdGDQMaIAFB8OGD/AdHDQFBAgwDC0GA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AEEAEABBCBAdIgBBADYCBCAAQdcANgIAQcs2QewSQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQdgANgIAQcs2Qd8LQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQdkANgIAQcs2QbsRQQNBwCRB+CNBzQAgAEEAEABBCBAdIgBBADYCBCAAQdoANgIAQcs2QcMJQQNBwCRB+CNBzQAgAEEAEABBCBAdIgBBADYCBCAAQdsANgIAQcs2QfAIQQNBwCRB+CNBzQAgAEEAEABBCBAdIgBBADYCBCAAQdwANgIAQcs2QYYJQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQd4ANgIAQcs2QbUOQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQd8ANgIAQcs2QbgLQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeAANgIAQcs2QaoRQQJBrCRB+CFByQAgAEEAEABBCBAdIgBBADYCBCAAQeEANgIAQcs2QasJQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeIANgIAQcs2QcQTQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeMANgIAQcs2QZ4UQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeQANgIAQcs2QYMMQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeUANgIAQcs2QckRQQJBrCRB+CFByQAgAEEAEABBCBAdIgBBADYCBCAAQeYANgIAQcs2QfIMQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQecANgIAQcs2QZMLQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQegANgIAQcs2QZwRQQJBrCRB+CFByQAgAEEAEABBCBAdIgBBADYCBCAAQekANgIAQcs2QbAUQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQeoANgIAQcs2QZMMQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQesANgIAQcs2QYYNQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQewANgIAQcs2QaQLQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQe0ANgIAQcs2QYYUQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQe4ANgIAQcs2QfALQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQe8ANgIAQcs2QdgMQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQfAANgIAQcs2Qf8KQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQfEANgIAQcs2QYASQQNB6CRBmiRB3QAgAEEAEABBCBAdIgBBADYCBCAAQfIANgIAQcs2QawQQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQfMANgIAQcs2QZ4VQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQfQANgIAQcs2QaYMQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQfUANgIAQcs2QYsRQQRB0CRB4CRBzwAgAEEAEABBCBAdIgBBADYCBCAAQfYANgIAQcs2QdEWQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQfgANgIAQcs2QaoSQQNB/CRB4CJB+QAgAEEAEABBCBAdIgBBADYCBCAAQfoANgIAQcs2QdsKQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQfsANgIAQcs2QacOQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQfwANgIAQcs2QZQWQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQf0ANgIAQcs2QdsSQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQf4ANgIAQcs2Qf8QQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQf8ANgIAQcs2QbkKQQJB9CRBhCJB9wAgAEEAEABBCBAdIgBBADYCBCAAQYABNgIAQcs2QfYSQQNB/CRB4CJB+QAgAEEAEABBCBAdIgBBADYCBCAAQYEBNgIAQcs2QcIOQQJBiCVBhCJBggEgAEEAEABBCBAdIgBBADYCBCAAQYMBNgIAQcs2QbcJQQJBkCVBliRBhAEgAEEAEABBCBAdIgBBADYCBCAAQYUBNgIAQcs2QdITQQJBkCVBliRBhAEgAEEAEABBCBAdIgBBADYCBCAAQYYBNgIAQcs2QacUQQJBiCVB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AAAgXSADQwAAAKBecQ0AQ////18gA5giBCAEIAMgA0P////fXRsgA0P///9fXhu8QYCAgIACayEFCwJAIAAgAUECdGoiAUG8AWooAgAgBUYNACABIAU2ArwBA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLcQEBfwJAIAAoAgAiAC0ABCICQQJxQQF2IAFGDQAgACACQf0BcUECQQAgARtyOgAEA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL4wECAn0BfyAAKAIAIQBBgICA/gchBQJAIAK2IgMgA1wNACADi0MAAIB/Ww0AQfDhg/wHIQUgA0MAAAAAWw0AIANDAAAAIF0gA0MAAACgXnENAEP//39fIAOYIgQgBCADIAND//9/310bIAND//9/X14bvEGAgICAAmtBgICAgARyIQULAkAgACABQQJ0aiIBQfQAaigCACAFRg0AIAEgBTYCdANAIAAtAAQiAUEEcQ0BIAAgAUEEcjoABCAAKAIUIgEEQCAAIAERAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9wBAgJ9AX8gACgCACEAQYCAgP4HIQUCQCACtiIDIANcDQAgA4tDAACAf1sNAEGPnrz8ByEFIANDAAAAAFsNACADQwAAACBdIANDAAAAoF5xDQBD////XyADmCIEIAQgAyADQ////99dGyADQ////19eG7xBgICAgAJrIQULAkAgACABQQJ0aiIBQfQAaigCACAFRg0AIAEgBTYCdANAIAAtAAQiAUEEcQ0BIAAgAUEEcjoABCAAKAIUIgEEQCAAIAERAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC90BAgJ9AX8gACgCACEAQYCAgP4HIQUCQCACtiIDIANcDQAgA4tDAACAf1sNAEGPnrz8ByEFIANDAAAAAFsNACADQwAAACBdIANDAAAAoF5xDQBD////XyADmCIEIAQgAyADQ////99dGyADQ////19eG7xBgICAgAJrIQULAkAgACABQQJ0aiIBQZgBaigCACAFRg0AIAEgBTYCmAEDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtzAgJ9AX8CQCAAKAIAIgAqAuABIgMgAbYiAlsNACACIAJcIAMgA1xxDQAgACACOALgAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9kBAgJ9AX8gACgCACEAQYCAgP4HIQQCQCABtiICIAJcDQAgAotDAACAf1sNAEHw4YP8ByEEIAJDAAAAAFsNACACQwAAACBdIAJDAAAAoF5xDQBD//9/XyACmCIDIAMgAiACQ///f99dGyACQ///f19eG7xBgICAgAJrQYCAgIAEciEECwJAIAAoAtwBIARGDQAgACAENgLcAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9IBAgJ9AX8gACgCACEAQYCAgP4HIQQCQCABtiICIAJcDQAgAotDAACAf1sNAEGPnrz8ByEEIAJDAAAAAFsNACACQwAAACBdIAJDAAAAoF5xDQBD////XyACmCIDIAMgAiACQ////99dGyACQ////19eG7xBgICAgAJrIQQLAkAgACgC3AEgBEYNACAAIAQ2AtwBA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL2QECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQfDhg/wHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP//39fIAKYIgMgAyACIAJD//9/310bIAJD//9/X14bvEGAgICAAmtBgICAgARyIQQLAkAgACgC2AEgBEYNACAAIAQ2AtgBA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL0gECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQY+evPwHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP///9fIAKYIgMgAyACIAJD////310bIAJD////X14bvEGAgICAAmshBAsCQCAAKALYASAERg0AIAAgBDYC2AEDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvZAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBB8OGD/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ///f18gApgiAyADIAIgAkP//3/fXRsgAkP//39fXhu8QYCAgIACa0GAgICABHIhBAsCQCAAKALUASAERg0AIAAgBDYC1AEDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvSAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBBj568/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ////18gApgiAyADIAIgAkP////fXRsgAkP///9fXhu8QYCAgIACayEECwJAIAAoAtQBIARGDQAgACAENgLUAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9kBAgJ9AX8gACgCACEAQYCAgP4HIQQCQCABtiICIAJcDQAgAotDAACAf1sNAEHw4YP8ByEEIAJDAAAAAFsNACACQwAAACBdIAJDAAAAoF5xDQBD//9/XyACmCIDIAMgAiACQ///f99dGyACQ///f19eG7xBgICAgAJrQYCAgIAEciEECwJAIAAoAtABIARGDQAgACAENgLQAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC9IBAgJ9AX8gACgCACEAQYCAgP4HIQQCQCABtiICIAJcDQAgAotDAACAf1sNAEGPnrz8ByEEIAJDAAAAAFsNACACQwAAACBdIAJDAAAAoF5xDQBD////XyACmCIDIAMgAiACQ////99dGyACQ////19eG7xBgICAgAJrIQQLAkAgACgC0AEgBEYNACAAIAQ2AtABA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLZwEBfwJAIAAoAgAiACgCzAFBqtWq/QdGDQAgAEGq1ar9BzYCzAEDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvZAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBB8OGD/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ///f18gApgiAyADIAIgAkP//3/fXRsgAkP//39fXhu8QYCAgIACa0GAgICABHIhBAsCQCAAKALMASAERg0AIAAgBDYCzAEDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvSAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBBj568/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ////18gApgiAyADIAIgAkP////fXRsgAkP///9fXhu8QYCAgIACayEECwJAIAAoAswBIARGDQAgACAENgLMAQNAIAAtAAQiBEEEcQ0BIAAgBEEEcjoABCAAKAIUIgQEQCAAIAQRAAALIABBgICA/gc2ArQCIAAoAqgEIgANAAsLC2cBAX8CQCAAKAIAIgAoAsgBQarVqv0HRg0AIABBqtWq/Qc2AsgBA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL2QECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQfDhg/wHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP//39fIAKYIgMgAyACIAJD//9/310bIAJD//9/X14bvEGAgICAAmtBgICAgARyIQQLAkAgACgCyAEgBEYNACAAIAQ2AsgBA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL0gECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQY+evPwHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP///9fIAKYIgMgAyACIAJD////310bIAJD////X14bvEGAgICAAmshBAsCQCAAKALIASAERg0AIAAgBDYCyAEDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtxAgJ9AX8CQCAAKAIAIgAqAiQiAyABtiICWw0AIAIgAlwgAyADXHENACAAIAI4AiQDQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtxAgJ9AX8CQCAAKAIAIgAqAiAiAyABtiICWw0AIAIgAlwgAyADXHENACAAIAI4AiADQCAALQAEIgRBBHENASAAIARBBHI6AAQgACgCFCIEBEAgACAEEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwtlAQF/AkAgACgCACIAKAIoQarVqv0HRg0AIABBqtWq/Qc2AigDQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvXAQICfQF/IAAoAgAhAEGAgID+ByEEAkAgAbYiAiACXA0AIAKLQwAAgH9bDQBB8OGD/AchBCACQwAAAABbDQAgAkMAAAAgXSACQwAAAKBecQ0AQ///f18gApgiAyADIAIgAkP//3/fXRsgAkP//39fXhu8QYCAgIACa0GAgICABHIhBAsCQCAAKAIoIARGDQAgACAENgIoA0AgAC0ABCIEQQRxDQEgACAEQQRyOgAEIAAoAhQiBARAIAAgBBEAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsL0AECAn0BfyAAKAIAIQBBgICA/gchBAJAIAG2IgIgAlwNACACi0MAAIB/Ww0AQY+evPwHIQQgAkMAAAAAWw0AIAJDAAAAIF0gAkMAAACgXnENAEP///9fIAKYIgMgAyACIAJD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oF5xDQBD//9/XyADmCIEIAQgAyADQ///f99dGyADQ///f19eG7xBgICAgAJrQYCAgIAEciEFCwJAIAAgAUECdGoiAUHQAGooAgAgBUYNACABIAU2AlADQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwvcAQICfQF/IAAoAgAhAEGAgID+ByEFAkAgArYiAyADXA0AIAOLQwAAgH9bDQBBj568/AchBSADQwAAAABbDQAgA0MAAAAgXSADQwAAAKBecQ0AQ////18gA5giBCAEIAMgA0P////fXRsgA0P///9fXhu8QYCAgIACayEFCwJAIAAgAUECdGoiAUHQAGooAgAgBUYNACABIAU2AlADQCAALQAEIgFBBHENASAAIAFBBHI6AAQgACgCFCIBBEAgACABEQAACyAAQYCAgP4HNgK0AiAAKAKoBCIADQALCwt1AQF/AkAgACgCACIAKAIYIgJBEHZBA3EgAUYNACAAIAJB//9zcSABQRB0QYCADHFyNgIYA0AgAC0ABCIBQQRxDQEgACABQQRyOgAEIAAoAhQiAQRAIAAgAREAAAsgAEGAgID+BzYCtAIgACgCqAQiAA0ACwsLxgkCAn8DfQJAAkAgASgCACICKAIYIAAoAgAiASgCGHNB////A3ENACACKAIoIQACfwJAIAEoAigiA0Hw4YP8B0cEQEMAAMB/IQRBAyADQarVqv0HRg0CGiADQY+evPwHRw0BQwAAAAAhBEEBDAILQQIMAQtBACADviIFIAVcDQAaIANB/////3txQYCAgIACar4hBEECQQEgA0GAgICABHEbCyEDAn8CQCAAQfDhg/wHRwRAQwAAwH8hBUEDIABBqtWq/QdGDQIaIABBj568/AdHDQFDAAAAACEFQQEMAgtDAAAAACEFQQIMAQtBACAAviIGIAZcDQAaIABB/////3txQYCAgIACar4hBUECQQEgAEGAgICABHEbCyADRw0AAkAgA0UNACAEIARcIAUgBVxxDQAgBCAFk4tDF7fROF1FDQELIAEoAiwgAigCLEcNACABKAIwIAIoAjBHDQAgASgCNCACKAI0Rw0AIAEoAjggAigCOEcNACABKAI8IAIoAjxHDQAgAUFAaygCACACQUBrKAIARw0A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BCAAERMAIgVCIIinJAEgBacLqAEBBX8gACgCVCIDKAIAIQUgAygCBCIEIAAoAhQgACgCHCIHayIGIAQgBkkbIgYEQCAFIAcgBhAsGiADIAMoAgAgBmoiBTYCACADIAMoAgQgBmsiBDYCBAsgBCACIAIgBEsbIgQEQCAFIAEgBBAsGiADIAMoAgAgBGoiBTYCACADIAMoAgQgBGs2AgQLIAVBADoAACAAIAAoAiwiATYCHCAAIAE2AhQgAgsEAEIACwQAQQALigUCBn4CfyABIAEoAgBBB2pBeHEiAUEQajYCACAAIQkgASkDACEDIAEpAwghBiMAQSBrIggkAAJAIAZC////////////AIMiBEKAgICAgIDAgDx9IARCgICAgICAwP/DAH1UBEAgBkIEhiADQjyIhCEEIANC//////////8PgyIDQoGAgICAgICACFoEQCAEQoGAgICAgICAwAB8IQIMAgsgBEKAgICAgICAgEB9IQIgA0KAgICAgICAgAhSDQEgAiAEQgGDfCECDAELIANQIARCgICAgICAwP//AFQgBEKAgICAgIDA//8AURtFBEAgBkIEhiADQjyIhEL/////////A4NCgICAgICAgPz/AIQhAgwBC0KAgICAgICA+P8AIQIgBEL///////+//8MAVg0AQgAhAiAEQjCIpyIAQZH3AEkNACADIQIgBkL///////8/g0KAgICAgIDAAIQiBSEHAkAgAEGB9wBrIgFBwABxBEAgAiABQUBqrYYhB0IAIQIMAQsgAUUNACAHIAGtIgSGIAJBwAAgAWutiIQhByACIASGIQILIAggAjcDECAIIAc3AxgCQEGB+AAgAGsiAEHAAHEEQCAFIABBQGqtiCEDQgAhBQwBCyAARQ0AIAVBwAAgAGuthiADIACtIgKIhCEDIAUgAoghBQsgCCADNwMAIAggBTcDCCAIKQMIQgSGIAgpAwAiA0I8iIQhAiAIKQMQIAgpAxiEQgBSrSADQv//////////D4OEIgNCgYCAgICAgIAIWgRAIAJCAXwhAgwBCyADQoCAgICAgICACFINACACQgGDIAJ8IQILIAhBIGokACAJIAIgBkKAgICAgICAgIB/g4S/OQMAC6IYAxJ/AXwDfiMAQbAEayIMJAAgDEEANgIsAkAgAb0iGUIAUwRAQQEhEUGYCSETIAGa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CyAAKAIIEAUgAAuJAQECfyMAQTBrIgIkACABIAAoAgQiA0EBdWohASAAKAIAIQAgAiABIANBAXEEfyABKAIAIABqKAIABSAACxECAEEwEB0iACACKQMoNwMoIAAgAikDIDcDICAAIAIpAxg3AxggACACKQMQNwMQIAAgAikDCDcDCCAAIAIpAwA3AwAgAkEwaiQAIAALOwEBfyABIAAoAgQiBUEBdWohASAAKAIAIQAgASACIAMgBCAFQQFxBH8gASgCACAAaigCAAUgAAsRGQALNwEBfyABIAAoAgQiA0EBdWohASAAKAIAIQAgASACIANBAXEEfyABKAIAIABqKAIABSAACxEPAAs3AQF/IAEgACgCBCIDQQF1aiEBIAAoAgAhACABIAIgA0EBcQR/IAEoAgAgAGooAgAFIAALEQwACzUBAX8gASAAKAIEIgJBAXVqIQEgACgCACEAIAEgAkEBcQR/IAEoAgAgAGooAgAFIAALEQkAC2EBAn8jAEEQayICJAAgASAAKAIEIgNBAXVqIQEgACgCACEAIAIgASADQQFxBH8gASgCACAAaigCAAUgAAsRAgBBEBAdIgAgAikDCDcDCCAAIAIpAwA3AwAgAkEQaiQAIAALYwECfyMAQRBrIgMkACABIAAoAgQiBEEBdWohASAAKAIAIQAgAyABIAIgBEEBcQR/IAEoAgAgAGooAgAFIAALEQQAQRAQHSIAIAMpAwg3AwggACADKQMANwMAIANBEGokACAACzcBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAIAEgAiADQQFxBH8gASgCACAAaigCAAUgAAsRAwALOQEBfyABIAAoAgQiBEEBdWohASAAKAIAIQAgASACIAMgBEEBcQR/IAEoAgAgAGooAgAFIAALEQgACwkAIAEgABEBAAsFAEHLNgsPACABIAAoAgBqIAI2AgALDQAgASAAKAIAaigCAAsYAQF/QRAQHSIAQgA3AwggAEEANgIAIAALGAEBf0EQEB0iAEIANwMAIABCADcDCCAACzQBAX9BMBAdIgBCADcDACAAQgA3AyggAEIANwMgIABCADcDGCAAQgA3AxAgAEIANwMIIAALNwEBfyABIAAoAgQiA0EBdWohASAAKAIAIQAgASACIANBAXEEfyABKAIAIABqKAIABSAACxEYAAsFAEHGNgsh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IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAtgBIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAtQBIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAtABIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAswBIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIAC5cBAgF8AX0CfwJAIAEoAgAoAsgBIgFB8OGD/AdHBEBEAAAAAAAA+H8hAkEDIAFBqtWq/QdGDQIaIAFBj568/AdHDQFEAAAAAAAAAAAhAkEBDAILQQIMAQtBACABviIDIANcDQAaIAFB/////3txQYCAgIACar67IQJBAkEBIAFBgICAgARxGwshASAAIAI5AwggACABNgIACy4BAX0gACgCACIAKgIkIgEgAVwEfUMAAIA/QwAAAAAgACgCuAQtAAobBSABC7sLGgEBfSAAKAIAKgIgIgFDAAAAACABIAFbG7sLlgEDAX8BfAF9AkACQCABKAIAKAIoIgFBqtWq/QdGBH9BAwUgAUGPnrz8B0YEQEEBIQIMAwsgAUHw4YP8B0YEQEECIQIMAwsgAb4iBCAEWw0BQQALIQJEAAAAAAAA+H8hAwwBC0ECQQEgAUGAgICABHEbIQIgAUH/////e3FBgICAgAJqvrshAwsgACADOQMIIAAgAjYCAAsQACAAKAIAKAIYQRZ2QQFxCxAAIAAoAgAoAhhBFHZBA3ELqgEDAX8BfAF9QQIhAwJAAkAgASgCACACQQJ0aigCLCIBQfDhg/wHRwRARAAAAAAAAPh/IQQgAUGq1ar9B0YEQEEDIQMMAwsgAUGPnrz8B0cNAUQAAAAAAAAAACEEQQEhAwwCCwwBCyABviIFIAVcBEBBACEDDAELQQJBASABQYCAgIAEcRshAyABQf////97cUGAgICAAmq+uyEECyAAIAQ5AwggACADNgIACxAAIAAoAgAoAhhBBHZBB3ELEAAgACgCACgCGEESdkEDcQsQACAAKAIAKAIYQQJ2QQNxCxAAIAAoAgAoAhhBDXZBB3ELEAAgACgCACgCGEEKdkEHcQsQACAAKAIAKAIYQQd2QQdxC6oBAwF/AXwBfUECIQMCQAJAIAEoAgAgAkECdGooAlAiAUHw4YP8B0cEQEQAAAAAAAD4fyEEIAFBqtWq/QdGBEBBAyEDDAMLIAFBj568/AdHDQFEAAAAAAAAAAAhBEEBIQMMAgsMAQsgAb4iBSAFXARAQQAhAwwBC0ECQQEgAUGAgICABHEbIQMgAUH/////e3FBgICAgAJqvrshBAsgACAEOQMIIAAgAzYCAAsL/iEjAEGACAuhGU9ubHkgbGVhZiBub2RlcyB3aXRoIGN1c3RvbSBtZWFzdXJlIGZ1bmN0aW9uc3Nob3VsZCBtYW51YWxseSBtYXJrIHRoZW1zZWx2ZXMgYXMgZGlydHkAaXNEaXJ0eQBtYXJrRGlydHkAZGVzdHJveQBzZXREaXNwbGF5AGdldERpc3BsYXkAc2V0RmxleAAtKyAgIDBYMHgALTBYKzBYIDBYLTB4KzB4IDB4AHNldEZsZXhHcm93AGdldEZsZXhHcm93AHNldE92ZXJmbG93AGdldE92ZXJmbG93AGNhbGN1bGF0ZUxheW91dABnZXRDb21wdXRlZExheW91dAB1bnNpZ25lZCBzaG9ydABnZXRDaGlsZENvdW50AHVuc2lnbmVkIGludABzZXRKdXN0aWZ5Q29udGVudABnZXRKdXN0aWZ5Q29udGVudABzZXRBbGlnbkNvbnRlbnQAZ2V0QWxpZ25Db250ZW50AGdldFBhcmVudABpbXBsZW1lbnQAc2V0TWF4SGVpZ2h0UGVyY2VudABzZXRIZWlnaHRQZXJjZW50AHNldE1pbkhlaWdodFBlcmNlbnQAc2V0RmxleEJhc2lzUGVyY2VudABzZXRQb3NpdGlvblBlcmNlbnQAc2V0TWFyZ2luUGVyY2VudABzZXRNYXhXaWR0aFBlcmNlbnQAc2V0V2lkdGhQZXJjZW50AHNldE1pbldpZHRoUGVyY2VudABzZXRQYWRkaW5nUGVyY2VudABjcmVhdGVEZWZhdWx0AHVuaXQAcmlnaHQAaGVpZ2h0AHNldE1heEhlaWdodABnZXRNYXhIZWlnaHQAc2V0SGVpZ2h0AGdldEhlaWdodABzZXRNaW5IZWlnaHQAZ2V0TWluSGVpZ2h0AGdldENvbXB1dGVkSGVpZ2h0AGdldENvbXB1dGVkUmlnaHQAbGVmdABnZXRDb21wdXRlZExlZnQAcmVzZXQAX19kZXN0cnVjdABmbG9hdAB1aW50NjRfdAB1c2VXZWJEZWZhdWx0cwBzZXRVc2VXZWJEZWZhdWx0cwBzZXRBbGlnbkl0ZW1zAGdldEFsaWduSXRlbXMAc2V0RmxleEJhc2lzAGdldEZsZXhCYXNpcwBDYW5ub3QgZ2V0IGxheW91dCBwcm9wZXJ0aWVzIG9mIG11bHRpLWVkZ2Ugc2hvcnRoYW5kcwB1c2VMZWdhY3lTdHJldGNoQmVoYXZpb3VyAHNldFVzZUxlZ2FjeVN0cmV0Y2hCZWhhdmlvdXIAc2V0UG9pbnRTY2FsZUZhY3RvcgBNZWFzdXJlQ2FsbGJhY2tXcmFwcGVyAERpcnRpZWRDYWxsYmFja1dyYXBwZXIAQ2Fubm90IHJlc2V0IGEgbm9kZSBzdGlsbCBhdHRhY2hlZCB0byBhIG93bmVyAHNldEJvcmRlcgBnZXRCb3JkZXIAZ2V0Q29tcHV0ZWRCb3JkZXIAdW5zaWduZWQgY2hhcgB0b3AAZ2V0Q29tcHV0ZWRUb3AAc2V0RmxleFdyYXAAZ2V0RmxleFdyYXAAc2V0R2FwAGdldEdhcAAlcABzZXRIZWlnaHRBdXRvAHNldEZsZXhCYXNpc0F1dG8Ac2V0TWFyZ2luQXV0bwBzZXRXaWR0aEF1dG8AU2NhbGUgZmFjdG9yIHNob3VsZCBub3QgYmUgbGVzcyB0aGFuIHplcm8Ac2V0QXNwZWN0UmF0aW8AZ2V0QXNwZWN0UmF0aW8Ac2V0UG9zaXRpb24AZ2V0UG9zaXRpb24Abm90aWZ5T25EZXN0cnVjdGlvbgBzZXRGbGV4RGlyZWN0aW9uAGdldEZsZXhEaXJlY3Rpb24Ac2V0TWFyZ2luAGdldE1hcmdpbgBnZXRDb21wdXRlZE1hcmdpbgBuYW4AYm90dG9tAGdldENvbXB1dGVkQm90dG9tAGJvb2wAZW1zY3JpcHRlbjo6dmFsAHNldEZsZXhTaHJpbmsAZ2V0RmxleFNocmluawBNZWFzdXJlQ2FsbGJhY2sARGlydGllZENhbGxiYWNrAHdpZHRoAHNldE1heFdpZHRoAGdldE1heFdpZHRoAHNldFdpZHRoAGdldFdpZHRoAHNldE1pbldpZHRoAGdldE1pbldpZHRoAGdldENvbXB1dGVkV2lkdGgAdW5zaWduZWQgbG9uZwBzdGQ6OndzdHJpbmcAc3RkOjpzdHJpbmcAc3RkOjp1MTZzdHJpbmcAc3RkOjp1MzJzdHJpbmcAc2V0UGFkZGluZwBnZXRQYWRkaW5nAGdldENvbXB1dGVkUGFkZGluZwBUcmllZCB0byBjb25zdHJ1Y3QgWUdOb2RlIHdpdGggbnVsbCBjb25maWcAY3JlYXRlV2l0aENvbmZpZwBpbmYAc2V0QWxpZ25TZWxmAGdldEFsaWduU2VsZgBTaXplAHZhbHVlAFZhbHVlAGNyZWF0ZQBtZWFzdXJlAHNldFBvc2l0aW9uVHlwZQBnZXRQb3NpdGlvblR5cGUAaXNSZWZlcmVuY2VCYXNlbGluZQBzZXRJc1JlZmVyZW5jZUJhc2VsaW5lAGNvcHlTdHlsZQBkb3VibGUATm9kZQBleHRlbmQAaW5zZXJ0Q2hpbGQAZ2V0Q2hpbGQAcmVtb3ZlQ2hpbGQAdm9pZABhdmFpbGFibGVIZWlnaHQgaXMgaW5kZWZpbml0ZSBzbyBoZWlnaHRNZWFzdXJlTW9kZSBtdXN0IGJlIFlHTWVhc3VyZU1vZGVVbmRlZmluZWQAYXZhaWxhYmxlV2lkdGggaXMgaW5kZWZpbml0ZSBzbyB3aWR0aE1lYXN1cmVNb2RlIG11c3QgYmUgWUdNZWFzdXJlTW9kZVVuZGVmaW5lZABzZXRFeHBlcmltZW50YWxGZWF0dXJlRW5hYmxlZABpc0V4cGVyaW1lbnRhbEZlYXR1cmVFbmFibGVkAGRpcnRpZWQAQ2Fubm90IHJlc2V0IGEgbm9kZSB3aGljaCBzdGlsbCBoYXMgY2hpbGRyZW4gYXR0YWNoZWQAdW5zZXRNZWFzdXJlRnVuYwB1bnNldERpcnRpZWRGdW5jAEV4cGVjdCBjdXN0b20gYmFzZWxpbmUgZnVuY3Rpb24gdG8gbm90IHJldHVybiBOYU4ATkFOAElORgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxzaG9ydD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgc2hvcnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgaW50PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxmbG9hdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDhfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGNoYXI+AHN0ZDo6YmFzaWNfc3RyaW5nPHVuc2lnbmVkIGNoYXI+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHNpZ25lZCBjaGFyPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxsb25nPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBsb25nPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxkb3VibGU+AENoaWxkIGFscmVhZHkgaGFzIGEgb3duZXIsIGl0IG11c3QgYmUgcmVtb3ZlZCBmaXJzdC4AQ2Fubm90IHNldCBtZWFzdXJlIGZ1bmN0aW9uOiBOb2RlcyB3aXRoIG1lYXN1cmUgZnVuY3Rpb25zIGNhbm5vdCBoYXZlIGNoaWxkcmVuLgBDYW5ub3QgYWRkIGNoaWxkOiBOb2RlcyB3aXRoIG1lYXN1cmUgZnVuY3Rpb25zIGNhbm5vdCBoYXZlIGNoaWxkcmVuLgAobnVsbCkAJXMKAAABAAAAAwAAAAAAAAACAAAAAwAAAAEAAAACAAAAAAAAAAEAAAABAEGuIQsVwH8AAAAAAADAfwMAAABpaQB2AHZpAEHQIQs3KxsAACkbAABpGwAAYxsAAGkbAABjGwAAaWlpZmlmaQBcGwAALBsAAHZpaQAtGwAAcBsAAGlpaQBBkCILCbkAAAC6AAAAuwBBpCILDrkAAAC8AAAAvQAAAFwbAEHAIgs+KxsAAGkbAABjGwAAaRsAAGMbAABwGwAAaxsAAHAbAABpaWlpAAAAAFwbAABBGwAAXBsAAEMbAABEGwAAcBsAQYgjCwm+AAAAvwAAAMAAQZwjCxa+AAAAwQAAAL0AAABHGwAAXBsAAEcbAEHAIwuSA1wbAABHGwAAYxsAAF0bAAB2aWlpaQAAAFwbAABHGwAAaRsAAHZpaWYAAAAAXBsAAEcbAABdGwAAdmlpaQAAAABdGwAASBsAAGMbAABdGwAARxsAAGkAZGlpAHZpaWQAAEwbAABMGwAARxsAAFwbAABMGwAAXBsAAEwbAABLGwAAXBsAAEwbAABjGwAAAAAAAFwbAABMGwAAYxsAAGobAAB2aWlpZAAAAFwbAABMGwAAahsAAGMbAABNGwAAShsAAE0bAABjGwAAShsAAE0bAABqGwAATRsAAGobAABNGwAAYxsAAGRpaWkAAAAAaRsAAEwbAABjGwAAZmlpaQAAAABcGwAATBsAAEwbAABkGwAAXBsAAEwbAABMGwAAZBsAAE0bAABMGwAATBsAAEwbAABMGwAAZBsAAF0bAABMGwAAXBsAAEwbAABdGwAAXBsAAEwbAAApGwAAXBsAAEwbAABBGwAAXRsAAE0bAAAAAAAAXBsAAEwbAABqGwAAahsAAGMbAAB2aWlkZGkAAEkbAABNGwBB4CYLQRkACgAZGRkAAAAABQAAAAAAAAkAAAAACwAAAAAAAAAAGQARChkZGQMKBwABAAkLGAAACQYLAAALAAYZAAAAGRkZAEGxJwshDgAAAAAAAAAAGQAKDRkZGQANAAACAAkOAAAACQAOAAAOAEHrJwsBDABB9ycLFRMAAAAAEwAAAAAJDAAAAAAADAAADABBpSgLARAAQbEoCxUPAAAABA8AAAAACRAAAAAAABAAABAAQd8oCwESAEHrKAseEQAAAAARAAAAAAkSAAAAAAASAAASAAAaAAAAGhoaAEGiKQsOGgAAABoaGgAAAAAAAAkAQdMpCwEUAEHfKQsVFwAAAAAXAAAAAAkUAAAAAAAUAAAUAEGNKgsBFgBBmSoLJxUAAAAAFQAAAAAJFgAAAAAAFgAAFgAAMDEyMzQ1Njc4OUFCQ0RFRgBB5CoLAccAQYwrCwj//////////wBB0CsLCaAfAQAAAAAABQBB5CsLAcIAQfwrCwrDAAAAxAAAAIQbAEGULAsBAgBBpCwLCP//////////AEHoLAsBBQBB9CwLAcUAQYwtCw7DAAAAxgAAAJgbAAAABABBpC0LAQEAQbQtCwX/////CgBB+C0LAcg=", "base64"));
  }
  const tried = [];
  for (const candidate of wasmCandidates()) {
    tried.push(candidate);
    if (!existsSync(candidate)) continue;
    return initYoga(await readFile(candidate));
  }
  throw new Error(`yoga.wasm not found; tried:
${tried.join("\n")}`);
}
var yogaPromise = null;
function safePercent(s) {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : void 0;
}
function safeDim(v) {
  return Number.isFinite(v) && v >= 0 ? v : void 0;
}
async function getYoga() {
  yogaPromise ??= loadYoga();
  return yogaPromise;
}
function applyStyleToNode(node, style, yoga2) {
  const s = normalizeStyle(style);
  if (s.flexDirection === "row") {
    node.setFlexDirection(yoga2.FLEX_DIRECTION_ROW);
  } else {
    node.setFlexDirection(yoga2.FLEX_DIRECTION_COLUMN);
  }
  if (s.justifyContent === "center") {
    node.setJustifyContent(yoga2.JUSTIFY_CENTER);
  } else if (s.justifyContent === "flex-end") {
    node.setJustifyContent(yoga2.JUSTIFY_FLEX_END);
  } else if (s.justifyContent === "space-between") {
    node.setJustifyContent(yoga2.JUSTIFY_SPACE_BETWEEN);
  } else if (s.justifyContent === "space-around") {
    node.setJustifyContent(yoga2.JUSTIFY_SPACE_AROUND);
  } else {
    node.setJustifyContent(yoga2.JUSTIFY_FLEX_START);
  }
  if (s.alignItems === "center") {
    node.setAlignItems(yoga2.ALIGN_CENTER);
  } else if (s.alignItems === "flex-end") {
    node.setAlignItems(yoga2.ALIGN_FLEX_END);
  } else if (s.alignItems === "stretch") {
    node.setAlignItems(yoga2.ALIGN_STRETCH);
  } else if (s.alignItems === "flex-start") {
    node.setAlignItems(yoga2.ALIGN_FLEX_START);
  }
  if (typeof s.width === "number") {
    const v = safeDim(s.width);
    if (v !== void 0) node.setWidth(v);
  } else if (typeof s.width === "string" && s.width.endsWith("%")) {
    const v = safePercent(s.width);
    if (v !== void 0) node.setWidthPercent(v);
  }
  if (typeof s.height === "number") {
    const v = safeDim(s.height);
    if (v !== void 0) node.setHeight(v);
  } else if (typeof s.height === "string" && s.height.endsWith("%")) {
    const v = safePercent(s.height);
    if (v !== void 0) node.setHeightPercent(v);
  }
  if (s.paddingTop !== void 0) node.setPadding(yoga2.EDGE_TOP, s.paddingTop);
  if (s.paddingRight !== void 0)
    node.setPadding(yoga2.EDGE_RIGHT, s.paddingRight);
  if (s.paddingBottom !== void 0)
    node.setPadding(yoga2.EDGE_BOTTOM, s.paddingBottom);
  if (s.paddingLeft !== void 0)
    node.setPadding(yoga2.EDGE_LEFT, s.paddingLeft);
  if (s.marginTop !== void 0) node.setMargin(yoga2.EDGE_TOP, s.marginTop);
  if (s.marginRight !== void 0)
    node.setMargin(yoga2.EDGE_RIGHT, s.marginRight);
  if (s.marginBottom !== void 0)
    node.setMargin(yoga2.EDGE_BOTTOM, s.marginBottom);
  if (s.marginLeft !== void 0)
    node.setMargin(yoga2.EDGE_LEFT, s.marginLeft);
  if (s.position === "absolute") {
    node.setPositionType(yoga2.POSITION_TYPE_ABSOLUTE);
    if (s.top !== void 0) node.setPosition(yoga2.EDGE_TOP, s.top);
    if (s.right !== void 0) node.setPosition(yoga2.EDGE_RIGHT, s.right);
    if (s.bottom !== void 0) node.setPosition(yoga2.EDGE_BOTTOM, s.bottom);
    if (s.left !== void 0) node.setPosition(yoga2.EDGE_LEFT, s.left);
  }
  if (s.flexWrap === "wrap") node.setFlexWrap(yoga2.WRAP_WRAP);
  else if (s.flexWrap === "wrap-reverse") node.setFlexWrap(yoga2.WRAP_WRAP_REVERSE);
  if (s.flexGrow !== void 0) node.setFlexGrow(s.flexGrow);
  if (s.flexShrink !== void 0) node.setFlexShrink(s.flexShrink);
  if (s.flexBasis !== void 0) {
    if (typeof s.flexBasis === "number") {
      const v = safeDim(s.flexBasis);
      if (v !== void 0) node.setFlexBasis(v);
    } else if (typeof s.flexBasis === "string") {
      const v = safePercent(s.flexBasis);
      if (v !== void 0) node.setFlexBasisPercent(v);
    }
  }
  if (s.gap !== void 0) node.setGap(yoga2.GUTTER_ALL, s.gap);
  if (s.rowGap !== void 0) node.setGap(yoga2.GUTTER_ROW, s.rowGap);
  if (s.columnGap !== void 0) node.setGap(yoga2.GUTTER_COLUMN, s.columnGap);
  if (typeof s.minWidth === "number") {
    const v = safeDim(s.minWidth);
    if (v !== void 0) node.setMinWidth(v);
  } else if (typeof s.minWidth === "string") {
    const v = safePercent(s.minWidth);
    if (v !== void 0) node.setMinWidthPercent(v);
  }
  if (typeof s.maxWidth === "number") {
    const v = safeDim(s.maxWidth);
    if (v !== void 0) node.setMaxWidth(v);
  } else if (typeof s.maxWidth === "string") {
    const v = safePercent(s.maxWidth);
    if (v !== void 0) node.setMaxWidthPercent(v);
  }
  if (typeof s.minHeight === "number") {
    const v = safeDim(s.minHeight);
    if (v !== void 0) node.setMinHeight(v);
  } else if (typeof s.minHeight === "string") {
    const v = safePercent(s.minHeight);
    if (v !== void 0) node.setMinHeightPercent(v);
  }
  if (typeof s.maxHeight === "number") {
    const v = safeDim(s.maxHeight);
    if (v !== void 0) node.setMaxHeight(v);
  } else if (typeof s.maxHeight === "string") {
    const v = safePercent(s.maxHeight);
    if (v !== void 0) node.setMaxHeightPercent(v);
  }
  if (s.alignSelf === "center") node.setAlignSelf(yoga2.ALIGN_CENTER);
  else if (s.alignSelf === "flex-start") node.setAlignSelf(yoga2.ALIGN_FLEX_START);
  else if (s.alignSelf === "flex-end") node.setAlignSelf(yoga2.ALIGN_FLEX_END);
  else if (s.alignSelf === "stretch") node.setAlignSelf(yoga2.ALIGN_STRETCH);
  if (s.aspectRatio !== void 0) node.setAspectRatio(s.aspectRatio);
  if (s.display === "none") node.setDisplay(yoga2.DISPLAY_NONE);
}

// src/layout/measureBridge.ts
var SHRINK_WRAPPED_SINGLE_LINE_WIDTH_FACTOR = 1.03;
var intrinsicSingleLineMeasurements = /* @__PURE__ */ new WeakMap();
function addIntrinsicSingleLineWidthSlack(measuredWidth) {
  return Math.ceil(measuredWidth * SHRINK_WRAPPED_SINGLE_LINE_WIDTH_FACTOR);
}
function getSingleLineShrinkWrappedWidth(astNode, computedWidth) {
  const measurement = intrinsicSingleLineMeasurements.get(astNode);
  return measurement !== void 0 && Math.abs(measurement.width - computedWidth) <= 1 / 64 ? measurement.width : void 0;
}
function attachMeasureFunction(yogaNode, astNode, slideWidth) {
  yogaNode.setMeasureFunc(
    (maxWidth, widthMode, _maxHeight, _heightMode) => {
      try {
        const rawConstraint = widthMode === MEASURE_MODE_EXACTLY || widthMode === MEASURE_MODE_AT_MOST ? maxWidth : slideWidth;
        const textStyle = astNode.style;
        const fontFamily = textStyle?.fontFamily ?? "Arial";
        const safetyFactor = isSubstitutedFont(fontFamily) ? 0.98 : 0.995;
        const constraintWidth = rawConstraint !== void 0 ? rawConstraint * safetyFactor : void 0;
        let shapedRuns = getCachedShapedRuns(astNode);
        if (!shapedRuns) {
          precomputeShapedSegments(astNode);
          shapedRuns = getCachedShapedRuns(astNode);
        }
        if (!shapedRuns || shapedRuns.length === 0) {
          intrinsicSingleLineMeasurements.delete(astNode);
          return { width: 0, height: 0 };
        }
        const lineHeightOverride = textStyle?.lineHeight;
        let maxLineHeight = 0;
        const allSegments = [];
        for (const run of shapedRuns) {
          const effectiveLh = resolveLineHeightPixels(
            lineHeightOverride,
            textStyle?.fontSize ?? 16,
            run.lineHeight
          );
          if (effectiveLh > maxLineHeight) maxLineHeight = effectiveLh;
          for (const seg of run.segments) {
            allSegments.push({ ...seg, lineHeight: effectiveLh });
          }
        }
        const textAlign = textStyle?.textAlign;
        const kpResult = constraintWidth !== void 0 ? knuthPlassLineBreak(allSegments, constraintWidth, { textAlign }) : { lineCount: 1, maxLineWidth: allSegments.reduce((s, seg) => s + seg.pixelWidth, 0), totalHeight: maxLineHeight };
        const intrinsicWidth = addIntrinsicSingleLineWidthSlack(kpResult.maxLineWidth);
        const isSingleLineShrinkWrapped = widthMode !== MEASURE_MODE_EXACTLY && kpResult.lineCount === 1 && (constraintWidth === void 0 || intrinsicWidth <= constraintWidth);
        if (isSingleLineShrinkWrapped) {
          intrinsicSingleLineMeasurements.set(astNode, { width: intrinsicWidth });
        } else {
          intrinsicSingleLineMeasurements.delete(astNode);
        }
        return {
          width: Math.max(0, isSingleLineShrinkWrapped ? intrinsicWidth : kpResult.maxLineWidth),
          height: Math.max(0, kpResult.totalHeight)
        };
      } catch (e) {
        const fontSize = astNode.style?.fontSize ?? 16;
        const fallbackWidth = maxWidth > 0 ? maxWidth : slideWidth ?? fontSize * 10;
        const fallbackHeight = fontSize * 1.2;
        intrinsicSingleLineMeasurements.delete(astNode);
        getLogger().warn(`[measureBridge] Text measurement failed: ${e.message}. Using fallback ${Math.round(fallbackWidth)}\xD7${Math.round(fallbackHeight)}.`);
        return { width: Math.max(0, fallbackWidth), height: Math.max(0, fallbackHeight) };
      }
    }
  );
}

// src/layout/build.ts
function detectRtl(astNode) {
  switch (astNode.type) {
    case "Text":
      if (astNode.style?.rtl) return true;
      break;
    case "View":
      if (astNode.textStyle?.rtl) return true;
    // fall through to scan children
    // eslint-disable-next-line no-fallthrough
    case "Group":
    case "Slide":
      for (const child of astNode.children ?? []) {
        if (detectRtl(child)) return true;
      }
      break;
  }
  return false;
}
function buildYogaTree(astNode, yoga2, slideWidth) {
  const node = yoga2.Node.create();
  if (astNode.style) {
    applyStyleToNode(node, astNode.style, yoga2);
  }
  switch (astNode.type) {
    case "Slide":
    case "View":
    case "Group": {
      const children = astNode.children ?? [];
      children.forEach((child, index) => {
        const childNode = buildYogaTree(child, yoga2, slideWidth);
        node.insertChild(childNode, index);
      });
      break;
    }
    case "Text":
      precomputeShapedSegments(astNode);
      attachMeasureFunction(node, astNode, slideWidth);
      break;
    case "Image":
      break;
    case "Table":
      break;
    case "Chart":
      break;
    case "Connector":
      break;
    case "Video":
    case "Audio":
      break;
  }
  return node;
}

// src/layout/extract.ts
function extractAbsoluteLayout(astNode, yogaNode, parentX = 0, parentY = 0) {
  const localX = yogaNode.getComputedLeft();
  const localY = yogaNode.getComputedTop();
  const width = yogaNode.getComputedWidth();
  const height = yogaNode.getComputedHeight();
  const absoluteX = parentX + localX;
  const absoluteY = parentY + localY;
  const layout = { x: absoluteX, y: absoluteY, width, height };
  const tableData = astNode.tableData;
  const clonedTableData = tableData ? structuredClone(tableData) : void 0;
  const singleLineShrinkWrappedWidth = astNode.type === "Text" ? getSingleLineShrinkWrappedWidth(astNode, width) : void 0;
  const intrinsicTextLayout = singleLineShrinkWrappedWidth !== void 0 ? { _singleLineShrinkWrappedWidth: singleLineShrinkWrappedWidth } : {};
  const spread = clonedTableData !== void 0 ? { ...astNode, layout, tableData: clonedTableData, ...intrinsicTextLayout } : { ...astNode, layout, ...intrinsicTextLayout };
  const result = spread;
  try {
    if (astNode.type === "View" || astNode.type === "Slide" || astNode.type === "Group") {
      const children = astNode.children ?? [];
      const childYogaNodes = children.map((_, index) => yogaNode.getChild(index));
      result.children = children.map((childAst, index) => {
        return extractAbsoluteLayout(childAst, childYogaNodes[index], absoluteX, absoluteY);
      });
    }
  } finally {
    yogaNode.free();
  }
  return result;
}

// src/layout/ghostGrid.ts
var DEFAULT_DPI = 96;
var EMU_PER_INCH = 914400;
function pixelToEmu(dpi) {
  return EMU_PER_INCH / dpi;
}
var EPSILON = 0.5;
function extractEdges(root) {
  const xEdges = [];
  const yEdges = [];
  const tables = [];
  let dfsCounter = 0;
  function walk(node, depth) {
    if (node.style?.display === "none") return;
    const order = dfsCounter++;
    const { x, y, width, height } = node.layout;
    const isSlideEdge = node.type === "Slide";
    const left = x;
    const right = x + width;
    const centerX = x + width / 2;
    const top = y;
    const bottom = y + height;
    const centerY = y + height / 2;
    xEdges.push(
      { value: left, node, edgeType: "left", depth, dfsOrder: order, isSlideEdge },
      { value: right, node, edgeType: "right", depth, dfsOrder: order, isSlideEdge },
      { value: centerX, node, edgeType: "centerX", depth, dfsOrder: order, isSlideEdge }
    );
    yEdges.push(
      { value: top, node, edgeType: "top", depth, dfsOrder: order, isSlideEdge },
      { value: bottom, node, edgeType: "bottom", depth, dfsOrder: order, isSlideEdge },
      { value: centerY, node, edgeType: "centerY", depth, dfsOrder: order, isSlideEdge }
    );
    if (node.type === "Table") {
      tables.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child, depth + 1);
      }
    }
  }
  walk(root, 0);
  return { xEdges, yEdges, tables };
}
function buildClusters(edges) {
  if (edges.length === 0) return [];
  edges.sort((a, b) => a.value - b.value || a.dfsOrder - b.dfsOrder);
  const clusters = [];
  let clusterStart = 0;
  for (let i = 1; i <= edges.length; i++) {
    if (i === edges.length || edges[i].value - edges[clusterStart].value > EPSILON) {
      if (i - clusterStart >= 2) {
        clusters.push({
          edges: edges.slice(clusterStart, i),
          anchorValue: 0
          // resolved in Phase B
        });
      }
      clusterStart = i;
    }
  }
  return clusters;
}
function selectAnchor(cluster) {
  let best = cluster.edges[0];
  for (let i = 1; i < cluster.edges.length; i++) {
    const edge = cluster.edges[i];
    if (edge.isSlideEdge && !best.isSlideEdge) {
      best = edge;
      continue;
    }
    if (!edge.isSlideEdge && best.isSlideEdge) continue;
    if (edge.depth < best.depth) {
      best = edge;
      continue;
    }
    if (edge.depth > best.depth) continue;
    if (edge.dfsOrder < best.dfsOrder) {
      best = edge;
    }
  }
  return best.value;
}
function getPlan(plans, node) {
  let plan = plans.get(node);
  if (!plan) {
    plan = {
      originalX: node.layout.x,
      originalY: node.layout.y,
      originalW: node.layout.width,
      originalH: node.layout.height,
      centerDeltaX: 0,
      centerDeltaY: 0
    };
    plans.set(node, plan);
  }
  return plan;
}
function resolveAndMutate(clusters) {
  const plans = /* @__PURE__ */ new Map();
  for (const cluster of clusters) {
    const anchor = selectAnchor(cluster);
    cluster.anchorValue = anchor;
    for (const edge of cluster.edges) {
      const plan = getPlan(plans, edge.node);
      switch (edge.edgeType) {
        case "left":
          plan.newLeft = anchor;
          break;
        case "right":
          plan.newRight = anchor;
          break;
        case "top":
          plan.newTop = anchor;
          break;
        case "bottom":
          plan.newBottom = anchor;
          break;
        case "centerX":
          plan.centerDeltaX = anchor - (plan.originalX + plan.originalW / 2);
          break;
        case "centerY":
          plan.centerDeltaY = anchor - (plan.originalY + plan.originalH / 2);
          break;
      }
    }
  }
  for (const [node, plan] of plans) {
    if (plan.centerDeltaX !== 0) {
      node.layout.x = plan.originalX + plan.centerDeltaX;
      plan.originalX = node.layout.x;
    }
    if (plan.centerDeltaY !== 0) {
      node.layout.y = plan.originalY + plan.centerDeltaY;
      plan.originalY = node.layout.y;
    }
    if (plan.newLeft !== void 0) {
      node.layout.x = plan.newLeft;
    }
    if (plan.newTop !== void 0) {
      node.layout.y = plan.newTop;
    }
    if (plan.newLeft !== void 0 && plan.newRight !== void 0) {
      node.layout.width = Math.max(plan.newRight - plan.newLeft, 0);
    } else if (plan.newLeft !== void 0) {
      const originalRight = plan.originalX + plan.originalW;
      node.layout.width = Math.max(originalRight - plan.newLeft, 0);
    } else if (plan.newRight !== void 0) {
      node.layout.width = Math.max(plan.newRight - plan.originalX, 0);
    }
    if (plan.newTop !== void 0 && plan.newBottom !== void 0) {
      node.layout.height = Math.max(plan.newBottom - plan.newTop, 0);
    } else if (plan.newTop !== void 0) {
      const originalBottom = plan.originalY + plan.originalH;
      node.layout.height = Math.max(originalBottom - plan.newTop, 0);
    } else if (plan.newBottom !== void 0) {
      node.layout.height = Math.max(plan.newBottom - plan.originalY, 0);
    }
  }
}
function enforceTableGrids(tables, pxToEmu) {
  for (const table of tables) {
    const tableData = table.tableData;
    if (!tableData || !tableData.columns || tableData.columns.length === 0) continue;
    const tableWidth = table.layout.width;
    const targetTotal = Math.round(tableWidth * pxToEmu);
    const colEmus = tableData.columns.map((c) => Math.round(c * pxToEmu));
    const currentTotal = colEmus.reduce((sum, v) => sum + v, 0);
    let error = targetTotal - currentTotal;
    if (error !== 0) {
      const indices = tableData.columns.map((_, i) => i);
      indices.sort((a, b) => colEmus[b] - colEmus[a]);
      const step = error > 0 ? 1 : -1;
      let idx = 0;
      while (error !== 0) {
        colEmus[indices[idx % indices.length]] += step;
        error -= step;
        idx++;
      }
    }
    for (let i = 0; i < tableData.columns.length; i++) {
      tableData.columns[i] = colEmus[i] / pxToEmu;
    }
  }
}
function clampZeroDimensions(root, pxToEmu) {
  const minPx = 1 / pxToEmu;
  let clampCount = 0;
  function walk(node) {
    if (Math.round(node.layout.width * pxToEmu) === 0) {
      node.layout.width = minPx;
      clampCount++;
    }
    if (Math.round(node.layout.height * pxToEmu) === 0) {
      node.layout.height = minPx;
      clampCount++;
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }
  walk(root);
  if (clampCount > 0) {
  }
}
function applyGhostGrid(root, dpi = DEFAULT_DPI) {
  const pxToEmu = pixelToEmu(dpi);
  const { xEdges, yEdges, tables } = extractEdges(root);
  const xClusters = buildClusters(xEdges);
  const yClusters = buildClusters(yEdges);
  resolveAndMutate([...xClusters, ...yClusters]);
  enforceTableGrids(tables, pxToEmu);
  clampZeroDimensions(root, pxToEmu);
}

// src/layout/index.ts
function freeYogaTree(node) {
  const childCount = node.getChildCount();
  const children = [];
  for (let i = 0; i < childCount; i++) {
    children.push(node.getChild(i));
  }
  for (const child of children) {
    freeYogaTree(child);
  }
  node.free();
}
async function runLayoutOnNode(astNode, width, height) {
  const yoga2 = await getYoga();
  const rootNode = buildYogaTree(astNode, yoga2, width);
  try {
    const t0 = performance.now();
    const direction = detectRtl(astNode) ? yoga2.DIRECTION_RTL : yoga2.DIRECTION_LTR;
    rootNode.calculateLayout(width, height, direction);
    getLogger().metric?.("yoga.calculateLayout", performance.now() - t0, { width: String(width), height: String(height) });
    return extractAbsoluteLayout(astNode, rootNode);
  } catch (err) {
    freeYogaTree(rootNode);
    throw err;
  }
}
async function runLayout(slide, width = DEFAULT_SLIDE_WIDTH_PX, height = DEFAULT_SLIDE_HEIGHT_PX) {
  return runLayoutOnNode(slide, width, height);
}

export {
  getYoga,
  applyStyleToNode,
  detectRtl,
  buildYogaTree,
  extractAbsoluteLayout,
  applyGhostGrid,
  runLayoutOnNode,
  runLayout
};
//# sourceMappingURL=chunk-5QLWVG23.js.map
