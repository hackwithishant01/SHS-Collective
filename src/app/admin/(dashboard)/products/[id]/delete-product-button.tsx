"use client";

import { deleteProductAction } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";

export function DeleteProductButton({ productId }: { productId: string }) {
  return (
    <form
      action={deleteProductAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this product permanently? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit" variant="danger" size="sm">
        Delete product permanently
      </Button>
    </form>
  );
}
