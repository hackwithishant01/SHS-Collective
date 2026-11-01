import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import type { OrderStatus, ProductStatus } from "@/lib/types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "completed"
      ? "success"
      : status === "cancelled"
        ? "danger"
        : status === "pending_confirmation"
          ? "gold"
          : "neutral";
  return <Badge tone={tone}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const tone = status === "published" ? "success" : status === "draft" ? "gold" : "muted";
  return <Badge tone={tone}>{PRODUCT_STATUS_LABELS[status]}</Badge>;
}
