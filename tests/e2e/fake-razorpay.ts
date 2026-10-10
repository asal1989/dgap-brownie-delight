import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { E2E_FAKE_RAZORPAY_PORT, E2E_RAZORPAY_KEY_ID, E2E_RAZORPAY_KEY_SECRET } from "./constants";

/**
 * A tiny local stand-in for the Razorpay REST API, so the REAL server code (order creation, payment
 * fetch, signature checks, refunds) is exercised end to end without network access or real credentials.
 *   - /v1/*       mimics the parts of the API the app uses, with HTTP Basic auth like the real thing
 *   - /__test/*   control endpoints the tests use to play the role of "the customer paid"
 * State lives in this process's memory (it is started by Playwright's global setup).
 */
type Order = { id: string; amount: number; currency: string; receipt: string };
type Payment = { id: string; order_id: string; amount: number; currency: string; status: string; method: string };

const orders = new Map<string, Order>();
const payments = new Map<string, Payment>();
const refunds: { id: string; payment_id: string; amount: number }[] = [];
let seq = 1;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return {}; }
}

export function startFakeRazorpay(): Promise<Server> {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    // ── test control endpoints (no auth: only reachable on 127.0.0.1 during tests) ──
    if (url.pathname === "/__test/capture" && req.method === "POST") {
      const b = await readBody(req);
      const order = orders.get(String(b.order_id));
      if (!order) return json(res, 404, { error: "unknown order" });
      const id = `pay_FAKE${seq++}`;
      payments.set(id, {
        id, order_id: order.id, currency: order.currency, method: "upi",
        amount: typeof b.amount === "number" ? b.amount : order.amount,
        status: typeof b.status === "string" ? b.status : "captured",
      });
      return json(res, 200, { payment_id: id });
    }
    if (url.pathname === "/__test/refunds") return json(res, 200, refunds);
    if (url.pathname === "/__test/orders") return json(res, 200, [...orders.values()]);

    // ── the Razorpay API ──
    const auth = req.headers.authorization ?? "";
    const expected = `Basic ${Buffer.from(`${E2E_RAZORPAY_KEY_ID}:${E2E_RAZORPAY_KEY_SECRET}`).toString("base64")}`;
    if (auth !== expected) return json(res, 401, { error: { description: "Authentication failed" } });
    const path = url.pathname.replace(/^\/v1/, "");

    if (req.method === "POST" && path === "/orders") {
      const b = await readBody(req);
      const id = `order_FAKE${seq++}`;
      const o: Order = { id, amount: Number(b.amount), currency: String(b.currency), receipt: String(b.receipt ?? "") };
      orders.set(id, o);
      return json(res, 200, { ...o, status: "created" });
    }
    const pay = /^\/payments\/([^/]+)$/.exec(path);
    if (req.method === "GET" && pay) {
      const p = payments.get(decodeURIComponent(pay[1]));
      return p ? json(res, 200, p) : json(res, 400, { error: { description: "The id provided does not exist" } });
    }
    const refund = /^\/payments\/([^/]+)\/refund$/.exec(path);
    if (req.method === "POST" && refund) {
      const b = await readBody(req);
      const paymentId = decodeURIComponent(refund[1]);
      if (!payments.has(paymentId)) return json(res, 400, { error: { description: "The id provided does not exist" } });
      const r = { id: `rfnd_FAKE${seq++}`, payment_id: paymentId, amount: Number(b.amount) };
      refunds.push(r);
      return json(res, 200, { ...r, status: "processed" });
    }
    return json(res, 404, { error: { description: "Not found" } });
  });
  return new Promise((resolve) => server.listen(E2E_FAKE_RAZORPAY_PORT, "127.0.0.1", () => resolve(server)));
}
