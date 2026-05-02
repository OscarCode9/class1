import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createRoutes } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { config } from "./config";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  const apiRouter = createRoutes();
  app.use(`/api/${config.apiVersion}`, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
