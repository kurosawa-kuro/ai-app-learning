const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/basic-browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8195" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, isMobile: true },
    },
  ],
  webServer: {
    command: "node scripts/basic-preview.cjs 8195",
    url: "http://127.0.0.1:8195",
    reuseExistingServer: false,
  },
});
