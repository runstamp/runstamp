declare module "subset-font";

declare module "harfbuzzjs/hb.js" {
  const createHarfBuzz: (options?: { wasmBinary?: Uint8Array }) => Promise<object>;
  export default createHarfBuzz;
}

declare module "harfbuzzjs/hbjs.js" {
  const wrapHarfBuzz: (module: object) => import("./types/vendor.js").HbApiInstance;
  export default wrapHarfBuzz;
}
