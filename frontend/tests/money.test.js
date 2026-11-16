import { describe, expect, it } from "vitest";
import {
  centsToDecimal,
  decimalToCents,
  formatMoneyCOP,
  getUndistributedCents,
} from "../src/utils/money.js";

describe("money utilities", () => {
  it("converts decimal strings to exact integer cents", () => {
    expect(decimalToCents("1234.56")).toBe(123456n);
    expect(decimalToCents("0")).toBe(0n);
    expect(decimalToCents("-10.05")).toBe(-1005n);
  });

  it("rejects numbers and values with more than two decimals", () => {
    expect(() => decimalToCents(12.34)).toThrow(TypeError);
    expect(() => decimalToCents("12.345")).toThrow(RangeError);
    expect(() => decimalToCents("1,200.00")).toThrow(RangeError);
    expect(() => decimalToCents("")).toThrow(RangeError);
  });

  it("serializes cents with two decimal positions", () => {
    expect(centsToDecimal(123456n)).toBe("1234.56");
    expect(centsToDecimal(-5n)).toBe("-0.05");
    expect(() => centsToDecimal(100)).toThrow(TypeError);
  });

  it("formats COP without converting the amount to Number", () => {
    expect(formatMoneyCOP("1234567.89")).toBe("$ 1.234.567,89");
    expect(formatMoneyCOP("0.00")).toBe("$ 0,00");
    expect(formatMoneyCOP("-12.50")).toBe("-$ 12,50");
  });

  it("calculates the undistributed amount using exact cents", () => {
    expect(getUndistributedCents("100.00", ["25.10", "24.90"])).toBe(5000n);
    expect(getUndistributedCents("100.00", ["60.00", "50.00"])).toBe(-1000n);
  });
});
