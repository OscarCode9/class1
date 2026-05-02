import { createApp } from "./app";
import { config } from "./config";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/api/${config.apiVersion}/health`);
  console.log(`Environment: ${config.nodeEnv}`);
});

function shutdown() {
  console.log("\nShutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
