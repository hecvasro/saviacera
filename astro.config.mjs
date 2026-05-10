// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://saviacera.do",
  // Spanish (Dominican Republic) is the primary site language. English is wired up
  // as a future locale so we can plug in i18n later without restructuring routes.
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  // View Transitions are opt-in per page via <ClientRouter />, but we enable the
  // prefetch behavior here so navigations feel instant on slower DR mobile networks.
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },
  vite: {
    // The cast sidesteps a known peer-version mismatch between Astro's bundled
    // Vite types and `@tailwindcss/vite`'s declared Plugin types — they're
    // structurally identical but Astro deduplicates Vite under its own
    // node_modules, so TS sees two distinct `Plugin<any>` shapes.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});
