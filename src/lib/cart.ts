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
  const existing = cart.find((i) => i.slug === item.slug);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...item, qty });
  }
  writeJSON(CART_KEY, cart);
  emit();
}

export function removeFromCart(slug: string): void {
  const cart = getCart().filter((i) => i.slug !== slug);
  writeJSON(CART_KEY, cart);
  emit();
}

export function setQty(slug: string, qty: number): void {
  if (qty <= 0) return removeFromCart(slug);
  const cart = getCart();
  const item = cart.find((i) => i.slug === slug);
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
 * Generate an order ID like `SAV-20260214-0421`.
 *   - Date is local-time YYYYMMDD.
 *   - Suffix is a 4-digit random pad (0000–9999), zero-padded.
 *
 * Uniqueness is best-effort, not guaranteed — the Apps Script side should be
 * idempotent enough that a rare collision is harmless.
 */
export function getOrderId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `SAV-${yyyy}${mm}${dd}-${suffix}`;
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
