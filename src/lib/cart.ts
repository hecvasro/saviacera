/**
 * Saviacera client-side cart
 * --------------------------
 * Plain TypeScript module. Persisted in localStorage. No framework.
 *
 * - `saviacera:cart`         → items in the cart
 * - `saviacera:order`        → last order metadata (orderId + status), used to
 *                              detect a returning visitor with an unconfirmed
 *                              order so we can show a "still pending" banner.
 *                              TODO: render that banner on the home/cart page.
 *
 * Anything that mutates the cart fires a `saviacera:cart-changed` event on
 * `window` so headers / mini-carts can refresh without page reload.
 */

export interface CartItem {
  slug: string;
  name: string;
  unitPrice: number;
  qty: number;
  image?: string;
  /** Chosen variation value, e.g. "Lavanda". Absent when the product has no
   *  variations. Two cart lines for the same product but different variants
   *  are distinct lines (different price, different WhatsApp line). */
  variant?: string;
}

/**
 * Identity of a cart line. A product without variations is keyed by `slug`;
 * a product with a chosen variation is keyed by `slug::variant` so the same
 * product in two scents stays as two independent lines. Everything that
 * mutates a specific line (qty, remove) addresses it by this key.
 */
export function lineKey(item: Pick<CartItem, "slug" | "variant">): string {
  return item.variant ? `${item.slug}::${item.variant}` : item.slug;
}

export interface OrderMeta {
  orderId: string;
  /** Lifecycle status. Currently flips from "pending" → "sent" once the user
   *  hits the WhatsApp link; future states can include "confirmed", "paid", … */
  status: "pending" | "sent" | "confirmed" | "cancelled";
  createdAt: string; // ISO
  total: number;
}

const CART_KEY = "saviacera:cart";
const ORDER_KEY = "saviacera:order";

/** Internal: read from localStorage with safety. SSR-safe. */
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("saviacera:cart-changed"));
}

/* ----------------------------------------------------------------------------
 * Cart accessors
 * -------------------------------------------------------------------------- */

export function getCart(): CartItem[] {
  return readJSON<CartItem[]>(CART_KEY, []);
}

export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

export function getSubtotal(): number {
  return getCart().reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}

export function addToCart(item: Omit<CartItem, "qty">, qty = 1): void {
  const cart = getCart();
  const key = lineKey(item);
  const existing = cart.find((i) => lineKey(i) === key);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...item, qty });
  }
  writeJSON(CART_KEY, cart);
  emit();
}

export function removeFromCart(key: string): void {
  const cart = getCart().filter((i) => lineKey(i) !== key);
  writeJSON(CART_KEY, cart);
  emit();
}

export function setQty(key: string, qty: number): void {
  if (qty <= 0) return removeFromCart(key);
  const cart = getCart();
  const item = cart.find((i) => lineKey(i) === key);
  if (!item) return;
  item.qty = qty;
  writeJSON(CART_KEY, cart);
  emit();
}

export function clearCart(): void {
  writeJSON(CART_KEY, []);
  emit();
}

/* ----------------------------------------------------------------------------
 * Order metadata
 * -------------------------------------------------------------------------- */

/**
 * Generate an order ID as a local-time timestamp: `YYYY-MM-DD HH:MM:SS`.
 *
 * Owner preference — the wife reads orders out of the WhatsApp messages and
 * finds a timestamp more useful than a random suffix. Collisions only happen
 * if two orders are confirmed in the same second, which is acceptable for a
 * shop at this scale and the Apps Script side stamps its own server-side
 * Timestamp column anyway.
 */
export function getOrderId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    ` ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}

export function getOrderMeta(): OrderMeta | null {
  return readJSON<OrderMeta | null>(ORDER_KEY, null);
}

export function setOrderMeta(meta: OrderMeta): void {
  writeJSON(ORDER_KEY, meta);
}

export function clearOrderMeta(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ORDER_KEY);
}

/**
 * Returns true if a previous order exists in localStorage and never reached a
 * terminal state (i.e. customer hasn't confirmed via WhatsApp). Used to drive
 * a "still pending" banner — wired up later.
 */
export function hasPendingOrder(): boolean {
  const meta = getOrderMeta();
  return !!meta && (meta.status === "pending" || meta.status === "sent");
}
