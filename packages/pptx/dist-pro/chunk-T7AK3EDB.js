import { createRequire as __runstampCreateRequire } from "node:module";
import { dirname as __runstampDirname } from "node:path";
import { fileURLToPath as __runstampFileURLToPath } from "node:url";
const __filename = __runstampFileURLToPath(import.meta.url);
const __dirname = __runstampDirname(__filename);
const require = __runstampCreateRequire(import.meta.url);
import {
  fetchWithRetry,
  resolveColorValue,
  resolveEffectiveViewGeometry
} from "./chunk-XZ4AHITT.js";
import {
  ensureFontsRegistered,
  planTableLayout,
  resolveTableColumns
} from "./chunk-IC35FUMW.js";
import {
  validateFetchUrl
} from "./chunk-WVTVGR3K.js";
import {
  resolveLineHeightPixels
} from "./chunk-IQGCGBYO.js";
import {
  FETCH_TIMEOUT_MS,
  validateDataUrlSize
} from "./chunk-XU7YQ73E.js";
import {
  getLogger
} from "./chunk-MV7M6AY2.js";
import {
  __commonJS,
  __toESM
} from "./chunk-VIXD5LXH.js";

// ../../node_modules/.pnpm/jpeg-js@0.4.4/node_modules/jpeg-js/lib/encoder.js
var require_encoder = __commonJS({
  "../../node_modules/.pnpm/jpeg-js@0.4.4/node_modules/jpeg-js/lib/encoder.js"(exports, module) {
    var btoa = btoa || function(buf) {
      return Buffer.from(buf).toString("base64");
    };
    function JPEGEncoder(quality) {
      var self = this;
      var fround = Math.round;
      var ffloor = Math.floor;
      var YTable = new Array(64);
      var UVTable = new Array(64);
      var fdtbl_Y = new Array(64);
      var fdtbl_UV = new Array(64);
      var YDC_HT;
      var UVDC_HT;
      var YAC_HT;
      var UVAC_HT;
      var bitcode = new Array(65535);
      var category = new Array(65535);
      var outputfDCTQuant = new Array(64);
      var DU = new Array(64);
      var byteout = [];
      var bytenew = 0;
      var bytepos = 7;
      var YDU = new Array(64);
      var UDU = new Array(64);
      var VDU = new Array(64);
      var clt = new Array(256);
      var RGB_YUV_TABLE = new Array(2048);
      var currentQuality;
      var ZigZag = [
        0,
        1,
        5,
        6,
        14,
        15,
        27,
        28,
        2,
        4,
        7,
        13,
        16,
        26,
        29,
        42,
        3,
        8,
        12,
        17,
        25,
        30,
        41,
        43,
        9,
        11,
        18,
        24,
        31,
        40,
        44,
        53,
        10,
        19,
        23,
        32,
        39,
        45,
        52,
        54,
        20,
        22,
        33,
        38,
        46,
        51,
        55,
        60,
        21,
        34,
        37,
        47,
        50,
        56,
        59,
        61,
        35,
        36,
        48,
        49,
        57,
        58,
        62,
        63
      ];
      var std_dc_luminance_nrcodes = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
      var std_dc_luminance_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      var std_ac_luminance_nrcodes = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125];
      var std_ac_luminance_values = [
        1,
        2,
        3,
        0,
        4,
        17,
        5,
        18,
        33,
        49,
        65,
        6,
        19,
        81,
        97,
        7,
        34,
        113,
        20,
        50,
        129,
        145,
        161,
        8,
        35,
        66,
        177,
        193,
        21,
        82,
        209,
        240,
        36,
        51,
        98,
        114,
        130,
        9,
        10,
        22,
        23,
        24,
        25,
        26,
        37,
        38,
        39,
        40,
        41,
        42,
        52,
        53,
        54,
        55,
        56,
        57,
        58,
        67,
        68,
        69,
        70,
        71,
        72,
        73,
        74,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        225,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        241,
        242,
        243,
        244,
        245,
        246,
        247,
        248,
        249,
        250
      ];
      var std_dc_chrominance_nrcodes = [0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
      var std_dc_chrominance_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      var std_ac_chrominance_nrcodes = [0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119];
      var std_ac_chrominance_values = [
        0,
        1,
        2,
        3,
        17,
        4,
        5,
        33,
        49,
        6,
        18,
        65,
        81,
        7,
        97,
        113,
        19,
        34,
        50,
        129,
        8,
        20,
        66,
        145,
        161,
        177,
        193,
        9,
        35,
        51,
        82,
        240,
        21,
        98,
        114,
        209,
        10,
        22,
        36,
        52,
        225,
        37,
        241,
        23,
        24,
        25,
        26,
        38,
        39,
        40,
        41,
        42,
        53,
        54,
        55,
        56,
        57,
        58,
        67,
        68,
        69,
        70,
        71,
        72,
        73,
        74,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        130,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        242,
        243,
        244,
        245,
        246,
        247,
        248,
        249,
        250
      ];
      function initQuantTables(sf) {
        var YQT = [
          16,
          11,
          10,
          16,
          24,
          40,
          51,
          61,
          12,
          12,
          14,
          19,
          26,
          58,
          60,
          55,
          14,
          13,
          16,
          24,
          40,
          57,
          69,
          56,
          14,
          17,
          22,
          29,
          51,
          87,
          80,
          62,
          18,
          22,
          37,
          56,
          68,
          109,
          103,
          77,
          24,
          35,
          55,
          64,
          81,
          104,
          113,
          92,
          49,
          64,
          78,
          87,
          103,
          121,
          120,
          101,
          72,
          92,
          95,
          98,
          112,
          100,
          103,
          99
        ];
        for (var i = 0; i < 64; i++) {
          var t = ffloor((YQT[i] * sf + 50) / 100);
          if (t < 1) {
            t = 1;
          } else if (t > 255) {
            t = 255;
          }
          YTable[ZigZag[i]] = t;
        }
        var UVQT = [
          17,
          18,
          24,
          47,
          99,
          99,
          99,
          99,
          18,
          21,
          26,
          66,
          99,
          99,
          99,
          99,
          24,
          26,
          56,
          99,
          99,
          99,
          99,
          99,
          47,
          66,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99
        ];
        for (var j = 0; j < 64; j++) {
          var u = ffloor((UVQT[j] * sf + 50) / 100);
          if (u < 1) {
            u = 1;
          } else if (u > 255) {
            u = 255;
          }
          UVTable[ZigZag[j]] = u;
        }
        var aasf = [
          1,
          1.387039845,
          1.306562965,
          1.175875602,
          1,
          0.785694958,
          0.5411961,
          0.275899379
        ];
        var k = 0;
        for (var row = 0; row < 8; row++) {
          for (var col = 0; col < 8; col++) {
            fdtbl_Y[k] = 1 / (YTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            fdtbl_UV[k] = 1 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            k++;
          }
        }
      }
      function computeHuffmanTbl(nrcodes, std_table) {
        var codevalue = 0;
        var pos_in_table = 0;
        var HT = new Array();
        for (var k = 1; k <= 16; k++) {
          for (var j = 1; j <= nrcodes[k]; j++) {
            HT[std_table[pos_in_table]] = [];
            HT[std_table[pos_in_table]][0] = codevalue;
            HT[std_table[pos_in_table]][1] = k;
            pos_in_table++;
            codevalue++;
          }
          codevalue *= 2;
        }
        return HT;
      }
      function initHuffmanTbl() {
        YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes, std_dc_luminance_values);
        UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes, std_dc_chrominance_values);
        YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes, std_ac_luminance_values);
        UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes, std_ac_chrominance_values);
      }
      function initCategoryNumber() {
        var nrlower = 1;
        var nrupper = 2;
        for (var cat = 1; cat <= 15; cat++) {
          for (var nr = nrlower; nr < nrupper; nr++) {
            category[32767 + nr] = cat;
            bitcode[32767 + nr] = [];
            bitcode[32767 + nr][1] = cat;
            bitcode[32767 + nr][0] = nr;
          }
          for (var nrneg = -(nrupper - 1); nrneg <= -nrlower; nrneg++) {
            category[32767 + nrneg] = cat;
            bitcode[32767 + nrneg] = [];
            bitcode[32767 + nrneg][1] = cat;
            bitcode[32767 + nrneg][0] = nrupper - 1 + nrneg;
          }
          nrlower <<= 1;
          nrupper <<= 1;
        }
      }
      function initRGBYUVTable() {
        for (var i = 0; i < 256; i++) {
          RGB_YUV_TABLE[i] = 19595 * i;
          RGB_YUV_TABLE[i + 256 >> 0] = 38470 * i;
          RGB_YUV_TABLE[i + 512 >> 0] = 7471 * i + 32768;
          RGB_YUV_TABLE[i + 768 >> 0] = -11059 * i;
          RGB_YUV_TABLE[i + 1024 >> 0] = -21709 * i;
          RGB_YUV_TABLE[i + 1280 >> 0] = 32768 * i + 8421375;
          RGB_YUV_TABLE[i + 1536 >> 0] = -27439 * i;
          RGB_YUV_TABLE[i + 1792 >> 0] = -5329 * i;
        }
      }
      function writeBits(bs) {
        var value = bs[0];
        var posval = bs[1] - 1;
        while (posval >= 0) {
          if (value & 1 << posval) {
            bytenew |= 1 << bytepos;
          }
          posval--;
          bytepos--;
          if (bytepos < 0) {
            if (bytenew == 255) {
              writeByte(255);
              writeByte(0);
            } else {
              writeByte(bytenew);
            }
            bytepos = 7;
            bytenew = 0;
          }
        }
      }
      function writeByte(value) {
        byteout.push(value);
      }
      function writeWord(value) {
        writeByte(value >> 8 & 255);
        writeByte(value & 255);
      }
      function fDCTQuant(data, fdtbl) {
        var d0, d1, d2, d3, d4, d5, d6, d7;
        var dataOff = 0;
        var i;
        var I8 = 8;
        var I64 = 64;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 1];
          d2 = data[dataOff + 2];
          d3 = data[dataOff + 3];
          d4 = data[dataOff + 4];
          d5 = data[dataOff + 5];
          d6 = data[dataOff + 6];
          d7 = data[dataOff + 7];
          var tmp0 = d0 + d7;
          var tmp7 = d0 - d7;
          var tmp1 = d1 + d6;
          var tmp6 = d1 - d6;
          var tmp2 = d2 + d5;
          var tmp5 = d2 - d5;
          var tmp3 = d3 + d4;
          var tmp4 = d3 - d4;
          var tmp10 = tmp0 + tmp3;
          var tmp13 = tmp0 - tmp3;
          var tmp11 = tmp1 + tmp2;
          var tmp12 = tmp1 - tmp2;
          data[dataOff] = tmp10 + tmp11;
          data[dataOff + 4] = tmp10 - tmp11;
          var z1 = (tmp12 + tmp13) * 0.707106781;
          data[dataOff + 2] = tmp13 + z1;
          data[dataOff + 6] = tmp13 - z1;
          tmp10 = tmp4 + tmp5;
          tmp11 = tmp5 + tmp6;
          tmp12 = tmp6 + tmp7;
          var z5 = (tmp10 - tmp12) * 0.382683433;
          var z2 = 0.5411961 * tmp10 + z5;
          var z4 = 1.306562965 * tmp12 + z5;
          var z3 = tmp11 * 0.707106781;
          var z11 = tmp7 + z3;
          var z13 = tmp7 - z3;
          data[dataOff + 5] = z13 + z2;
          data[dataOff + 3] = z13 - z2;
          data[dataOff + 1] = z11 + z4;
          data[dataOff + 7] = z11 - z4;
          dataOff += 8;
        }
        dataOff = 0;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 8];
          d2 = data[dataOff + 16];
          d3 = data[dataOff + 24];
          d4 = data[dataOff + 32];
          d5 = data[dataOff + 40];
          d6 = data[dataOff + 48];
          d7 = data[dataOff + 56];
          var tmp0p2 = d0 + d7;
          var tmp7p2 = d0 - d7;
          var tmp1p2 = d1 + d6;
          var tmp6p2 = d1 - d6;
          var tmp2p2 = d2 + d5;
          var tmp5p2 = d2 - d5;
          var tmp3p2 = d3 + d4;
          var tmp4p2 = d3 - d4;
          var tmp10p2 = tmp0p2 + tmp3p2;
          var tmp13p2 = tmp0p2 - tmp3p2;
          var tmp11p2 = tmp1p2 + tmp2p2;
          var tmp12p2 = tmp1p2 - tmp2p2;
          data[dataOff] = tmp10p2 + tmp11p2;
          data[dataOff + 32] = tmp10p2 - tmp11p2;
          var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781;
          data[dataOff + 16] = tmp13p2 + z1p2;
          data[dataOff + 48] = tmp13p2 - z1p2;
          tmp10p2 = tmp4p2 + tmp5p2;
          tmp11p2 = tmp5p2 + tmp6p2;
          tmp12p2 = tmp6p2 + tmp7p2;
          var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433;
          var z2p2 = 0.5411961 * tmp10p2 + z5p2;
          var z4p2 = 1.306562965 * tmp12p2 + z5p2;
          var z3p2 = tmp11p2 * 0.707106781;
          var z11p2 = tmp7p2 + z3p2;
          var z13p2 = tmp7p2 - z3p2;
          data[dataOff + 40] = z13p2 + z2p2;
          data[dataOff + 24] = z13p2 - z2p2;
          data[dataOff + 8] = z11p2 + z4p2;
          data[dataOff + 56] = z11p2 - z4p2;
          dataOff++;
        }
        var fDCTQuant2;
        for (i = 0; i < I64; ++i) {
          fDCTQuant2 = data[i] * fdtbl[i];
          outputfDCTQuant[i] = fDCTQuant2 > 0 ? fDCTQuant2 + 0.5 | 0 : fDCTQuant2 - 0.5 | 0;
        }
        return outputfDCTQuant;
      }
      function writeAPP0() {
        writeWord(65504);
        writeWord(16);
        writeByte(74);
        writeByte(70);
        writeByte(73);
        writeByte(70);
        writeByte(0);
        writeByte(1);
        writeByte(1);
        writeByte(0);
        writeWord(1);
        writeWord(1);
        writeByte(0);
        writeByte(0);
      }
      function writeAPP1(exifBuffer) {
        if (!exifBuffer) return;
        writeWord(65505);
        if (exifBuffer[0] === 69 && exifBuffer[1] === 120 && exifBuffer[2] === 105 && exifBuffer[3] === 102) {
          writeWord(exifBuffer.length + 2);
        } else {
          writeWord(exifBuffer.length + 5 + 2);
          writeByte(69);
          writeByte(120);
          writeByte(105);
          writeByte(102);
          writeByte(0);
        }
        for (var i = 0; i < exifBuffer.length; i++) {
          writeByte(exifBuffer[i]);
        }
      }
      function writeSOF0(width, height) {
        writeWord(65472);
        writeWord(17);
        writeByte(8);
        writeWord(height);
        writeWord(width);
        writeByte(3);
        writeByte(1);
        writeByte(17);
        writeByte(0);
        writeByte(2);
        writeByte(17);
        writeByte(1);
        writeByte(3);
        writeByte(17);
        writeByte(1);
      }
      function writeDQT() {
        writeWord(65499);
        writeWord(132);
        writeByte(0);
        for (var i = 0; i < 64; i++) {
          writeByte(YTable[i]);
        }
        writeByte(1);
        for (var j = 0; j < 64; j++) {
          writeByte(UVTable[j]);
        }
      }
      function writeDHT() {
        writeWord(65476);
        writeWord(418);
        writeByte(0);
        for (var i = 0; i < 16; i++) {
          writeByte(std_dc_luminance_nrcodes[i + 1]);
        }
        for (var j = 0; j <= 11; j++) {
          writeByte(std_dc_luminance_values[j]);
        }
        writeByte(16);
        for (var k = 0; k < 16; k++) {
          writeByte(std_ac_luminance_nrcodes[k + 1]);
        }
        for (var l = 0; l <= 161; l++) {
          writeByte(std_ac_luminance_values[l]);
        }
        writeByte(1);
        for (var m = 0; m < 16; m++) {
          writeByte(std_dc_chrominance_nrcodes[m + 1]);
        }
        for (var n = 0; n <= 11; n++) {
          writeByte(std_dc_chrominance_values[n]);
        }
        writeByte(17);
        for (var o = 0; o < 16; o++) {
          writeByte(std_ac_chrominance_nrcodes[o + 1]);
        }
        for (var p = 0; p <= 161; p++) {
          writeByte(std_ac_chrominance_values[p]);
        }
      }
      function writeCOM(comments) {
        if (typeof comments === "undefined" || comments.constructor !== Array) return;
        comments.forEach((e) => {
          if (typeof e !== "string") return;
          writeWord(65534);
          var l = e.length;
          writeWord(l + 2);
          var i;
          for (i = 0; i < l; i++)
            writeByte(e.charCodeAt(i));
        });
      }
      function writeSOS() {
        writeWord(65498);
        writeWord(12);
        writeByte(3);
        writeByte(1);
        writeByte(0);
        writeByte(2);
        writeByte(17);
        writeByte(3);
        writeByte(17);
        writeByte(0);
        writeByte(63);
        writeByte(0);
      }
      function processDU(CDU, fdtbl, DC, HTDC, HTAC) {
        var EOB = HTAC[0];
        var M16zeroes = HTAC[240];
        var pos;
        var I16 = 16;
        var I63 = 63;
        var I64 = 64;
        var DU_DCT = fDCTQuant(CDU, fdtbl);
        for (var j = 0; j < I64; ++j) {
          DU[ZigZag[j]] = DU_DCT[j];
        }
        var Diff = DU[0] - DC;
        DC = DU[0];
        if (Diff == 0) {
          writeBits(HTDC[0]);
        } else {
          pos = 32767 + Diff;
          writeBits(HTDC[category[pos]]);
          writeBits(bitcode[pos]);
        }
        var end0pos = 63;
        for (; end0pos > 0 && DU[end0pos] == 0; end0pos--) {
        }
        ;
        if (end0pos == 0) {
          writeBits(EOB);
          return DC;
        }
        var i = 1;
        var lng;
        while (i <= end0pos) {
          var startpos = i;
          for (; DU[i] == 0 && i <= end0pos; ++i) {
          }
          var nrzeroes = i - startpos;
          if (nrzeroes >= I16) {
            lng = nrzeroes >> 4;
            for (var nrmarker = 1; nrmarker <= lng; ++nrmarker)
              writeBits(M16zeroes);
            nrzeroes = nrzeroes & 15;
          }
          pos = 32767 + DU[i];
          writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
          writeBits(bitcode[pos]);
          i++;
        }
        if (end0pos != I63) {
          writeBits(EOB);
        }
        return DC;
      }
      function initCharLookupTable() {
        var sfcc = String.fromCharCode;
        for (var i = 0; i < 256; i++) {
          clt[i] = sfcc(i);
        }
      }
      this.encode = function(image, quality2) {
        var time_start = (/* @__PURE__ */ new Date()).getTime();
        if (quality2) setQuality(quality2);
        byteout = new Array();
        bytenew = 0;
        bytepos = 7;
        writeWord(65496);
        writeAPP0();
        writeCOM(image.comments);
        writeAPP1(image.exifBuffer);
        writeDQT();
        writeSOF0(image.width, image.height);
        writeDHT();
        writeSOS();
        var DCY = 0;
        var DCU = 0;
        var DCV = 0;
        bytenew = 0;
        bytepos = 7;
        this.encode.displayName = "_encode_";
        var imageData = image.data;
        var width = image.width;
        var height = image.height;
        var quadWidth = width * 4;
        var tripleWidth = width * 3;
        var x, y = 0;
        var r, g, b;
        var start, p, col, row, pos;
        while (y < height) {
          x = 0;
          while (x < quadWidth) {
            start = quadWidth * y + x;
            p = start;
            col = -1;
            row = 0;
            for (pos = 0; pos < 64; pos++) {
              row = pos >> 3;
              col = (pos & 7) * 4;
              p = start + row * quadWidth + col;
              if (y + row >= height) {
                p -= quadWidth * (y + 1 + row - height);
              }
              if (x + col >= quadWidth) {
                p -= x + col - quadWidth + 4;
              }
              r = imageData[p++];
              g = imageData[p++];
              b = imageData[p++];
              YDU[pos] = (RGB_YUV_TABLE[r] + RGB_YUV_TABLE[g + 256 >> 0] + RGB_YUV_TABLE[b + 512 >> 0] >> 16) - 128;
              UDU[pos] = (RGB_YUV_TABLE[r + 768 >> 0] + RGB_YUV_TABLE[g + 1024 >> 0] + RGB_YUV_TABLE[b + 1280 >> 0] >> 16) - 128;
              VDU[pos] = (RGB_YUV_TABLE[r + 1280 >> 0] + RGB_YUV_TABLE[g + 1536 >> 0] + RGB_YUV_TABLE[b + 1792 >> 0] >> 16) - 128;
            }
            DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
            DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
            DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
            x += 32;
          }
          y += 8;
        }
        if (bytepos >= 0) {
          var fillbits = [];
          fillbits[1] = bytepos + 1;
          fillbits[0] = (1 << bytepos + 1) - 1;
          writeBits(fillbits);
        }
        writeWord(65497);
        if (typeof module === "undefined") return new Uint8Array(byteout);
        return Buffer.from(byteout);
        var jpegDataUri = "data:image/jpeg;base64," + btoa(byteout.join(""));
        byteout = [];
        var duration = (/* @__PURE__ */ new Date()).getTime() - time_start;
        return jpegDataUri;
      };
      function setQuality(quality2) {
        if (quality2 <= 0) {
          quality2 = 1;
        }
        if (quality2 > 100) {
          quality2 = 100;
        }
        if (currentQuality == quality2) return;
        var sf = 0;
        if (quality2 < 50) {
          sf = Math.floor(5e3 / quality2);
        } else {
          sf = Math.floor(200 - quality2 * 2);
        }
        initQuantTables(sf);
        currentQuality = quality2;
      }
      function init() {
        var time_start = (/* @__PURE__ */ new Date()).getTime();
        if (!quality) quality = 50;
        initCharLookupTable();
        initHuffmanTbl();
        initCategoryNumber();
        initRGBYUVTable();
        setQuality(quality);
        var duration = (/* @__PURE__ */ new Date()).getTime() - time_start;
      }
      init();
    }
    if (typeof module !== "undefined") {
      module.exports = encode;
    } else if (typeof window !== "undefined") {
      window["jpeg-js"] = window["jpeg-js"] || {};
      window["jpeg-js"].encode = encode;
    }
    function encode(imgData, qu) {
      if (typeof qu === "undefined") qu = 50;
      var encoder = new JPEGEncoder(qu);
      var data = encoder.encode(imgData, qu);
      return {
        data,
        width: imgData.width,
        height: imgData.height
      };
    }
  }
});

