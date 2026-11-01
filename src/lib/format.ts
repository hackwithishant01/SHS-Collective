const wholeRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const withPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats integer paise as an INR string, e.g. 129900 -> "₹1,299" and
 * 129950 -> "₹1,299.50". Whole rupees stay clean; any paise are shown to two
 * decimal places so an amount never reads as "₹1,299.5".
 */
export function formatINR(paise: number): string {
  if (!Number.isFinite(paise)) return "₹0";
  const formatter = paise % 100 === 0 ? wholeRupees : withPaise;
  return formatter.format(paise / 100);
}

/**
 * Parses a human-entered rupee amount into integer paise without floating point
 * arithmetic. Accepts "1,299", "₹1299.50", "1299.5". Returns null when invalid.
 */
export function parseRupeesToPaise(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * 100);
  }

  const cleaned = input
    .trim()
    .replace(/[\s,₹]/g, "")
    .replace(/^rs\.?/i, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null;

  const [rupees, decimals = ""] = cleaned.split(".");
  const paise = Number(rupees) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** Converts paise to an editable rupee string, e.g. 129950 -> "1299.50". */
export function paiseToRupeeInput(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || !Number.isFinite(paise)) return "";
  const rupees = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  return remainder === 0 ? String(rupees) : `${rupees}.${String(remainder).padStart(2, "0")}`;
}

/**
 * Normalises an Indian phone number to E.164 (+91XXXXXXXXXX).
 * Accepts spaces, dashes, an optional +91, 91 or leading 0.
 */
export function normaliseIndianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local = digits;

  if (digits.length === 12 && digits.startsWith("91")) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) local = digits.slice(1);

  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return `+91${local}`;
}

/** Formats +919711366699 for display as +91 97113 66699. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return phone;
}

/** Returns digits suitable for wa.me, adding India's 91 when needed. */
export function whatsappDigits(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) {
    const local = digits.slice(1);
    if (/^[6-9]\d{9}$/.test(local)) return `91${local}`;
  }
  if (digits.length === 12 && digits.startsWith("91") && /^91[6-9]\d{9}$/.test(digits)) return digits;
  if (/^[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}

const istDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const istDateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return istDate.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return `${istDateTime.format(date)} IST`;
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
