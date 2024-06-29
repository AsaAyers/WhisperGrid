import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "8imswj",
  video: true,
  videoCompression: true,
  trashAssetsBeforeRuns: true,
  screenshotOnRunFailure: true,
  e2e: {
    baseUrl: "http://localhost:1234",
    video: true,
    videoCompression: true,
    viewportWidth: 800,
    viewportHeight: 400,
    trashAssetsBeforeRuns: true,
    screenshotOnRunFailure: true,
    setupNodeEvents() {
      // implement node event listeners here
    },
  },
});
