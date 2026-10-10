import "server-only";
import { db } from "./db";
import { canViewOrder } from "./order-access";

/** An order (with customer-visible history only) if the current visitor is allowed to see it. */
export async function getViewableOrder(orderNumber: string) {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      history: { where: { customerVisible: true }, orderBy: { createdAt: "asc" } },
      reviews: { select: { productId: true, status: true } },
    },
  });
  if (!order || !(await canViewOrder(order))) return null;
  return order;
}
