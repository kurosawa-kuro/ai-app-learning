const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:8192", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:8192",
    reuseExistingServer: false,
  },
});
