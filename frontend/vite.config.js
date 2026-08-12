import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: base must match your repo name exactly, wrapped in slashes,
// e.g. if your repo is github.com/yourname/mlis-l, base is "/mlis-l/".
// If you're deploying to a custom domain or a *.github.io user/org page
// (not a project page), set base back to "/".
export default defineConfig({
  plugins: [react()],
  base: "/mlis-l/",
});
