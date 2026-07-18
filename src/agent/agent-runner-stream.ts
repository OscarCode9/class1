import crypto from "crypto";
import { executeAgentTool } from "./tool-executor";
import { toolDefinitions } from "./tool-definitions";
import { QwenProvider, type IAIProvider, type IChatMessage, type IStreamEvent, type IStreamingResult } from "./ai-provider";

export interface IAgentStreamEvent {
  type: "thinking" | "reasoning" | "delta" | "tool_call" | "tool_args" | "tool_result" | "done" | "error";
  content?: string;
  toolName?: string;
  toolCallId?: string;
  pendingConfirmation?: {
    taskId: string;
    confirmToken: string;
  };
  traceId?: string;
}

const SYSTEM_PROMPT = `Eres un asistente inteligente de gestión de tareas y te comportas siempre como un "compa" (amigable, cercano y de confianza).
Tienes acceso a herramientas para listar, obtener, crear, actualizar, cambiar el estado y eliminar tareas asignadas a ti.

Reglas de personalidad y comportamiento:
1. Sé siempre sumamente amable, servicial y exprésate de manera amigable, relajada y cercana, como si hablaras con un gran amigo ("compa").

Reglas críticas de seguridad:
1. Solo puedes administrar tareas asociadas al usuario actual.
2. Si ejecutas una eliminación de tarea (delete_task), el sistema requerirá confirmación. Si se requiere confirmación, explica amigablemente al usuario que la acción es destructiva y solicita su confirmación.
3. No intentes inventar nombres de herramientas. Usa exactamente las provistas.`;

/**
 * Runs the ReAct agent loop in streaming mode, yielding intermediate events.
 */
export async function* runAgentStream(
  message: string,
  userId: string,
  confirmationToken?: string,
  provider?: IAIProvider,
  abortSignal?: AbortSignal
): AsyncGenerator<IAgentStreamEvent, void, unknown> {
  const traceId = crypto.randomUUID();

  // Yield initial state
  yield { type: "thinking", traceId };

  const messages: IChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message },
  ];

  const maxSteps = 5;
  let currentStep = 0;
  let finalResponseText = "";
  let pendingConfirmation: { taskId: string; confirmToken: string } | undefined = undefined;

  const actualProvider = provider || new QwenProvider();
  if (!actualProvider.sendMessageStream) {
    throw new Error("Provider does not support streaming calls");
  }

  try {
    while (currentStep < maxSteps) {
      currentStep++;

      const stream = actualProvider.sendMessageStream(messages, toolDefinitions, abortSignal);
      let result: IStreamingResult | undefined;

      while (true) {
        const { done, value } = await stream.next();
        if (done) {
          result = value;
          break;
        }

        const event = value as IStreamEvent;
        if (event.type === "reasoning" && event.content) {
          yield { type: "reasoning", content: event.content };
        } else if (event.type === "delta" && event.content) {
          finalResponseText += event.content;
          yield { type: "delta", content: event.content };
        } else if (event.type === "tool_call" && event.toolName) {
          yield { type: "tool_call", toolName: event.toolName, toolCallId: event.toolCallId };
        } else if (event.type === "tool_args" && event.content) {
          yield { type: "tool_args", toolName: event.toolName, content: event.content, toolCallId: event.toolCallId };
        }
      }

      if (!result) {
        throw new Error("No result received from Qwen Stream");
      }

      // Add assistant response to history
      messages.push({
        role: "assistant",
        content: result.content,
        tool_calls: result.toolCalls,
      });

      if (result.toolCalls.length === 0) {
        break;
      }

      const toolResultsMessages: IChatMessage[] = [];
      let shouldHaltLoop = false;

      for (const toolCall of result.toolCalls) {
        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          parsedArgs = {};
        }

        if (toolCall.function.name === "delete_task" && confirmationToken) {
          parsedArgs.confirmToken = confirmationToken;
        }

        const toolResult = await executeAgentTool(toolCall.function.name, parsedArgs, userId);
        yield { type: "tool_result", toolName: toolCall.function.name, content: JSON.stringify(toolResult) };

        if (toolResult.success && toolResult.data?.status === "requires_confirmation") {
          pendingConfirmation = {
            taskId: parsedArgs.id,
            confirmToken: toolResult.data.confirmToken,
          };
          finalResponseText = toolResult.data.message || "Se requiere confirmación para eliminar esta tarea.";
          yield { type: "delta", content: finalResponseText };
          shouldHaltLoop = true;
        }

        const observationContent = toolResult.success
          ? JSON.stringify(toolResult.data)
          : JSON.stringify({ error: toolResult.error });

        toolResultsMessages.push({
          role: "tool",
          content: observationContent,
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        });
      }

      messages.push(...toolResultsMessages);

      if (shouldHaltLoop) {
        break;
      }
    }

    if (currentStep >= maxSteps && !finalResponseText && !pendingConfirmation) {
      finalResponseText = "Se alcanzó el límite máximo de pasos en el agente sin obtener respuesta.";
      yield { type: "delta", content: finalResponseText };
    }

    yield {
      type: "done",
      content: finalResponseText || undefined,
      pendingConfirmation,
    };
  } catch (error: any) {
    yield { type: "error", content: error.message || "Un error desconocido ocurrió durante el streaming." };
  }
}
