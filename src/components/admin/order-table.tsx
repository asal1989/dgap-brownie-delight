import Link from "next/link";
import { EmptyRow, StatusPill, TableWrap, td, th } from "@/components/admin/bits";
import { formatINR } from "@/lib/utils";
import type { OrderStatusValue } from "@/lib/orders/status";

export interface OrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  createdAt: Date;
  status: OrderStatusValue;
  total: number;
  paymentLabel: string;
}

export function OrderTable({ orders }: { orders: OrderRow[] }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <th className={th}>Order</th>
          <th className={th}>Customer</th>
          <th className={th}>Date</th>
          <th className={th}>Payment</th>
          <th className={th}>Status</th>
          <th className={`${th} text-right`}>Total</th>
        </tr>
      </thead>
      <tbody>
        {orders.length === 0 ? <EmptyRow cols={6} text="No orders found." /> : null}
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-page/60">
            <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-semibold text-heading underline-offset-2 hover:underline">{o.orderNumber}</Link></td>
            <td className={td}>{o.customerName}</td>
            <td className={`${td} whitespace-nowrap`}>{o.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
            <td className={td}>{o.paymentLabel}</td>
            <td className={td}><StatusPill status={o.status} /></td>
            <td className={`${td} text-right font-semibold`}>{formatINR(o.total)}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
