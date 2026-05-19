/**
 * Checkout flow: cart → Apps Script ping → wa.me deep link.
 *
 * Fail-open by design. If the Apps Script POST throws or returns non-2xx, we
 * still proceed to WhatsApp — the customer can always re-send manually and
 * the WhatsApp message itself contains everything we need.
 */

import { clearCart, getCart, getOrderId, getSubtotal, setOrderMeta, type CartItem } from "./cart";
import { formatDOP } from "./format";

interface OrderLine {
  slug: string;
  name: string;
  /** Chosen variation, e.g. "Lavanda". Omitted for products without variations. */
  variant?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderPayload {
  orderId: string;
  items: OrderLine[];
  total: number;
  createdAt: string; // ISO
}

const ORDER_ENDPOINT = import.meta.env.PUBLIC_ORDER_ENDPOINT;
const WHATSAPP_NUMBER = import.meta.env.PUBLIC_WHATSAPP_NUMBER;

/** Pings the Apps Script endpoint. Resolves regardless of outcome. */
async function postOrder(payload: OrderPayload): Promise<void> {
  if (!ORDER_ENDPOINT || ORDER_ENDPOINT.includes("REPLACE_ME")) {
    console.warn("[saviacera] PUBLIC_ORDER_ENDPOINT is not configured. Skipping order POST.");
    return;
  }
  try {
    // Apps Script Web Apps are quirky about CORS. `text/plain` body sidesteps
    // the preflight; the script still parses JSON via `e.postData.contents`.
    await fetch(ORDER_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[saviacera] order POST failed (proceeding anyway):", err);
  }
}

/** Builds the human-readable WhatsApp message body. Spanish (es-DO). */
function buildWhatsappMessage(payload: OrderPayload): string {
  const lines: string[] = [];
  lines.push("Hola Savia & Cera,");
  lines.push("");
  lines.push("Quiero confirmar este pedido.");
  lines.push("");
  lines.push(`*Pedido:* ${payload.orderId}`);
  lines.push("*Artículos:*");
  for (const it of payload.items) {
    const label = it.variant ? `${it.name} (${it.variant})` : it.name;
    lines.push(`• ${it.qty} × ${label} — ${formatDOP(it.lineTotal)}`);
  }
  lines.push("");
  lines.push(`*Total:* ${formatDOP(payload.total)}`);
  lines.push("");
  lines.push("¿Cómo coordinamos pago y entrega?");
  return lines.join("\n");
}

/** Top-level: call this from the "Confirmar pedido por WhatsApp" button. */
export async function confirmCheckout(): Promise<void> {
  const cart: CartItem[] = getCart();
  if (cart.length === 0) {
    alert("Tu carrito está vacío.");
    return;
  }

  const orderId = getOrderId();
  const items: OrderLine[] = cart.map((i) => ({
    slug: i.slug,
    name: i.name,
    ...(i.variant ? { variant: i.variant } : {}),
    qty: i.qty,
    unitPrice: i.unitPrice,
    lineTotal: i.unitPrice * i.qty,
  }));
  const total = getSubtotal();
  const createdAt = new Date().toISOString();

  const payload: OrderPayload = {
    orderId,
    items,
    total,
    createdAt,
  };

  // Persist before navigating so a returning customer can be detected.
  setOrderMeta({ orderId, status: "pending", createdAt, total });

  await postOrder(payload);

  // Build wa.me URL.
  const number = (WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (!number) {
    alert("El número de WhatsApp no está configurado. Por favor avísanos por otra vía.");
    return;
  }
  const message = buildWhatsappMessage(payload);
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  // Mark as sent right before navigating away. We don't clear the cart yet —
  // if the customer comes back without sending, they keep their items.
  setOrderMeta({ orderId, status: "sent", createdAt, total });

  // Clear the cart so a new order starts fresh on return. The order meta
  // remains so we can show a "tu pedido sigue pendiente" hook later.
  clearCart();

  window.location.href = url;
}
