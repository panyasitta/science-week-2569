import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "science-week-2569";
const isUserOrOrganizationPage = repositoryName.endsWith(".github.io");

export default defineConfig({
  root: "github-pages",
  base: process.env.GITHUB_ACTIONS && !isUserOrOrganizationPage ? `/${repositoryName}/` : "/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../github-dist",
    emptyOutDir: true,
  },
});
