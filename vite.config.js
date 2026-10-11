import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["bass-because-edition-metallic.trycloudflare.com"],
  },
});
