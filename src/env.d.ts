/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Google Apps Script Web App URL that receives orders. */
  readonly PUBLIC_ORDER_ENDPOINT: string;
  /** WhatsApp number, digits only (e.g. "18295286271"). */
  readonly PUBLIC_WHATSAPP_NUMBER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
