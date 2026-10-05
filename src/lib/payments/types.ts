export type PaymentMethodId = "COD" | "RAZORPAY" | "UPI";

export interface PaymentOrderContext {
  orderId: string;
  orderNumber: string;
  amount: number; // whole rupees
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
}

/** What the client must do after the order row is created. */
export type PaymentIntent =
  | { kind: "none" }
  | {
      kind: "razorpay";
      keyId: string;
      razorpayOrderId: string;
      amountPaise: number;
      currency: "INR";
    };

export interface PaymentProvider {
  id: PaymentMethodId;
  label: string;
  description: string;
  /** True only when everything this provider needs is really configured. */
  isAvailable(opts: { codEnabled: boolean }): boolean;
  /** Called after the pending order exists. Must never report a payment as successful. */
  createIntent(ctx: PaymentOrderContext): Promise<PaymentIntent & { providerOrderId?: string }>;
}
