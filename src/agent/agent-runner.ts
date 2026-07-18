import crypto from "crypto";
import { executeAgentTool } from "./tool-executor";
import { toolDefinitions } from "./tool-definitions";
import { QwenProvider, type IAIProvider, type IChatMessage } from "./ai-provider";

export interface IAgentEvent {
  type: "agent.started" | "llm.completed" | "tool.requested" | "tool.executed" | "agent.completed";
  timestamp: string;
  data?: any;
}

export interface IAgentRunnerResult {
  text: string | null;
  pendingConfirmation?: {
    taskId: string;
    confirmToken: string;
  };
  traceId: string;
  events: IAgentEvent[];
}

const SYSTEM_PROMPT = `Eres un asistente inteligente de gestión de tareas.
Tienes acceso a herramientas para listar, obtener, crear, actualizar, cambiar el estado y eliminar tareas asignadas a ti.

Reglas críticas de seguridad:
1. Solo puedes administrar tareas asociadas al usuario actual.
2. Si ejecutas una eliminación de tarea (delete_task), el sistema requerirá confirmación. Si se requiere confirmación, explica cortésmente al usuario que la acción es destructiva y solicita su confirmación.
3. No intentes inventar nombres de herramientas. Usa exactamente las provistas.`;

/**
 * Executes the ReAct agent loop (Reasoning -> Action -> Observation).
 */
export async function runAgent(
  message: string,
  userId: string,
  confirmationToken?: string,
  provider?: IAIProvider
): Promise<IAgentRunnerResult> {
  const traceId = crypto.randomUUID();
  const events: IAgentEvent[] = [];

  const logEvent = (type: IAgentEvent["type"], data?: any) => {
    events.push({
      type,
      timestamp: new Date().toISOString(),
      data,
    });
  };

  logEvent("agent.started", { userId });

  // Initialize message history
  const messages: IChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message },
  ];

  const maxSteps = 5;
  let currentStep = 0;
  let finalResponseText: string | null = null;
  let pendingConfirmation: { taskId: string; confirmToken: string } | undefined = undefined;

  const actualProvider = provider || new QwenProvider();

  while (currentStep < maxSteps) {
    currentStep++;

    // 1. [DECISION_MODELO] - The model is called with the conversation history and available tools to decide its next step.
    const response = await actualProvider.sendMessage(messages, toolDefinitions);
    logEvent("llm.completed");

    // Add assistant's response to history
    messages.push({
      role: "assistant",
      content: response.text,
      tool_calls: response.toolCalls,
    });

    // 2. [DETIENE_LOOP] - The loop stops if there are no tool calls requested by the model.
    if (!response.toolCalls || response.toolCalls.length === 0) {
      finalResponseText = response.text;
      break;
    }

    const toolResultsMessages: IChatMessage[] = [];
    let shouldHaltLoop = false;

    // Process requested tool calls sequentially
    for (const toolCall of response.toolCalls) {
      logEvent("tool.requested", { toolName: toolCall.function.name, id: toolCall.id });

      // 3. [VALIDACION_APLICACION] - The application parses and validates the tool arguments.
      let parsedArgs: any = {};
      try {
        parsedArgs = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch (err) {
        parsedArgs = {};
      }

      // If delete_task is called and a user confirmationToken was provided, inject it
      if (toolCall.function.name === "delete_task" && confirmationToken) {
        parsedArgs.confirmToken = confirmationToken;
      }

      // 4. [ACCION_REAL] - The application executes the real database logic / action securely bounded by the user ID.
      const result = await executeAgentTool(toolCall.function.name, parsedArgs, userId);
      logEvent("tool.executed", { toolName: toolCall.function.name, success: result.success });

      // Check if human-in-the-loop confirmation is required
      if (result.success && result.data?.status === "requires_confirmation") {
        pendingConfirmation = {
          taskId: parsedArgs.id,
          confirmToken: result.data.confirmToken,
        };
        finalResponseText = result.data.message || "Se requiere confirmación para eliminar esta tarea.";
        
        // 2. [DETIENE_LOOP] - Halt loop when confirmation is required
        shouldHaltLoop = true;
      }

      // Format observation content for the model
      const observationContent = result.success
        ? JSON.stringify(result.data)
        : JSON.stringify({ error: result.error });

      // 5. [AGREGA_OBSERVACION] - The result is fed back into the context as an observation for the model.
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

  // 2. [DETIENE_LOOP] - Max steps reached (ReAct limit guardrail)
  if (currentStep >= maxSteps && !finalResponseText && !pendingConfirmation) {
    finalResponseText = "Se alcanzó el límite máximo de pasos en el agente sin obtener respuesta.";
  }

  logEvent("agent.completed");

  return {
    text: finalResponseText,
    pendingConfirmation,
    traceId,
    events,
  };
}
