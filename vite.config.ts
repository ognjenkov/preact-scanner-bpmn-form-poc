import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  server: {
    host: "0.0.0.0", // This will allow external devices to access the app
    port: 3000, // You can change this port if needed
  },
});
