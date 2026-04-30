const app = require("./app");
const env = require("./config/env");
const { startReviewNotificationWorker } = require("./services/reviewNotificationWorker");
const { startAutomationEmailWorker } = require("./services/automationEmailService");

app.listen(env.port, () => {
  console.log(`Backend running on port ${env.port}`);
});

const stopReviewWorker = startReviewNotificationWorker();
const stopAutomationWorker = startAutomationEmailWorker();

process.on("SIGTERM", () => {
  stopReviewWorker();
  stopAutomationWorker();
});
process.on("SIGINT", () => {
  stopReviewWorker();
  stopAutomationWorker();
});
