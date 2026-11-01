import { NextResponse } from "next/server";
import { sha256 } from "@/lib/auth/tokens";
import { createOrder, OrderError } from "@/lib/data/orders";
import { getPublicSettings } from "@/lib/data/settings";
import { normaliseIndianPhone } from "@/lib/format";
import { checkoutSchema } from "@/lib/schemas";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  hashedIp,
} from "@/lib/rate-limit";

const MAX_BODY_BYTES = 100_000;

function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: "That request is too large." }, 413);
  }

  const ip = clientIpFromHeaders(request.headers);
  const ipHash = hashedIp(ip);
  const ipLimit = await consumeRateLimit(`order-ip:${ipHash}`, 8, 600);
  if (!ipLimit.allowed) {
    return json(
      {
        error: "Too many order attempts. Please wait a few minutes and try again, or message on WhatsApp.",
      },
      429,
      { "Retry-After": String(ipLimit.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "The request body is not valid JSON." }, 400);
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: "Check the highlighted fields.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.map(String).join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }

  const phone = normaliseIndianPhone(parsed.data.phone);
  if (!phone) {
    return json({ error: "Enter a valid Indian mobile number." }, 400);
  }

  const phoneLimit = await consumeRateLimit(`order-phone:${sha256(phone).slice(0, 32)}`, 4, 3600);
  if (!phoneLimit.allowed) {
    return json(
      {
        error: "Several enquiries were just placed with this number. Please wait, or message us on WhatsApp.",
      },
      429,
      { "Retry-After": String(phoneLimit.retryAfterSeconds) },
    );
  }

  try {
    const settings = await getPublicSettings();
    if (parsed.data.fulfilmentMethod === "pickup" && !settings.pickupEnabled) {
      return json({ error: "Local pickup is not currently available." }, 400);
    }

    const result = await createOrder(
      {
        ...parsed.data,
        phone,
      },
      { ipHash },
    );

    return json(result, 200);
  } catch (error) {
    if (error instanceof OrderError) {
      return json({ error: error.message, code: error.code }, error.status);
    }
    console.error("[orders] create failed", error);
    return json(
      { error: "The order enquiry could not be created. Please try again or message on WhatsApp." },
      500,
    );
  }
}
