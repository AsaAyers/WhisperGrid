import { defineConfig } from "cypress";
import { rm, rename } from "fs/promises";

export default defineConfig({
  projectId: "8imswj",
  video: true,
  videoCompression: true,
  trashAssetsBeforeRuns: true,
  screenshotOnRunFailure: true,
  e2e: {
    baseUrl: "http://localhost:3000",
    video: true,
    videoCompression: true,
    viewportWidth: 800,
    viewportHeight: 400,
    trashAssetsBeforeRuns: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      on("task", {
        async deleteDownload(thumbprint: string) {
          const path = `${config.downloadsFolder}/grid-${thumbprint}.jws.txt`;
          const tmpName = `${config.downloadsFolder}/__grid-${thumbprint}.jws.txt`;
          await rename(path, tmpName);
          console.log("deleting file %s", path);
          await rm(tmpName);
          return path;
        },
      });
    },
  },
});
