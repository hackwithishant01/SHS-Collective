import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatINR,
  formatPhone,
  normaliseIndianPhone,
  paiseToRupeeInput,
  parseRupeesToPaise,
  titleCase,
  whatsappDigits,
} from "@/lib/format";

describe("money", () => {
  it("formats integer paise as INR without floating point drift", () => {
    expect(formatINR(129900)).toBe("₹1,299");
    expect(formatINR(129950)).toBe("₹1,299.50");
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(199)).toBe("₹1.99");
  });

  it("parses human rupee input into integer paise", () => {
    expect(parseRupeesToPaise("1299")).toBe(129900);
    expect(parseRupeesToPaise("1,299")).toBe(129900);
    expect(parseRupeesToPaise("₹1299.50")).toBe(129950);
    expect(parseRupeesToPaise("1299.5")).toBe(129950);
    expect(parseRupeesToPaise("Rs. 500")).toBe(50000);
    expect(parseRupeesToPaise(" 9999 ")).toBe(999900);
  });

  it("rounds numeric input to the nearest paisa", () => {
    expect(parseRupeesToPaise(1299.994)).toBe(129999);
    expect(parseRupeesToPaise(0)).toBe(0);
  });

  it("rejects invalid or unsafe amounts", () => {
    expect(parseRupeesToPaise("")).toBeNull();
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise("12.345")).toBeNull();
    expect(parseRupeesToPaise("-5")).toBeNull();
    expect(parseRupeesToPaise("10000000")).toBeNull();
    expect(parseRupeesToPaise(Number.NaN)).toBeNull();
    expect(parseRupeesToPaise(-1)).toBeNull();
  });

  it("round-trips paise into editable rupee strings", () => {
    expect(paiseToRupeeInput(129900)).toBe("1299");
    expect(paiseToRupeeInput(129950)).toBe("1299.50");
    expect(paiseToRupeeInput(5)).toBe("0.05");
    expect(paiseToRupeeInput(null)).toBe("");
    expect(paiseToRupeeInput(Number.NaN)).toBe("");
  });
});

describe("Indian phone numbers", () => {
  it("normalises local, prefixed and spaced numbers to E.164", () => {
    expect(normaliseIndianPhone("9711366699")).toBe("+919711366699");
    expect(normaliseIndianPhone("+91 97113 66699")).toBe("+919711366699");
    expect(normaliseIndianPhone("09711366699")).toBe("+919711366699");
    expect(normaliseIndianPhone("91-97113-66699")).toBe("+919711366699");
  });

  it("rejects numbers that are not valid Indian mobiles", () => {
    expect(normaliseIndianPhone("1234567890")).toBeNull();
    expect(normaliseIndianPhone("5711366699")).toBeNull();
    expect(normaliseIndianPhone("971136669")).toBeNull();
    expect(normaliseIndianPhone("")).toBeNull();
  });

  it("formats and encodes numbers for display and wa.me", () => {
    expect(formatPhone("+919711366699")).toBe("+91 97113 66699");
    expect(formatPhone("9711366699")).toBe("9711366699");
    expect(whatsappDigits("+919711366699")).toBe("919711366699");
    expect(whatsappDigits("9711366699")).toBe("919711366699");
    expect(whatsappDigits("09711366699")).toBe("919711366699");
    expect(whatsappDigits("+14155552671")).toBe("14155552671");
    expect(whatsappDigits("123")).toBeNull();
  });
});

describe("dates and labels", () => {
  it("formats dates in IST regardless of the server timezone", () => {
    expect(formatDate("2026-01-01T18:30:00.000Z")).toBe("2 Jan 2026");
    expect(formatDate("2026-01-01T18:29:59.000Z")).toBe("1 Jan 2026");
  });

  it("adds an explicit IST suffix to timestamps", () => {
    const formatted = formatDateTime("2026-01-01T18:30:00.000Z");
    expect(formatted).toContain("2 Jan 2026");
    expect(formatted).toMatch(/12:00\s?am/);
    expect(formatted.endsWith(" IST")).toBe(true);
  });

  it("degrades gracefully for missing or invalid dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("title-cases enum-like labels", () => {
    expect(titleCase("pre_owned")).toBe("Pre Owned");
    expect(titleCase("pending-confirmation")).toBe("Pending Confirmation");
  });
});
