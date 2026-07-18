import { Router, type Response, type NextFunction } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../middleware/auth";
import { runAgentStream } from "../agent/agent-runner-stream";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacío").max(2000, "El mensaje no puede exceder los 2000 caracteres"),
  confirmationToken: z.string().optional(),
});

function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: any, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function createAgentRoutes(): Router {
  const router = Router();

  // Apply auth middleware to protect /agent/chat
  router.use(authMiddleware as any);

  // POST /chat - ReAct agent loop chat with SSE streaming
  router.post(
    "/chat",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      // Validate request body
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Datos de entrada inválidos");
      }

      const { message, confirmationToken } = parsed.data;
      const userId = req.user!.id;

      // Set headers for Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders(); // Establish stream connection immediately

      const abortController = new AbortController();

      // Listen for client disconnect and abort stream loop
      req.on("close", () => {
        abortController.abort();
      });

      try {
        const stream = runAgentStream(message, userId, confirmationToken, undefined, abortController.signal);
        
        while (true) {
          const { done, value } = await stream.next();
          if (done) break;

          // Write Event to client connection stream
          res.write(`data: ${JSON.stringify(value)}\n\n`);
        }
      } catch (error: any) {
        // Emit error event to client before closing stream connection
        res.write(`data: ${JSON.stringify({ type: "error", content: error.message || "Error interno del agente" })}\n\n`);
      } finally {
        res.end();
      }
    })
  );

  return router;
}
