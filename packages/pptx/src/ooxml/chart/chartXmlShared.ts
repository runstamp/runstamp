export const DEFAULT_COLORS = [
  "4472C4",
  "ED7D31",
  "A9D18E",
  "FFC000",
  "5B9BD5",
  "70AD47",
  "264478",
  "9B57A0",
];

export const CAT_AX_ID = "111111111";
export const VAL_AX_ID = "222222222";
export const X_VAL_AX_ID = "333333333";
export const Y_VAL_AX_ID = "444444444";
export const SEC_VAL_AX_ID = "555555555";
export const SEC_CAT_AX_ID = "666666666";

export function colLetter(index: number): string {
  let result = "";
  let value = index;
  while (value >= 0) {
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26) - 1;
  }
  return result;
}
