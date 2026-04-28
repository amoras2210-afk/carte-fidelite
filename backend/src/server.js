const app = require("./app");
const env = require("./config/env");
const { startReviewNotificationWorker } = require("./services/reviewNotificationWorker");

app.listen(env.port, () => {
  console.log(`Backend running on port ${env.port}`);
});

const stopReviewWorker = startReviewNotificationWorker();
process.on("SIGTERM", () => stopReviewWorker());
process.on("SIGINT", () => stopReviewWorker());
