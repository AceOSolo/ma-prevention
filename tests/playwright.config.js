// Tests de bout en bout de ma-prevention.fr.
// Lancement : cd tests && npm install && npx playwright test
// Le site est servi par le serveur intégré de PHP, avec un faux sendmail
// qui écrit les e-mails du formulaire dans tests/.tmp/mail.log.
// BASE_URL permet de viser un autre serveur (Apache avec le .htaccess par exemple).

const path = require("path");
const { defineConfig, devices } = require("@playwright/test");

const PORT = 8090;
const root = path.resolve(__dirname, "..");
const sendmail = path.join(__dirname, "fixtures", "fake-sendmail.sh");

module.exports = defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.js/,
  timeout: 30000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `php -d sendmail_path="${sendmail}" -S 127.0.0.1:${PORT} -t "${root}"`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "ignore",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
});
