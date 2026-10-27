const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const os = require('node:os');

const selected = process.argv.find(a => a.startsWith('--project='))?.split('=')[1];
const servers = [
  { name: 'images-off', port: 18103, images: false, schema: 'cast_evaluation_e2e_text' },
  { name: 'images-on', port: 18104, images: true, schema: 'cast_evaluation_e2e_images' }
].filter(s => !selected || s.name === selected);

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { ...devices['Desktop Chrome'], screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: servers.map(s => ({ name: s.name, use: { baseURL: `http://127.0.0.1:${s.port}` }, metadata: { images: s.images } })),
  webServer: servers.map(s => ({
    command: `powershell.exe -NoProfile -File ./run-local.ps1 -Action run${s.images ? ' -Images' : ''}`,
    url: `http://127.0.0.1:${s.port}`,
    timeout: 120000,
    reuseExistingServer: false,
    stdout: 'ignore', stderr: 'pipe',
    env: { SERVER_PORT: String(s.port), APP_DB_SCHEMA: s.schema, APP_IMAGES_ENABLED: String(s.images),
      SUPABASE_STORAGE_BUCKET: 'cast-evaluation-images-e2e', DEBUG: 'false',
      LOGGING_FILE_NAME: path.join(os.tmpdir(), `template-ui-${s.name}.log`) }
  }))
});