// ../../node_modules/.pnpm/jpeg-js@0.4.4/node_modules/jpeg-js/lib/decoder.js
var require_decoder = __commonJS({
  "../../node_modules/.pnpm/jpeg-js@0.4.4/node_modules/jpeg-js/lib/decoder.js"(exports, module) {
    var JpegImage = (function jpegImage() {
      "use strict";
      var dctZigZag = new Int32Array([
        0,
        1,
        8,
        16,
        9,
        2,
        3,
        10,
        17,
        24,
        32,
        25,
        18,
        11,
        4,
        5,
        12,
        19,
        26,
        33,
        40,
        48,
        41,
        34,
        27,
        20,
        13,
        6,
        7,
        14,
        21,
        28,
        35,
        42,
        49,
        56,
        57,
        50,
        43,
        36,
        29,
        22,
        15,
        23,
        30,
        37,
        44,
        51,
        58,
        59,
        52,
        45,
        38,
        31,
        39,
        46,
        53,
        60,
        61,
        54,
        47,
        55,
        62,
        63
      ]);
      var dctCos1 = 4017;
      var dctSin1 = 799;
      var dctCos3 = 3406;
      var dctSin3 = 2276;
      var dctCos6 = 1567;
      var dctSin6 = 3784;
      var dctSqrt2 = 5793;
      var dctSqrt1d2 = 2896;
      function constructor() {
      }
      function buildHuffmanTable(codeLengths, values) {
        var k = 0, code = [], i, j, length = 16;
        while (length > 0 && !codeLengths[length - 1])
          length--;
        code.push({ children: [], index: 0 });
        var p = code[0], q;
        for (i = 0; i < length; i++) {
          for (j = 0; j < codeLengths[i]; j++) {
            p = code.pop();
            p.children[p.index] = values[k];
            while (p.index > 0) {
              if (code.length === 0)
                throw new Error("Could not recreate Huffman Table");
              p = code.pop();
            }
            p.index++;
            code.push(p);
            while (code.length <= i) {
              code.push(q = { children: [], index: 0 });
              p.children[p.index] = q.children;
              p = q;
            }
            k++;
          }
          if (i + 1 < length) {
            code.push(q = { children: [], index: 0 });
            p.children[p.index] = q.children;
            p = q;
          }
        }
        return code[0].children;
      }
      function decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive, opts) {
        var precision = frame.precision;
        var samplesPerLine = frame.samplesPerLine;
        var scanLines = frame.scanLines;
        var mcusPerLine = frame.mcusPerLine;
        var progressive = frame.progressive;
        var maxH = frame.maxH, maxV = frame.maxV;
        var startOffset = offset, bitsData = 0, bitsCount = 0;
        function readBit() {
          if (bitsCount > 0) {
            bitsCount--;
            return bitsData >> bitsCount & 1;
          }
          bitsData = data[offset++];
          if (bitsData == 255) {
            var nextByte = data[offset++];
            if (nextByte) {
              throw new Error("unexpected marker: " + (bitsData << 8 | nextByte).toString(16));
            }
          }
          bitsCount = 7;
          return bitsData >>> 7;
        }
        function decodeHuffman(tree) {
          var node = tree, bit;
          while ((bit = readBit()) !== null) {
            node = node[bit];
            if (typeof node === "number")
              return node;
            if (typeof node !== "object")
              throw new Error("invalid huffman sequence");
          }
          return null;
        }
        function receive(length) {
          var n2 = 0;
          while (length > 0) {
            var bit = readBit();
            if (bit === null) return;
            n2 = n2 << 1 | bit;
            length--;
          }
          return n2;
        }
        function receiveAndExtend(length) {
          var n2 = receive(length);
          if (n2 >= 1 << length - 1)
            return n2;
          return n2 + (-1 << length) + 1;
        }
        function decodeBaseline(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t);
          zz[0] = component2.pred += diff;
          var k2 = 1;
          while (k2 < 64) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15)
                break;
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s);
            k2++;
          }
        }
        function decodeDCFirst(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
          zz[0] = component2.pred += diff;
        }
        function decodeDCSuccessive(component2, zz) {
          zz[0] |= readBit() << successive;
        }
        var eobrun = 0;
        function decodeACFirst(component2, zz) {
          if (eobrun > 0) {
            eobrun--;
            return;
          }
          var k2 = spectralStart, e = spectralEnd;
          while (k2 <= e) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15) {
                eobrun = receive(r) + (1 << r) - 1;
                break;
              }
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s) * (1 << successive);
            k2++;
          }
        }
        var successiveACState = 0, successiveACNextValue;
        function decodeACSuccessive(component2, zz) {
          var k2 = spectralStart, e = spectralEnd, r = 0;
          while (k2 <= e) {
            var z = dctZigZag[k2];
            var direction = zz[z] < 0 ? -1 : 1;
            switch (successiveACState) {
              case 0:
                var rs = decodeHuffman(component2.huffmanTableAC);
                var s = rs & 15, r = rs >> 4;
                if (s === 0) {
                  if (r < 15) {
                    eobrun = receive(r) + (1 << r);
                    successiveACState = 4;
                  } else {
                    r = 16;
                    successiveACState = 1;
                  }
                } else {
                  if (s !== 1)
                    throw new Error("invalid ACn encoding");
                  successiveACNextValue = receiveAndExtend(s);
                  successiveACState = r ? 2 : 3;
                }
                continue;
              case 1:
              // skipping r zero items
              case 2:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  r--;
                  if (r === 0)
                    successiveACState = successiveACState == 2 ? 3 : 0;
                }
                break;
              case 3:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  zz[z] = successiveACNextValue << successive;
                  successiveACState = 0;
                }
                break;
              case 4:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                break;
            }
            k2++;
          }
          if (successiveACState === 4) {
            eobrun--;
            if (eobrun === 0)
              successiveACState = 0;
          }
        }
        function decodeMcu(component2, decode2, mcu2, row, col) {
          var mcuRow = mcu2 / mcusPerLine | 0;
          var mcuCol = mcu2 % mcusPerLine;
          var blockRow = mcuRow * component2.v + row;
          var blockCol = mcuCol * component2.h + col;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode2(component2, component2.blocks[blockRow][blockCol]);
        }
        function decodeBlock(component2, decode2, mcu2) {
          var blockRow = mcu2 / component2.blocksPerLine | 0;
          var blockCol = mcu2 % component2.blocksPerLine;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode2(component2, component2.blocks[blockRow][blockCol]);
        }
        var componentsLength = components.length;
        var component, i, j, k, n;
        var decodeFn;
        if (progressive) {
          if (spectralStart === 0)
            decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
          else
            decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
        } else {
          decodeFn = decodeBaseline;
        }
        var mcu = 0, marker;
        var mcuExpected;
        if (componentsLength == 1) {
          mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
        } else {
          mcuExpected = mcusPerLine * frame.mcusPerColumn;
        }
        if (!resetInterval) resetInterval = mcuExpected;
        var h, v;
        while (mcu < mcuExpected) {
          for (i = 0; i < componentsLength; i++)
            components[i].pred = 0;
          eobrun = 0;
          if (componentsLength == 1) {
            component = components[0];
            for (n = 0; n < resetInterval; n++) {
              decodeBlock(component, decodeFn, mcu);
              mcu++;
            }
          } else {
            for (n = 0; n < resetInterval; n++) {
              for (i = 0; i < componentsLength; i++) {
                component = components[i];
                h = component.h;
                v = component.v;
                for (j = 0; j < v; j++) {
                  for (k = 0; k < h; k++) {
                    decodeMcu(component, decodeFn, mcu, j, k);
                  }
                }
              }
              mcu++;
              if (mcu === mcuExpected) break;
            }
          }
          if (mcu === mcuExpected) {
            do {
              if (data[offset] === 255) {
                if (data[offset + 1] !== 0) {
                  break;
                }
              }
              offset += 1;
            } while (offset < data.length - 2);
          }
          bitsCount = 0;
          marker = data[offset] << 8 | data[offset + 1];
          if (marker < 65280) {
            throw new Error("marker was not found");
          }
          if (marker >= 65488 && marker <= 65495) {
            offset += 2;
          } else
            break;
        }
        return offset - startOffset;
      }
      function buildComponentData(frame, component) {
        var lines = [];
        var blocksPerLine = component.blocksPerLine;
        var blocksPerColumn = component.blocksPerColumn;
        var samplesPerLine = blocksPerLine << 3;
        var R = new Int32Array(64), r = new Uint8Array(64);
        function quantizeAndInverse(zz, dataOut, dataIn) {
          var qt = component.quantizationTable;
          var v0, v1, v2, v3, v4, v5, v6, v7, t;
          var p = dataIn;
          var i2;
          for (i2 = 0; i2 < 64; i2++)
            p[i2] = zz[i2] * qt[i2];
          for (i2 = 0; i2 < 8; ++i2) {
            var row = 8 * i2;
            if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 && p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 && p[7 + row] == 0) {
              t = dctSqrt2 * p[0 + row] + 512 >> 10;
              p[0 + row] = t;
              p[1 + row] = t;
              p[2 + row] = t;
              p[3 + row] = t;
              p[4 + row] = t;
              p[5 + row] = t;
              p[6 + row] = t;
              p[7 + row] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
            v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
            v2 = p[2 + row];
            v3 = p[6 + row];
            v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
            v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
            v5 = p[3 + row] << 4;
            v6 = p[5 + row] << 4;
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 + row] = v0 + v7;
            p[7 + row] = v0 - v7;
            p[1 + row] = v1 + v6;
            p[6 + row] = v1 - v6;
            p[2 + row] = v2 + v5;
            p[5 + row] = v2 - v5;
            p[3 + row] = v3 + v4;
            p[4 + row] = v3 - v4;
          }
          for (i2 = 0; i2 < 8; ++i2) {
            var col = i2;
            if (p[1 * 8 + col] == 0 && p[2 * 8 + col] == 0 && p[3 * 8 + col] == 0 && p[4 * 8 + col] == 0 && p[5 * 8 + col] == 0 && p[6 * 8 + col] == 0 && p[7 * 8 + col] == 0) {
              t = dctSqrt2 * dataIn[i2 + 0] + 8192 >> 14;
              p[0 * 8 + col] = t;
              p[1 * 8 + col] = t;
              p[2 * 8 + col] = t;
              p[3 * 8 + col] = t;
              p[4 * 8 + col] = t;
              p[5 * 8 + col] = t;
              p[6 * 8 + col] = t;
              p[7 * 8 + col] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 * 8 + col] + 2048 >> 12;
            v1 = dctSqrt2 * p[4 * 8 + col] + 2048 >> 12;
            v2 = p[2 * 8 + col];
            v3 = p[6 * 8 + col];
            v4 = dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048 >> 12;
            v7 = dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048 >> 12;
            v5 = p[3 * 8 + col];
            v6 = p[5 * 8 + col];
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 * 8 + col] = v0 + v7;
            p[7 * 8 + col] = v0 - v7;
            p[1 * 8 + col] = v1 + v6;
            p[6 * 8 + col] = v1 - v6;
            p[2 * 8 + col] = v2 + v5;
            p[5 * 8 + col] = v2 - v5;
            p[3 * 8 + col] = v3 + v4;
            p[4 * 8 + col] = v3 - v4;
          }
          for (i2 = 0; i2 < 64; ++i2) {
            var sample2 = 128 + (p[i2] + 8 >> 4);
            dataOut[i2] = sample2 < 0 ? 0 : sample2 > 255 ? 255 : sample2;
          }
        }
        requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);
        var i, j;
        for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
          var scanLine = blockRow << 3;
          for (i = 0; i < 8; i++)
            lines.push(new Uint8Array(samplesPerLine));
          for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
            quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);
            var offset = 0, sample = blockCol << 3;
            for (j = 0; j < 8; j++) {
              var line = lines[scanLine + j];
              for (i = 0; i < 8; i++)
                line[sample + i] = r[offset++];
            }
          }
        }
        return lines;
      }
      function clampTo8bit(a) {
        return a < 0 ? 0 : a > 255 ? 255 : a;
      }
      constructor.prototype = {
        load: function load(path) {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", path, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = (function() {
            var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
            this.parse(data);
            if (this.onload)
              this.onload();
          }).bind(this);
          xhr.send(null);
        },
        parse: function parse(data) {
          var maxResolutionInPixels = this.opts.maxResolutionInMP * 1e3 * 1e3;
          var offset = 0, length = data.length;
          function readUint16() {
            var value = data[offset] << 8 | data[offset + 1];
            offset += 2;
            return value;
          }
          function readDataBlock() {
            var length2 = readUint16();
            var array = data.subarray(offset, offset + length2 - 2);
            offset += array.length;
            return array;
          }
          function prepareComponents(frame2) {
            var maxH2 = 1, maxV2 = 1;
            var component2, componentId2;
            for (componentId2 in frame2.components) {
              if (frame2.components.hasOwnProperty(componentId2)) {
                component2 = frame2.components[componentId2];
                if (maxH2 < component2.h) maxH2 = component2.h;
                if (maxV2 < component2.v) maxV2 = component2.v;
              }
            }
            var mcusPerLine = Math.ceil(frame2.samplesPerLine / 8 / maxH2);
            var mcusPerColumn = Math.ceil(frame2.scanLines / 8 / maxV2);
            for (componentId2 in frame2.components) {
              if (frame2.components.hasOwnProperty(componentId2)) {
                component2 = frame2.components[componentId2];
                var blocksPerLine = Math.ceil(Math.ceil(frame2.samplesPerLine / 8) * component2.h / maxH2);
                var blocksPerColumn = Math.ceil(Math.ceil(frame2.scanLines / 8) * component2.v / maxV2);
                var blocksPerLineForMcu = mcusPerLine * component2.h;
                var blocksPerColumnForMcu = mcusPerColumn * component2.v;
                var blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
                var blocks = [];
                requestMemoryAllocation(blocksToAllocate * 256);
                for (var i2 = 0; i2 < blocksPerColumnForMcu; i2++) {
                  var row = [];
                  for (var j2 = 0; j2 < blocksPerLineForMcu; j2++)
                    row.push(new Int32Array(64));
                  blocks.push(row);
                }
                component2.blocksPerLine = blocksPerLine;
                component2.blocksPerColumn = blocksPerColumn;
                component2.blocks = blocks;
              }
            }
            frame2.maxH = maxH2;
            frame2.maxV = maxV2;
            frame2.mcusPerLine = mcusPerLine;
            frame2.mcusPerColumn = mcusPerColumn;
          }
          var jfif = null;
          var adobe = null;
          var pixels = null;
          var frame, resetInterval;
          var quantizationTables = [], frames = [];
          var huffmanTablesAC = [], huffmanTablesDC = [];
          var fileMarker = readUint16();
          var malformedDataOffset = -1;
          this.comments = [];
          if (fileMarker != 65496) {
            throw new Error("SOI not found");
          }
          fileMarker = readUint16();
          while (fileMarker != 65497) {
            var i, j, l;
            switch (fileMarker) {
              case 65280:
                break;
              case 65504:
              // APP0 (Application Specific)
              case 65505:
              // APP1
              case 65506:
              // APP2
              case 65507:
              // APP3
              case 65508:
              // APP4
              case 65509:
              // APP5
              case 65510:
              // APP6
              case 65511:
              // APP7
              case 65512:
              // APP8
              case 65513:
              // APP9
              case 65514:
              // APP10
              case 65515:
              // APP11
              case 65516:
              // APP12
              case 65517:
              // APP13
              case 65518:
              // APP14
              case 65519:
              // APP15
              case 65534:
                var appData = readDataBlock();
                if (fileMarker === 65534) {
                  var comment = String.fromCharCode.apply(null, appData);
                  this.comments.push(comment);
                }
                if (fileMarker === 65504) {
                  if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
                    jfif = {
                      version: { major: appData[5], minor: appData[6] },
                      densityUnits: appData[7],
                      xDensity: appData[8] << 8 | appData[9],
                      yDensity: appData[10] << 8 | appData[11],
                      thumbWidth: appData[12],
                      thumbHeight: appData[13],
                      thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                    };
                  }
                }
                if (fileMarker === 65505) {
                  if (appData[0] === 69 && appData[1] === 120 && appData[2] === 105 && appData[3] === 102 && appData[4] === 0) {
                    this.exifBuffer = appData.subarray(5, appData.length);
                  }
                }
                if (fileMarker === 65518) {
                  if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
                    adobe = {
                      version: appData[6],
                      flags0: appData[7] << 8 | appData[8],
                      flags1: appData[9] << 8 | appData[10],
                      transformCode: appData[11]
                    };
                  }
                }
                break;
              case 65499:
                var quantizationTablesLength = readUint16();
                var quantizationTablesEnd = quantizationTablesLength + offset - 2;
                while (offset < quantizationTablesEnd) {
                  var quantizationTableSpec = data[offset++];
                  requestMemoryAllocation(64 * 4);
                  var tableData = new Int32Array(64);
                  if (quantizationTableSpec >> 4 === 0) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = data[offset++];
                    }
                  } else if (quantizationTableSpec >> 4 === 1) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = readUint16();
                    }
                  } else
                    throw new Error("DQT: invalid table spec");
                  quantizationTables[quantizationTableSpec & 15] = tableData;
                }
                break;
              case 65472:
              // SOF0 (Start of Frame, Baseline DCT)
              case 65473:
              // SOF1 (Start of Frame, Extended DCT)
              case 65474:
                readUint16();
                frame = {};
                frame.extended = fileMarker === 65473;
                frame.progressive = fileMarker === 65474;
                frame.precision = data[offset++];
                frame.scanLines = readUint16();
                frame.samplesPerLine = readUint16();
                frame.components = {};
                frame.componentsOrder = [];
                var pixelsInFrame = frame.scanLines * frame.samplesPerLine;
                if (pixelsInFrame > maxResolutionInPixels) {
                  var exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
                  throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
                }
                var componentsCount = data[offset++], componentId;
                var maxH = 0, maxV = 0;
                for (i = 0; i < componentsCount; i++) {
                  componentId = data[offset];
                  var h = data[offset + 1] >> 4;
                  var v = data[offset + 1] & 15;
                  var qId = data[offset + 2];
                  if (h <= 0 || v <= 0) {
                    throw new Error("Invalid sampling factor, expected values above 0");
                  }
                  frame.componentsOrder.push(componentId);
                  frame.components[componentId] = {
                    h,
                    v,
                    quantizationIdx: qId
                  };
                  offset += 3;
                }
                prepareComponents(frame);
                frames.push(frame);
                break;
              case 65476:
                var huffmanLength = readUint16();
                for (i = 2; i < huffmanLength; ) {
                  var huffmanTableSpec = data[offset++];
                  var codeLengths = new Uint8Array(16);
                  var codeLengthSum = 0;
                  for (j = 0; j < 16; j++, offset++) {
                    codeLengthSum += codeLengths[j] = data[offset];
                  }
                  requestMemoryAllocation(16 + codeLengthSum);
                  var huffmanValues = new Uint8Array(codeLengthSum);
                  for (j = 0; j < codeLengthSum; j++, offset++)
                    huffmanValues[j] = data[offset];
                  i += 17 + codeLengthSum;
                  (huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
                }
                break;
              case 65501:
                readUint16();
                resetInterval = readUint16();
                break;
              case 65500:
                readUint16();
                readUint16();
                break;
              case 65498:
                var scanLength = readUint16();
                var selectorsCount = data[offset++];
                var components = [], component;
                for (i = 0; i < selectorsCount; i++) {
                  component = frame.components[data[offset++]];
                  var tableSpec = data[offset++];
                  component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
                  component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
                  components.push(component);
                }
                var spectralStart = data[offset++];
                var spectralEnd = data[offset++];
                var successiveApproximation = data[offset++];
                var processed = decodeScan(
                  data,
                  offset,
                  frame,
                  components,
                  resetInterval,
                  spectralStart,
                  spectralEnd,
                  successiveApproximation >> 4,
                  successiveApproximation & 15,
                  this.opts
                );
                offset += processed;
                break;
              case 65535:
                if (data[offset] !== 255) {
                  offset--;
                }
                break;
              default:
                if (data[offset - 3] == 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
                  offset -= 3;
                  break;
                } else if (fileMarker === 224 || fileMarker == 225) {
                  if (malformedDataOffset !== -1) {
                    throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
                  }
                  malformedDataOffset = offset - 1;
                  const nextOffset = readUint16();
                  if (data[offset + nextOffset - 2] === 255) {
                    offset += nextOffset - 2;
                    break;
                  }
                }
                throw new Error("unknown JPEG marker " + fileMarker.toString(16));
            }
            fileMarker = readUint16();
          }
          if (frames.length != 1)
            throw new Error("only single frame JPEGs supported");
          for (var i = 0; i < frames.length; i++) {
            var cp = frames[i].components;
            for (var j in cp) {
              cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
              delete cp[j].quantizationIdx;
            }
          }
          this.width = frame.samplesPerLine;
          this.height = frame.scanLines;
          this.jfif = jfif;
          this.adobe = adobe;
          this.components = [];
          for (var i = 0; i < frame.componentsOrder.length; i++) {
            var component = frame.components[frame.componentsOrder[i]];
            this.components.push({
              lines: buildComponentData(frame, component),
              scaleX: component.h / frame.maxH,
              scaleY: component.v / frame.maxV
            });
          }
        },
        getData: function getData(width, height) {
          var scaleX = this.width / width, scaleY = this.height / height;
          var component1, component2, component3, component4;
          var component1Line, component2Line, component3Line, component4Line;
          var x, y;
          var offset = 0;
          var Y, Cb, Cr, K, C, M, Ye, R, G, B;
          var colorTransform;
          var dataLength = width * height * this.components.length;
          requestMemoryAllocation(dataLength);
          var data = new Uint8Array(dataLength);
          switch (this.components.length) {
            case 1:
              component1 = this.components[0];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  Y = component1Line[0 | x * component1.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 2:
              component1 = this.components[0];
              component2 = this.components[1];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  Y = component1Line[0 | x * component1.scaleX * scaleX];
                  data[offset++] = Y;
                  Y = component2Line[0 | x * component2.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 3:
              colorTransform = true;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  if (!colorTransform) {
                    R = component1Line[0 | x * component1.scaleX * scaleX];
                    G = component2Line[0 | x * component2.scaleX * scaleX];
                    B = component3Line[0 | x * component3.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x * component3.scaleX * scaleX];
                    R = clampTo8bit(Y + 1.402 * (Cr - 128));
                    G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    B = clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = R;
                  data[offset++] = G;
                  data[offset++] = B;
                }
              }
              break;
            case 4:
              if (!this.adobe)
                throw new Error("Unsupported color mode (4 components)");
              colorTransform = false;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              component4 = this.components[3];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                component4Line = component4.lines[0 | y * component4.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  if (!colorTransform) {
                    C = component1Line[0 | x * component1.scaleX * scaleX];
                    M = component2Line[0 | x * component2.scaleX * scaleX];
                    Ye = component3Line[0 | x * component3.scaleX * scaleX];
                    K = component4Line[0 | x * component4.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x * component3.scaleX * scaleX];
                    K = component4Line[0 | x * component4.scaleX * scaleX];
                    C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                    M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = 255 - C;
                  data[offset++] = 255 - M;
                  data[offset++] = 255 - Ye;
                  data[offset++] = 255 - K;
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
          return data;
        },
        copyToImageData: function copyToImageData(imageData, formatAsRGBA) {
          var width = imageData.width, height = imageData.height;
          var imageDataArray = imageData.data;
          var data = this.getData(width, height);
          var i = 0, j = 0, x, y;
          var Y, K, C, M, R, G, B;
          switch (this.components.length) {
            case 1:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  Y = data[i++];
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 3:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  R = data[i++];
                  G = data[i++];
                  B = data[i++];
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 4:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  C = data[i++];
                  M = data[i++];
                  Y = data[i++];
                  K = data[i++];
                  R = 255 - clampTo8bit(C * (1 - K / 255) + K);
                  G = 255 - clampTo8bit(M * (1 - K / 255) + K);
                  B = 255 - clampTo8bit(Y * (1 - K / 255) + K);
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
        }
      };
      var totalBytesAllocated = 0;
      var maxMemoryUsageBytes = 0;
      function requestMemoryAllocation(increaseAmount = 0) {
        var totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
        if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
          var exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
          throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`);
        }
        totalBytesAllocated = totalMemoryImpactBytes;
      }
      constructor.resetMaxMemoryUsage = function(maxMemoryUsageBytes_) {
        totalBytesAllocated = 0;
        maxMemoryUsageBytes = maxMemoryUsageBytes_;
      };
      constructor.getBytesAllocated = function() {
        return totalBytesAllocated;
      };
      constructor.requestMemoryAllocation = requestMemoryAllocation;
      return constructor;
    })();
    if (typeof module !== "undefined") {
      module.exports = decode;
    } else if (typeof window !== "undefined") {
      window["jpeg-js"] = window["jpeg-js"] || {};
      window["jpeg-js"].decode = decode;
    }
    function decode(jpegData, userOpts = {}) {
      var defaultOpts = {
        // "undefined" means "Choose whether to transform colors based on the image’s color model."
        colorTransform: void 0,
        useTArray: false,
        formatAsRGBA: true,
        tolerantDecoding: true,
        maxResolutionInMP: 100,
        // Don't decode more than 100 megapixels
        maxMemoryUsageInMB: 512
        // Don't decode if memory footprint is more than 512MB
      };
      var opts = { ...defaultOpts, ...userOpts };
      var arr = new Uint8Array(jpegData);
      var decoder = new JpegImage();
      decoder.opts = opts;
      JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024);
      decoder.parse(arr);
      var channels = opts.formatAsRGBA ? 4 : 3;
      var bytesNeeded = decoder.width * decoder.height * channels;
      try {
        JpegImage.requestMemoryAllocation(bytesNeeded);
        var image = {
          width: decoder.width,
          height: decoder.height,
          exifBuffer: decoder.exifBuffer,
          data: opts.useTArray ? new Uint8Array(bytesNeeded) : Buffer.alloc(bytesNeeded)
        };
        if (decoder.comments.length > 0) {
          image["comments"] = decoder.comments;
        }
      } catch (err) {
        if (err instanceof RangeError) {
          throw new Error("Could not allocate enough memory for the image. Required: " + bytesNeeded);
        }
        if (err instanceof ReferenceError) {
          if (err.message === "Buffer is not defined") {
            throw new Error("Buffer is not globally defined in this environment. Consider setting useTArray to true");
          }
        }
        throw err;
      }
      decoder.copyToImageData(image, opts.formatAsRGBA);
      return image;
    }
  }
});

// ../../node_modules/.pnpm/jpeg-js@0.4.4/node_modules/jpeg-js/index.js
var require_jpeg_js = __commonJS({
  "../../node_modules/.pnpm/jpeg-js@0.4.4/node_modules/jpeg-js/index.js"(exports, module) {
    var encode = require_encoder();
    var decode = require_decoder();
    module.exports = {
      encode,
      decode
    };
  }
});

// src/renderer/canvasShapes.ts
function drawStar(ctx, x, y, width, height, points) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const outerRadius = Math.min(width, height) / 2;
  const innerRadius = outerRadius * 0.4;
  const step = Math.PI / points;
  ctx.moveTo(centerX, centerY - outerRadius);
  for (let index = 0; index < 2 * points; index++) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + index * step;
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
  }
  ctx.closePath();
}
function drawPolygon(ctx, x, y, width, height, sides) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.min(width, height) / 2;
  const startAngle = -Math.PI / 2;
  ctx.moveTo(centerX + radius * Math.cos(startAngle), centerY + radius * Math.sin(startAngle));
  for (let index = 1; index <= sides; index++) {
    const angle = startAngle + 2 * Math.PI * index / sides;
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
  }
  ctx.closePath();
}
var shapeRegistry = {
  ellipse: (ctx, x, y, width, height) => {
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  },
  roundRect: (ctx, x, y, width, height) => {
    const radius = Math.min(width, height) * 0.1;
    ctx.roundRect(x, y, width, height, radius);
  },
  triangle: (ctx, x, y, width, height) => {
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  },
  diamond: (ctx, x, y, width, height) => {
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width / 2, y + height);
    ctx.lineTo(x, y + height / 2);
    ctx.closePath();
  },
  pentagon: (ctx, x, y, width, height) => drawPolygon(ctx, x, y, width, height, 5),
  hexagon: (ctx, x, y, width, height) => drawPolygon(ctx, x, y, width, height, 6),
  octagon: (ctx, x, y, width, height) => drawPolygon(ctx, x, y, width, height, 8),
  rightArrow: (ctx, x, y, width, height) => {
    const shaftHeight = height * 0.4;
    const shaftY = y + (height - shaftHeight) / 2;
    const headStart = x + width * 0.65;
    ctx.moveTo(x, shaftY);
    ctx.lineTo(headStart, shaftY);
    ctx.lineTo(headStart, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(headStart, y + height);
    ctx.lineTo(headStart, shaftY + shaftHeight);
    ctx.lineTo(x, shaftY + shaftHeight);
    ctx.closePath();
  },
  leftArrow: (ctx, x, y, width, height) => {
    const shaftHeight = height * 0.4;
    const shaftY = y + (height - shaftHeight) / 2;
    const headEnd = x + width * 0.35;
    ctx.moveTo(x + width, shaftY);
    ctx.lineTo(headEnd, shaftY);
    ctx.lineTo(headEnd, y);
    ctx.lineTo(x, y + height / 2);
    ctx.lineTo(headEnd, y + height);
    ctx.lineTo(headEnd, shaftY + shaftHeight);
    ctx.lineTo(x + width, shaftY + shaftHeight);
    ctx.closePath();
  },
  upArrow: (ctx, x, y, width, height) => {
    const shaftWidth = width * 0.4;
    const shaftX = x + (width - shaftWidth) / 2;
    const headEnd = y + height * 0.35;
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, headEnd);
    ctx.lineTo(shaftX + shaftWidth, headEnd);
    ctx.lineTo(shaftX + shaftWidth, y + height);
    ctx.lineTo(shaftX, y + height);
    ctx.lineTo(shaftX, headEnd);
    ctx.lineTo(x, headEnd);
    ctx.closePath();
  },
  downArrow: (ctx, x, y, width, height) => {
    const shaftWidth = width * 0.4;
    const shaftX = x + (width - shaftWidth) / 2;
    const headStart = y + height * 0.65;
    ctx.moveTo(shaftX, y);
    ctx.lineTo(shaftX + shaftWidth, y);
    ctx.lineTo(shaftX + shaftWidth, headStart);
    ctx.lineTo(x + width, headStart);
    ctx.lineTo(x + width / 2, y + height);
    ctx.lineTo(x, headStart);
    ctx.lineTo(shaftX, headStart);
    ctx.closePath();
  },
  star5: (ctx, x, y, width, height) => drawStar(ctx, x, y, width, height, 5),
  star4: (ctx, x, y, width, height) => drawStar(ctx, x, y, width, height, 4),
  heart: (ctx, x, y, width, height) => {
    const centerX = x + width / 2;
    const topY = y + height * 0.3;
    ctx.moveTo(centerX, y + height);
    ctx.bezierCurveTo(x - width * 0.1, y + height * 0.55, x, y, centerX - width * 0.02, topY);
    ctx.bezierCurveTo(centerX - width * 0.01, y, centerX + width * 0.01, y, centerX + width * 0.02, topY);
    ctx.bezierCurveTo(x + width, y, x + width * 1.1, y + height * 0.55, centerX, y + height);
    ctx.closePath();
  },
  cloud: (ctx, x, y, width, height) => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    ctx.arc(centerX, centerY + height * 0.1, width * 0.25, 0, Math.PI * 2);
    ctx.arc(centerX - width * 0.22, centerY, width * 0.2, 0, Math.PI * 2);
    ctx.arc(centerX + width * 0.22, centerY, width * 0.2, 0, Math.PI * 2);
    ctx.arc(centerX - width * 0.1, centerY - height * 0.15, width * 0.18, 0, Math.PI * 2);
    ctx.arc(centerX + width * 0.1, centerY - height * 0.15, width * 0.18, 0, Math.PI * 2);
  },
  flowChartTerminator: (ctx, x, y, width, height) => {
    const radius = height / 2;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + radius, y + height);
    ctx.arc(x + radius, y + radius, radius, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
  },
  parallelogram: (ctx, x, y, width, height) => {
    const offset = width * 0.2;
    ctx.moveTo(x + offset, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width - offset, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  },
  trapezoid: (ctx, x, y, width, height) => {
    const offset = width * 0.15;
    ctx.moveTo(x + offset, y);
    ctx.lineTo(x + width - offset, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
  },
  chevron: (ctx, x, y, width, height) => {
    const point = width * 0.2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + width - point, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width - point, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + point, y + height / 2);
    ctx.closePath();
  },
  plus: (ctx, x, y, width, height) => {
    const armWidth = width / 3;
    const armHeight = height / 3;
    ctx.moveTo(x + armWidth, y);
    ctx.lineTo(x + 2 * armWidth, y);
    ctx.lineTo(x + 2 * armWidth, y + armHeight);
    ctx.lineTo(x + width, y + armHeight);
    ctx.lineTo(x + width, y + 2 * armHeight);
    ctx.lineTo(x + 2 * armWidth, y + 2 * armHeight);
    ctx.lineTo(x + 2 * armWidth, y + height);
    ctx.lineTo(x + armWidth, y + height);
    ctx.lineTo(x + armWidth, y + 2 * armHeight);
    ctx.lineTo(x, y + 2 * armHeight);
    ctx.lineTo(x, y + armHeight);
    ctx.lineTo(x + armWidth, y + armHeight);
    ctx.closePath();
  },
  pieWedge: (ctx, x, y, width, height) => {
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, y);
    ctx.ellipse(cx, cy, width / 2, height / 2, 0, -Math.PI / 2, 0);
    ctx.closePath();
  },
  wedgeRectCallout: (ctx, x, y, width, height) => {
    const bodyHeight = height * 0.75;
    ctx.rect(x, y, width, bodyHeight);
    ctx.moveTo(x + width * 0.15, y + bodyHeight);
    ctx.lineTo(x + width * 0.05, y + height);
    ctx.lineTo(x + width * 0.25, y + bodyHeight);
  },
  wedgeRoundRectCallout: (ctx, x, y, width, height) => {
    const bodyHeight = height * 0.75;
    const radius = Math.min(width, bodyHeight) * 0.1;
    ctx.roundRect(x, y, width, bodyHeight, radius);
    ctx.moveTo(x + width * 0.15, y + bodyHeight);
    ctx.lineTo(x + width * 0.05, y + height);
    ctx.lineTo(x + width * 0.25, y + bodyHeight);
  }
};
shapeRegistry.flowChartProcess = (ctx, x, y, width, height) => ctx.rect(x, y, width, height);
shapeRegistry.flowChartDecision = shapeRegistry.diamond;
shapeRegistry.cross = shapeRegistry.plus;
shapeRegistry.oval = shapeRegistry.ellipse;
shapeRegistry.flowChartAlternateProcess = shapeRegistry.roundRect;
shapeRegistry.flowChartPredefinedProcess = (ctx, x, y, width, height) => ctx.rect(x, y, width, height);
shapeRegistry.flowChartDocument = (ctx, x, y, width, height) => {
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height * 0.85);
  ctx.quadraticCurveTo(x + width * 0.75, y + height, x + width * 0.5, y + height * 0.85);
  ctx.quadraticCurveTo(x + width * 0.25, y + height * 0.7, x, y + height * 0.85);
  ctx.closePath();
};
shapeRegistry.flowChartInputOutput = shapeRegistry.parallelogram;
shapeRegistry.flowChartManualInput = (ctx, x, y, width, height) => {
  ctx.moveTo(x, y + height * 0.2);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
};
shapeRegistry.flowChartPreparation = shapeRegistry.hexagon;
shapeRegistry.flowChartExtract = shapeRegistry.triangle;
shapeRegistry.star6 = (ctx, x, y, width, height) => drawStar(ctx, x, y, width, height, 6);
shapeRegistry.star8 = (ctx, x, y, width, height) => drawStar(ctx, x, y, width, height, 8);
var DONUT_SHAPE = "donut";
function drawShape(ctx, node, x, y, width, height) {
  const effectiveGeometry = node.type === "View" ? resolveEffectiveViewGeometry(node, width, height) : void 0;
  const shapeType = effectiveGeometry?.shapeType;
  ctx.beginPath();
  if (shapeType === DONUT_SHAPE) {
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    const innerRatio = 0.55;
    ctx.moveTo(x + width / 2 + width * innerRatio / 2, y + height / 2);
    ctx.ellipse(
      x + width / 2,
      y + height / 2,
      width * innerRatio / 2,
      height * innerRatio / 2,
      0,
      0,
      Math.PI * 2,
      true
    );
    return;
  }
  if (shapeType === "roundRect") {
    const radius = effectiveGeometry?.cornerRadiusPx ?? Math.min(width, height) * 0.05;
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const drawFn = shapeType ? shapeRegistry[shapeType] : void 0;
  if (drawFn) {
    drawFn(ctx, x, y, width, height);
    return;
  }
  ctx.rect(x, y, width, height);
}

// src/renderer/canvasEffects.ts
function paintFill(ctx, fill, x, y, width, height, node, themeColors) {
  const fillRule = node.type === "View" && node.shapeType === "donut" ? "evenodd" : "nonzero";
  switch (fill.type) {
    case "solid": {
      ctx.fillStyle = resolveColorValue(fill.color, themeColors) ?? "transparent";
      drawShape(ctx, node, x, y, width, height);
      ctx.fill(fillRule);
      return;
    }
    case "linear":
    case "radial": {
      const gradient = fill.type === "linear" ? createLinearGradient(ctx, fill, x, y, width, height, themeColors) : createRadialGradient(ctx, fill, x, y, width, height, themeColors);
      if (gradient) {
        ctx.fillStyle = gradient;
        drawShape(ctx, node, x, y, width, height);
        ctx.fill(fillRule);
      }
      return;
    }
    case "pattern": {
      const foreground = resolveColorValue(fill.foreground, themeColors);
      ctx.fillStyle = foreground ?? "#CCCCCC";
      drawShape(ctx, node, x, y, width, height);
      ctx.fill(fillRule);
      return;
    }
    case "image": {
      ctx.fillStyle = "#F0F0F0";
      drawShape(ctx, node, x, y, width, height);
      ctx.fill(fillRule);
    }
  }
}
function createLinearGradient(ctx, fill, x, y, width, height, themeColors) {
  if (!fill.stops?.length) return null;
  const angle = ((fill.angle ?? 180) - 90) * Math.PI / 180;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const length = Math.max(width, height) / 2;
  const gradient = ctx.createLinearGradient(
    centerX - Math.cos(angle) * length,
    centerY - Math.sin(angle) * length,
    centerX + Math.cos(angle) * length,
    centerY + Math.sin(angle) * length
  );
  for (const stop of fill.stops) {
    gradient.addColorStop(
      Math.max(0, Math.min(1, stop.position / 100)),
      resolveColorValue(stop.color, themeColors) ?? "#000000"
    );
  }
  return gradient;
}
function createRadialGradient(ctx, fill, x, y, width, height, themeColors) {
  if (!fill.stops?.length) return null;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.max(width, height) / 2;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  for (const stop of fill.stops) {
    gradient.addColorStop(
      Math.max(0, Math.min(1, stop.position / 100)),
      resolveColorValue(stop.color, themeColors) ?? "#000000"
    );
  }
  return gradient;
}
function get3dLightOffset(scene3d) {
  const direction = scene3d?.lightRig?.direction ?? "tl";
  switch (direction) {
    case "t":
      return [0, 1];
    case "b":
      return [0, -1];
    case "l":
      return [1, 0];
    case "r":
      return [-1, 0];
    case "tl":
      return [1, 1];
    case "tr":
      return [-1, 1];
    case "bl":
      return [1, -1];
    case "br":
      return [-1, -1];
    default:
      return [1, 1];
  }
}
function darkenHex(hex, factor) {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return "#555555";
  const red = Math.round(parseInt(match[1], 16) * factor);
  const green = Math.round(parseInt(match[2], 16) * factor);
  const blue = Math.round(parseInt(match[3], 16) * factor);
  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}
function paint3dExtrusion(ctx, node, x, y, width, height, sp3d, style, themeColors) {
  const extrudeHeight = sp3d.extrudeHeight;
  const [dx, dy] = get3dLightOffset(style?.effects?.scene3d);
  let color;
  if (sp3d.extrudeColor) {
    color = resolveColorValue(sp3d.extrudeColor, themeColors) ?? "#555555";
  } else {
    const baseFill = style?.fill;
    const backgroundColor = style?.backgroundColor;
    const base = baseFill?.type === "solid" ? resolveColorValue(baseFill.color, themeColors) : backgroundColor ? resolveColorValue(backgroundColor, themeColors) : void 0;
    color = base ? darkenHex(base, 0.6) : "#555555";
  }
  const steps = Math.min(Math.ceil(extrudeHeight), 20);
  const stepSize = extrudeHeight / steps;
  const fillRule = node.shapeType === "donut" ? "evenodd" : "nonzero";
  ctx.save();
  ctx.fillStyle = color;
  for (let index = steps; index >= 1; index--) {
    drawShape(ctx, node, x + dx * stepSize * index, y + dy * stepSize * index, width, height);
    ctx.fill(fillRule);
  }
  ctx.restore();
}
function paint3dBevel(ctx, node, x, y, width, height, sp3d, scene3d) {
  const [dx, dy] = get3dLightOffset(scene3d);
  if (sp3d.bevelTop) {
    const size = Math.max(sp3d.bevelTop.width ?? 4, sp3d.bevelTop.height ?? 4);
    const pad = 2e3 + size;
    ctx.save();
    drawShape(ctx, node, x, y, width, height);
    ctx.clip();
    ctx.shadowColor = "rgba(255,255,255,0.4)";
    ctx.shadowBlur = size * 0.7;
    ctx.shadowOffsetX = dx * size * 0.5;
    ctx.shadowOffsetY = dy * size * 0.5;
    drawShape(ctx, node, x, y, width, height);
    ctx.rect(x - pad, y - pad, width + 2 * pad, height + 2 * pad);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fill("evenodd");
    ctx.restore();
    ctx.save();
    drawShape(ctx, node, x, y, width, height);
    ctx.clip();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = size * 0.7;
    ctx.shadowOffsetX = -dx * size * 0.5;
    ctx.shadowOffsetY = -dy * size * 0.5;
    drawShape(ctx, node, x, y, width, height);
    ctx.rect(x - pad, y - pad, width + 2 * pad, height + 2 * pad);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill("evenodd");
    ctx.restore();
  }
  if (sp3d.bevelBottom) {
    const size = Math.max(sp3d.bevelBottom.width ?? 4, sp3d.bevelBottom.height ?? 4);
    const pad = 2e3 + size;
    ctx.save();
    drawShape(ctx, node, x, y, width, height);
    ctx.clip();
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = size * 0.5;
    ctx.shadowOffsetX = dx * size * 0.3;
    ctx.shadowOffsetY = dy * size * 0.3;
    drawShape(ctx, node, x, y, width, height);
    ctx.rect(x - pad, y - pad, width + 2 * pad, height + 2 * pad);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fill("evenodd");
    ctx.restore();
  }
}
function paintReflection(ctx, node, x, y, width, height, style, themeColors) {
  const reflection = style?.effects?.reflection;
  if (!reflection || width <= 0 || height <= 0) {
    return;
  }
  const reflectedHeight = height * reflectionSize(reflection);
  if (reflectedHeight <= 0) {
    return;
  }
  const distance = reflection.distance ?? 0;
  const startOpacity = clampOpacity(reflection.startOpacity ?? 0.5);
  const endOpacity = clampOpacity(reflection.endOpacity ?? 0);
  const fillRule = node.shapeType === "donut" ? "evenodd" : "nonzero";
  ctx.save();
  ctx.translate(0, 2 * (y + height) + distance);
  ctx.scale(1, -1);
  ctx.beginPath();
  ctx.rect(x, y + height - reflectedHeight, width, reflectedHeight);
  ctx.clip();
  const fill = style?.fill;
  const backgroundColor = style?.backgroundColor;
  if (fill) {
    paintFill(ctx, fill, x, y, width, height, node, themeColors);
  } else if (backgroundColor !== void 0) {
    ctx.fillStyle = resolveColorValue(backgroundColor, themeColors) ?? "transparent";
    drawShape(ctx, node, x, y, width, height);
    ctx.fill(fillRule);
  }
  if (style?.borderWidth && style.borderColor) {
    ctx.strokeStyle = resolveColorValue(style.borderColor, themeColors) ?? "#000000";
    ctx.lineWidth = style.borderWidth;
    if (style.borderStyle === "dashed") ctx.setLineDash([style.borderWidth * 3, style.borderWidth * 2]);
    else if (style.borderStyle === "dotted") ctx.setLineDash([style.borderWidth, style.borderWidth * 2]);
    else ctx.setLineDash([]);
    drawShape(ctx, node, x, y, width, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createLinearGradient(0, y + height, 0, y + height - reflectedHeight);
  fade.addColorStop(0, `rgba(0,0,0,${startOpacity})`);
  fade.addColorStop(1, `rgba(0,0,0,${endOpacity})`);
  ctx.fillStyle = fade;
  ctx.fillRect(x, y + height - reflectedHeight, width, reflectedHeight);
  ctx.restore();
}
function reflectionSize(reflection) {
  const size = reflection.size ?? 100;
  return Math.max(0, Math.min(1, size / 100));
}
function clampOpacity(value) {
  return Math.max(0, Math.min(1, value));
}

// src/renderer/canvasPlaceholders.ts
function paintImagePlaceholder(ctx, node, themeColors) {
  const { x, y, width, height } = node.layout;
  const style = node.style;
  ctx.save();
  if (node.borderRadius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, node.borderRadius);
    ctx.clip();
  }
  ctx.fillStyle = "#E5E7EB";
  ctx.fillRect(x, y, width, height);
  if (style?.borderWidth && style?.borderColor) {
    ctx.strokeStyle = resolveColorValue(style.borderColor, themeColors) ?? "#000000";
    ctx.lineWidth = style.borderWidth;
    ctx.strokeRect(x, y, width, height);
  }
  ctx.restore();
}
function paintChartPlaceholder(ctx, node, _themeColors) {
  const { x, y, width, height } = node.layout;
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}
function paintConnector(ctx, node, themeColors) {
  const { start, end } = node;
  if (!start || !end) return;
  ctx.save();
  const lineColor = resolveColorValue(node.lineColor, themeColors) ?? "#000000";
  const lineWidth = node.lineWidth ?? 1;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  if (node.lineDashStyle === "dashed") {
    ctx.setLineDash([lineWidth * 4, lineWidth * 2]);
  } else if (node.lineDashStyle === "dotted") {
    ctx.setLineDash([lineWidth, lineWidth * 2]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (node.arrowEnd) {
    drawArrowHead(ctx, start.x, start.y, end.x, end.y, lineWidth, lineColor);
  }
  if (node.arrowStart) {
    drawArrowHead(ctx, end.x, end.y, start.x, start.y, lineWidth, lineColor);
  }
  ctx.restore();
}
function drawArrowHead(ctx, fromX, fromY, toX, toY, lineWidth, color) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = Math.max(6, lineWidth * 4);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 6),
    toY - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 6),
    toY - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function paintMediaPlaceholder(ctx, node, _themeColors) {
  const { x, y, width, height } = node.layout;
  ctx.save();
  ctx.fillStyle = "#1F2937";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#FFFFFF";
  ctx.globalAlpha = 0.7;
  const triangleSize = Math.min(width, height) * 0.25;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  ctx.beginPath();
  ctx.moveTo(centerX - triangleSize / 2, centerY - triangleSize / 2);
  ctx.lineTo(centerX + triangleSize / 2, centerY);
  ctx.lineTo(centerX - triangleSize / 2, centerY + triangleSize / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// src/renderer/canvasText.ts
function paintParagraphs(ctx, paragraphs, parentStyle, x, y, maxWidth, maxHeight, themeColors) {
  let cursorY = y;
  const defaultFontSize = parentStyle?.fontSize ?? 14;
  const defaultLineHeight = resolveLineHeightPixels(
    parentStyle?.lineHeight,
    defaultFontSize,
    defaultFontSize * 1.3
  );
  for (const para of paragraphs) {
    if (cursorY - y >= maxHeight) break;
    cursorY += para.spaceBefore ?? 0;
    const align = para.align ?? parentStyle?.textAlign ?? "left";
    const lineHeight = resolveLineHeightPixels(
      para.lineHeight,
      defaultFontSize,
      defaultLineHeight,
      "points"
    );
    for (const run of para.runs) {
      if (cursorY - y >= maxHeight) break;
      const fontSize = run.style?.fontSize ?? parentStyle?.fontSize ?? 14;
      const fontFamily = run.style?.fontFamily ?? parentStyle?.fontFamily ?? "Arial";
      const fontWeight = run.style?.fontWeight ?? parentStyle?.fontWeight ?? "normal";
      const fontStyle = run.style?.fontStyle ?? parentStyle?.fontStyle ?? "normal";
      const color = run.style?.color ?? parentStyle?.color;
      ctx.font = buildFontString(fontSize, fontFamily, fontWeight, fontStyle);
      ctx.fillStyle = resolveColorValue(color, themeColors) ?? "#000000";
      ctx.textBaseline = "top";
      const text = applyTextTransform(run.text, run.style?.textTransform);
      const lines = wrapText(ctx, text, maxWidth);
      for (const line of lines) {
        if (cursorY - y >= maxHeight) break;
        const lineX = alignText(ctx, line, x, maxWidth, align);
        ctx.fillText(line, lineX, cursorY, maxWidth);
        cursorY += lineHeight;
      }
    }
    cursorY += para.spaceAfter ?? 0;
  }
}
function paintTextContent(ctx, content, style, x, y, maxWidth, maxHeight, themeColors) {
  if (typeof content === "string") {
    const fontSize = style?.fontSize ?? 14;
    const fontFamily = style?.fontFamily ?? "Arial";
    const fontWeight = style?.fontWeight ?? "normal";
    const fontStyle = style?.fontStyle ?? "normal";
    const color = style?.color;
    ctx.font = buildFontString(fontSize, fontFamily, fontWeight, fontStyle);
    ctx.fillStyle = resolveColorValue(color, themeColors) ?? "#000000";
    ctx.textBaseline = "top";
    const lineHeight = resolveLineHeightPixels(style?.lineHeight, fontSize, fontSize * 1.3);
    const align = style?.textAlign ?? "left";
    const lines = wrapText(ctx, content, maxWidth);
    let cursorY = y;
    for (const line of lines) {
      if (cursorY - y >= maxHeight) break;
      const lineX = alignText(ctx, line, x, maxWidth, align);
      ctx.fillText(line, lineX, cursorY, maxWidth);
      cursorY += lineHeight;
    }
    return;
  }
  paintParagraphs(ctx, [{ runs: content }], style, x, y, maxWidth, maxHeight, themeColors);
}
function buildFontString(fontSize, fontFamily, fontWeight, fontStyle) {
  const weight = fontWeight === "bold" ? "bold" : fontWeight === "normal" || !fontWeight ? "" : /^\d{3}$/.test(fontWeight) ? fontWeight : "";
  const italic = fontStyle === "italic" ? "italic" : "";
  const parts = [italic, weight, `${fontSize}px`].filter(Boolean);
  return `${parts.join(" ")} "${fontFamily}", PaperEmoji, PaperFallback, Arial, sans-serif`;
}
function isCJKCodePoint(cp) {
  return cp >= 12288 && cp <= 40959 || // CJK Unified, Kana, Bopomofo, etc.
  cp >= 44032 && cp <= 55215 || // Hangul Syllables
  cp >= 63744 && cp <= 64255 || // CJK Compatibility Ideographs
  cp >= 65280 && cp <= 65519 || // Fullwidth Forms
  cp >= 131072 && cp <= 195103;
}
function splitIntoSegments(text) {
  const segments = [];
  let current = "";
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (isCJKCodePoint(cp)) {
      if (current) {
        segments.push(current);
        current = "";
      }
      segments.push(char);
    } else if (/\s/.test(char)) {
      current += char;
      segments.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) segments.push(current);
  return segments;
}
function wrapText(ctx, text, maxWidth) {
  if (maxWidth <= 0) return [text];
  const segments = splitIntoSegments(text);
  const lines = [];
  let currentLine = "";
  for (const seg of segments) {
    const testLine = currentLine + seg;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine.trimEnd());
      currentLine = seg.trimStart();
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine.trimEnd());
  }
  return lines.length > 0 ? lines : [""];
}
function alignText(ctx, text, x, maxWidth, align) {
  if (align === "center") {
    const width = ctx.measureText(text).width;
    return x + (maxWidth - width) / 2;
  }
  if (align === "right") {
    const width = ctx.measureText(text).width;
    return x + maxWidth - width;
  }
  return x;
}
function applyTextTransform(text, transform) {
  if (!transform || transform === "none") return text;
  if (transform === "uppercase") return text.toUpperCase();
  if (transform === "lowercase") return text.toLowerCase();
  if (transform === "capitalize") return text.replace(/\b\w/g, (character) => character.toUpperCase());
  return text;
}

// src/renderer/canvasTable.ts
function paintTable(ctx, node, themeColors) {
  const { x, y, width, height } = node.layout;
  const tableData = node.tableData;
  if (!tableData) return;
  ctx.save();
  const columns = resolveTableColumns(tableData, width);
  const rows = tableData.rows;
  const tablePlan = planTableLayout(tableData, width, height);
  const colScale = 1;
  const colPositions = [];
  let currentX = x;
  for (const colWidth of columns) {
    colPositions.push(currentX);
    currentX += colWidth * colScale;
  }
  let rowY = y;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const rowHeight = tablePlan.rows[rowIndex]?.assignedHeight ?? row.height ?? 20;
    for (let colIndex = 0; colIndex < row.cells.length && colIndex < columns.length; colIndex++) {
      const cell = row.cells[colIndex];
      const cellX = colPositions[colIndex];
      const cellWidth = columns[colIndex] * colScale;
      const isHeaderRow = rowIndex === 0 && tableData.style?.firstRow !== false;
      if (isHeaderRow) {
        ctx.fillStyle = resolveColorValue(
          tableData.style?.headerRowStyle?.fill,
          themeColors
        ) ?? "#1E293B";
      } else if (rowIndex % 2 === 1 && tableData.style?.bandRow !== false) {
        ctx.fillStyle = "#F1F5F9";
      } else {
        const cellFill = cell.style?.fill;
        ctx.fillStyle = cellFill ? resolveColorValue(cellFill, themeColors) ?? "#FFFFFF" : "#FFFFFF";
      }
      ctx.fillRect(cellX, rowY, cellWidth, rowHeight);
      const innerBorder = tableData.style?.innerBorderH ?? tableData.style?.innerBorderV;
      ctx.strokeStyle = resolveColorValue(innerBorder?.color, themeColors) ?? "#CBD5E1";
      ctx.lineWidth = innerBorder?.width ?? 0.75;
      ctx.strokeRect(cellX, rowY, cellWidth, rowHeight);
      if (isHeaderRow) {
        ctx.strokeStyle = "#CBD5E1";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cellX, rowY + rowHeight);
        ctx.lineTo(cellX + cellWidth, rowY + rowHeight);
        ctx.stroke();
      }
      const fontSize = cell.style?.fontSize ?? 10;
      const fontFamily = cell.style?.fontFamily ?? "Arial";
      const fontWeight = cell.style?.fontWeight ?? (isHeaderRow ? "bold" : "normal");
      const fontStyle = cell.style?.fontStyle ?? "normal";
      const textColor = cell.style?.color;
      ctx.font = buildFontString(fontSize, fontFamily, fontWeight, fontStyle);
      const defaultTextColor = isHeaderRow ? "#FFFFFF" : "#000000";
      ctx.fillStyle = resolveColorValue(textColor, themeColors) ?? defaultTextColor;
      ctx.textBaseline = "top";
      const padding = cell.style?.padding ?? 5;
      const maxTextWidth = cellWidth - padding * 2;
      const cellText = cell.text ?? "";
      if (cell.paragraphs) {
        paintParagraphs(
          ctx,
          cell.paragraphs,
          void 0,
          cellX + padding,
          rowY + padding,
          maxTextWidth,
          rowHeight - padding * 2,
          themeColors
        );
      } else if (cell.content) {
        paintTextContent(
          ctx,
          cell.content,
          void 0,
          cellX + padding,
          rowY + padding,
          maxTextWidth,
          rowHeight - padding * 2,
          themeColors
        );
      } else if (cellText) {
        ctx.fillText(cellText, cellX + padding, rowY + padding, maxTextWidth);
      }
    }
    rowY += rowHeight;
  }
  ctx.restore();
}

// src/renderer/canvasAsync.ts
var import_jpeg_js = __toESM(require_jpeg_js(), 1);
async function paintCharts(canvas, slideNode, loadImage, themeColors) {
  const ctx = canvas.getContext("2d");
  const scaleX = canvas.width / slideNode.layout.width;
  const scaleY = canvas.height / slideNode.layout.height;
  ctx.save();
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  await paintChartsRecursive(ctx, slideNode, loadImage, themeColors);
  ctx.restore();
}
async function paintChartsRecursive(ctx, node, loadImage, themeColors) {
  if (node.type === "Chart") {
    const { x, y, width, height } = node.layout;
    if (node.chartData && width > 0 && height > 0) {
      try {
        const { rasterizeChart } = await import("./rasterizer-7JRYX5B4.js");
        const pngBuffer = await rasterizeChart(
          node.chartData,
          { width, height, renderer: "echarts" },
          themeColors
        );
        if (pngBuffer) {
          const image = await loadImage(pngBuffer);
          ctx.drawImage(image, x, y, width, height);
        }
      } catch {
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      await paintChartsRecursive(ctx, child, loadImage, themeColors);
    }
  }
}
async function paintImages(canvas, slideNode, loadImage) {
  const ctx = canvas.getContext("2d");
  const scaleX = canvas.width / slideNode.layout.width;
  const scaleY = canvas.height / slideNode.layout.height;
  ctx.save();
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  await paintImagesRecursive(ctx, slideNode, loadImage);
  ctx.restore();
}
async function paintImagesRecursive(ctx, node, loadImage) {
  if (node.type === "Image") {
    const { x, y, width, height } = node.layout;
    if (node.src) {
      try {
        let imageInput;
        let mimeType;
        if (node.src.startsWith("data:")) {
          const commaIdx = node.src.indexOf(",");
          mimeType = node.src.slice(5, commaIdx).split(";")[0]?.toLowerCase();
          const base64 = node.src.slice(commaIdx + 1);
          validateDataUrlSize(base64);
          imageInput = Buffer.from(base64, "base64");
        } else if (node.src.startsWith("http://") || node.src.startsWith("https://")) {
          validateFetchUrl(node.src);
          const response = await fetchWithRetry(node.src, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
          if (!response.ok) {
            return;
          }
          mimeType = response.headers.get("content-type")?.toLowerCase() ?? void 0;
          imageInput = Buffer.from(await response.arrayBuffer());
        } else {
          return;
        }
        if (imageInput instanceof Buffer && looksLikeJpeg(imageInput, mimeType)) {
          try {
            import_jpeg_js.default.decode(imageInput, { useTArray: true });
          } catch {
            return;
          }
        }
        const image = await loadImage(imageInput);
        ctx.save();
        if (node.borderRadius) {
          ctx.beginPath();
          ctx.roundRect(x, y, width, height, node.borderRadius);
          ctx.clip();
        }
        ctx.drawImage(image, x, y, width, height);
        ctx.restore();
      } catch {
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      await paintImagesRecursive(ctx, child, loadImage);
    }
  }
}
function looksLikeJpeg(buffer, mimeType) {
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) {
    return true;
  }
  return buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
}

// src/renderer/canvasRenderer.ts
function renderSlideToCanvas(slideNode, canvas, themeColors, backgroundOverride) {
  const ctx = canvas.getContext("2d");
  const scaleX = canvas.width / slideNode.layout.width;
  const scaleY = canvas.height / slideNode.layout.height;
  ctx.scale(scaleX, scaleY);
  paintSlideBackground(ctx, slideNode, themeColors, backgroundOverride);
  if (slideNode.children) {
    for (const child of slideNode.children) {
      paintNode(ctx, child, themeColors);
    }
  }
}
function paintSlideBackground(ctx, node, themeColors, backgroundOverride) {
  const { width, height } = node.layout;
  if (backgroundOverride) {
    ctx.fillStyle = backgroundOverride;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const bg = node.background;
  if (!bg) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    return;
  }
  switch (bg.type) {
    case "solid": {
      ctx.fillStyle = resolveColorValue(bg.color, themeColors) ?? "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "gradient": {
      const grad = createLinearGradient(ctx, bg, 0, 0, width, height, themeColors);
      if (grad) {
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
      }
      break;
    }
    case "pattern": {
      ctx.fillStyle = resolveColorValue(bg.background, themeColors) ?? "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "image": {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      break;
    }
    default: {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }
  }
}
function paintNode(ctx, node, themeColors) {
  if (node.style?.display === "none") return;
  switch (node.type) {
    case "View":
      paintView(ctx, node, themeColors);
      break;
    case "Text":
      paintText(ctx, node, themeColors);
      break;
    case "Image":
      paintImagePlaceholder(ctx, node, themeColors);
      break;
    case "Chart":
      paintChartPlaceholder(ctx, node, themeColors);
      break;
    case "Table":
      paintTable(ctx, node, themeColors);
      break;
    case "Connector":
      paintConnector(ctx, node, themeColors);
      break;
    case "Group":
      paintGroup(ctx, node, themeColors);
      break;
    case "Video":
    case "Audio":
      paintMediaPlaceholder(ctx, node, themeColors);
      break;
    default:
      if (node.children) {
        for (const child of node.children) {
          paintNode(ctx, child, themeColors);
        }
      }
  }
}
function paintView(ctx, node, themeColors) {
  const { x, y, width, height } = node.layout;
  const style = node.style;
  if (width <= 0 || height <= 0) return;
  ctx.save();
  const rotation = style?.rotation;
  if (rotation) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
  }
  if (style?.opacity !== void 0) {
    ctx.globalAlpha = style.opacity;
  }
  const sp3d = style?.effects?.sp3d;
  if (sp3d?.extrudeHeight && sp3d.extrudeHeight > 0) {
    paint3dExtrusion(ctx, node, x, y, width, height, sp3d, style, themeColors);
  }
  const shadow = style?.effects?.dropShadow;
  if (shadow) {
    ctx.shadowColor = resolveColorValue(shadow.color, themeColors) ?? "rgba(0,0,0,0.3)";
    ctx.shadowBlur = shadow.blurRadius;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
  }
  const fill = style?.fill;
  const bgColor = style?.backgroundColor;
  if (fill) {
    paintFill(ctx, fill, x, y, width, height, node, themeColors);
  } else if (bgColor !== void 0) {
    ctx.fillStyle = resolveColorValue(bgColor, themeColors) ?? "transparent";
    drawShape(ctx, node, x, y, width, height);
    ctx.fill(node.shapeType === "donut" ? "evenodd" : "nonzero");
  }
  if (shadow) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  const borderWidth = style?.borderWidth;
  const borderColor = style?.borderColor;
  if (borderWidth && borderColor) {
    ctx.strokeStyle = resolveColorValue(borderColor, themeColors) ?? "#000000";
    ctx.lineWidth = borderWidth;
    if (style?.borderStyle === "dashed") ctx.setLineDash([borderWidth * 3, borderWidth * 2]);
    else if (style?.borderStyle === "dotted") ctx.setLineDash([borderWidth, borderWidth * 2]);
    else ctx.setLineDash([]);
    drawShape(ctx, node, x, y, width, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  paintReflection(ctx, node, x, y, width, height, style, themeColors);
  const innerShadow = style?.effects?.innerShadow;
  if (innerShadow) {
    ctx.save();
    drawShape(ctx, node, x, y, width, height);
    ctx.clip();
    const resolved = resolveColorValue(innerShadow.color, themeColors) ?? "rgba(0,0,0,0.3)";
    ctx.shadowColor = resolved;
    ctx.shadowBlur = innerShadow.blurRadius;
    ctx.shadowOffsetX = innerShadow.offsetX;
    ctx.shadowOffsetY = innerShadow.offsetY;
    drawShape(ctx, node, x, y, width, height);
    const pad = 2e3 + innerShadow.blurRadius;
    ctx.rect(x - pad, y - pad, width + 2 * pad, height + 2 * pad);
    ctx.fillStyle = resolved;
    ctx.fill("evenodd");
    ctx.restore();
  }
  if (sp3d?.bevelTop || sp3d?.bevelBottom) {
    paint3dBevel(ctx, node, x, y, width, height, sp3d, style?.effects?.scene3d);
  }
  if (sp3d?.contourWidth && sp3d.contourColor) {
    ctx.save();
    ctx.strokeStyle = resolveColorValue(sp3d.contourColor, themeColors) ?? "#000000";
    ctx.lineWidth = sp3d.contourWidth;
    drawShape(ctx, node, x, y, width, height);
    ctx.stroke();
    ctx.restore();
  }
  if (node.textParagraphs || node.textContent) {
    const textStyle = node.textStyle;
    const insets = textStyle?.textInsets;
    const tx = x + (insets?.left ?? 0);
    const ty = y + (insets?.top ?? 0);
    const tw = width - (insets?.left ?? 0) - (insets?.right ?? 0);
    const th = height - (insets?.top ?? 0) - (insets?.bottom ?? 0);
    if (node.textParagraphs) {
      paintParagraphs(ctx, node.textParagraphs, textStyle, tx, ty, tw, th, themeColors);
    } else if (node.textContent) {
      paintTextContent(ctx, node.textContent, textStyle, tx, ty, tw, th, themeColors);
    }
  }
  if (node.children && !node.textParagraphs && !node.textContent) {
    for (const child of node.children) {
      paintNode(ctx, child, themeColors);
    }
  }
  ctx.restore();
}
function paintText(ctx, node, themeColors) {
  const { x, y, width, height } = node.layout;
  const style = node.style;
  ctx.save();
  const bgColor = style?.backgroundColor;
  const fill = style?.fill;
  if (fill) {
    paintFill(ctx, fill, x, y, width, height, node, themeColors);
  } else if (bgColor) {
    ctx.fillStyle = resolveColorValue(bgColor, themeColors) ?? "transparent";
    ctx.fillRect(x, y, width, height);
  }
  if (style?.borderWidth && style?.borderColor) {
    ctx.strokeStyle = resolveColorValue(style.borderColor, themeColors) ?? "#000000";
    ctx.lineWidth = style.borderWidth;
    ctx.strokeRect(x, y, width, height);
  }
  const insets = style?.textInsets;
  const tx = x + (insets?.left ?? 0);
  const ty = y + (insets?.top ?? 0);
  const tw = width - (insets?.left ?? 0) - (insets?.right ?? 0);
  const th = height - (insets?.top ?? 0) - (insets?.bottom ?? 0);
  const autoFitResult = node._autoFitResult;
  const effectiveStyle = autoFitResult && autoFitResult.fontScale < 1e5 ? { ...style, fontSize: (style?.fontSize ?? 14) * autoFitResult.fontScale / 1e5 } : style;
  if (node.paragraphs) {
    paintParagraphs(ctx, node.paragraphs, effectiveStyle, tx, ty, tw, th, themeColors);
  } else if (node.content) {
    paintTextContent(ctx, node.content, effectiveStyle, tx, ty, tw, th, themeColors);
  }
  if (node.children) {
    for (const child of node.children) {
      paintNode(ctx, child, themeColors);
    }
  }
  ctx.restore();
}
function paintGroup(ctx, node, themeColors) {
  const style = node.style;
  const hasOpacity = style?.opacity !== void 0;
  const hasRotation = !!style?.rotation;
  if (hasOpacity || hasRotation) {
    ctx.save();
    if (hasRotation) {
      const { x, y, width, height } = node.layout;
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(style.rotation * Math.PI / 180);
      ctx.translate(-cx, -cy);
    }
    if (hasOpacity) {
      ctx.globalAlpha = style.opacity;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      paintNode(ctx, child, themeColors);
    }
  }
  if (hasOpacity || hasRotation) {
    ctx.restore();
  }
}

// src/renderer/index.ts
function isOptionalCanvasUnavailable(error) {
  if (!(error instanceof Error)) return false;
  const moduleError = error;
  const missingModule = moduleError.code === "ERR_MODULE_NOT_FOUND" || moduleError.code === "MODULE_NOT_FOUND" || error.message.includes("Cannot find module") || error.message.includes("Cannot find package") || error.message.includes("could not load the native binding");
  return missingModule && (error.message.includes("@napi-rs/canvas") || error.message.includes("canvas-") || error.message.includes("native binding"));
}
function recordCanvasUnavailable(error) {
  getLogger().metric?.("runstamp.optional_capability_unavailable", 1, {
    capability: "canvas-preview",
    reason: error instanceof Error && error.message.includes("native binding") ? "native-binding-unavailable" : "package-not-installed"
  });
}
async function renderSlideToBuffer(slideNode, options) {
  try {
    const { createCanvas, GlobalFonts, loadImage } = await import("@napi-rs/canvas");
    const width = options?.width ?? 960;
    const height = options?.height ?? 540;
    const scale = options?.scale ?? 2;
    const pixelWidth = Math.round(width * scale);
    const pixelHeight = Math.round(height * scale);
    ensureFontsRegistered(slideNode, GlobalFonts);
    const canvas = createCanvas(pixelWidth, pixelHeight);
    renderSlideToCanvas(slideNode, canvas, options?.themeColors);
    await paintImages(canvas, slideNode, loadImage);
    await paintCharts(canvas, slideNode, loadImage, options?.themeColors);
    return canvas.toBuffer("image/png");
  } catch (err) {
    if (isOptionalCanvasUnavailable(err)) {
      recordCanvasUnavailable(err);
    } else {
      getLogger().warn(`[renderer] renderSlideToBuffer failed: ${err instanceof Error ? err.message : err}`);
    }
    return void 0;
  }
}
async function renderAllSlidesToBuffers(slideNodes, options) {
  try {
    const { createCanvas, GlobalFonts, loadImage } = await import("@napi-rs/canvas");
    const width = options?.width ?? 960;
    const height = options?.height ?? 540;
    const scale = options?.scale ?? 2;
    const format = options?.format ?? "png";
    const quality = Math.round(Math.min(100, Math.max(0, options?.quality ?? 85)));
    const pixelWidth = Math.round(width * scale);
    const pixelHeight = Math.round(height * scale);
    for (const node of slideNodes) {
      ensureFontsRegistered(node, GlobalFonts);
    }
    const buffers = [];
    for (const slideNode of slideNodes) {
      const canvas = createCanvas(pixelWidth, pixelHeight);
      renderSlideToCanvas(slideNode, canvas, options?.themeColors);
      await paintImages(canvas, slideNode, loadImage);
      await paintCharts(canvas, slideNode, loadImage, options?.themeColors);
      buffers.push(
        format === "jpeg" ? canvas.toBuffer("image/jpeg", quality) : canvas.toBuffer("image/png")
      );
    }
    return buffers;
  } catch (err) {
    if (isOptionalCanvasUnavailable(err)) {
      recordCanvasUnavailable(err);
    } else {
      getLogger().warn(`[renderer] renderAllSlidesToBuffers failed: ${err instanceof Error ? err.message : err}`);
    }
    return void 0;
  }
}
async function renderSlideToImage(slideNode, slideIndex, options) {
  let createCanvas;
  let GlobalFonts;
  let loadImage;
  try {
    const napiCanvas = await import("@napi-rs/canvas");
    createCanvas = napiCanvas.createCanvas;
    GlobalFonts = napiCanvas.GlobalFonts;
    loadImage = napiCanvas.loadImage;
  } catch (err) {
    if (isOptionalCanvasUnavailable(err)) {
      recordCanvasUnavailable(err);
      return void 0;
    }
    throw err;
  }
  const width = options?.width ?? 960;
  const height = options?.height ?? 540;
  const scale = options?.scale ?? 1;
  const format = options?.format ?? "png";
  const quality = Math.round(Math.min(100, Math.max(0, options?.quality ?? 85)));
  const pixelWidth = Math.round(width * scale);
  const pixelHeight = Math.round(height * scale);
  ensureFontsRegistered(slideNode, GlobalFonts);
  const canvas = createCanvas(pixelWidth, pixelHeight);
  renderSlideToCanvas(slideNode, canvas, options?.themeColors, options?.backgroundOverride);
  await paintImages(canvas, slideNode, loadImage);
  await paintCharts(canvas, slideNode, loadImage, options?.themeColors);
  const buffer = format === "jpeg" ? canvas.toBuffer("image/jpeg", quality) : canvas.toBuffer("image/png");
  return {
    slideIndex,
    buffer,
    width: pixelWidth,
    height: pixelHeight,
    format
  };
}
async function renderSlidesToImages(slideNodes, slideIndices, options) {
  let createCanvas;
  let GlobalFonts;
  let loadImage;
  try {
    const napiCanvas = await import("@napi-rs/canvas");
    createCanvas = napiCanvas.createCanvas;
    GlobalFonts = napiCanvas.GlobalFonts;
    loadImage = napiCanvas.loadImage;
  } catch (err) {
    if (isOptionalCanvasUnavailable(err)) {
      recordCanvasUnavailable(err);
      return void 0;
    }
    throw err;
  }
  const width = options?.width ?? 960;
  const height = options?.height ?? 540;
  const scale = options?.scale ?? 1;
  const format = options?.format ?? "png";
  const quality = Math.round(Math.min(100, Math.max(0, options?.quality ?? 85)));
  const pixelWidth = Math.round(width * scale);
  const pixelHeight = Math.round(height * scale);
  for (const node of slideNodes) {
    ensureFontsRegistered(node, GlobalFonts);
  }
  const images = [];
  for (let i = 0; i < slideNodes.length; i++) {
    const slideNode = slideNodes[i];
    const canvas = createCanvas(pixelWidth, pixelHeight);
    renderSlideToCanvas(slideNode, canvas, options?.themeColors, options?.backgroundOverride);
    await paintImages(canvas, slideNode, loadImage);
    await paintCharts(canvas, slideNode, loadImage, options?.themeColors);
    const buffer = format === "jpeg" ? canvas.toBuffer("image/jpeg", quality) : canvas.toBuffer("image/png");
    images.push({
      slideIndex: slideIndices[i],
      buffer,
      width: pixelWidth,
      height: pixelHeight,
      format
    });
  }
  return images;
}

export {
  isOptionalCanvasUnavailable,
  renderSlideToBuffer,
  renderAllSlidesToBuffers,
  renderSlideToImage,
  renderSlidesToImages
};
//# sourceMappingURL=chunk-T7AK3EDB.js.map
