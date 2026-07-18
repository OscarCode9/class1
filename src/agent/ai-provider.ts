import { config } from "../config";
import { sanitizeMessagesForQwen, isQwenInspectionError } from "./qwen-sanitize";

export interface IToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface IChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: IToolCall[];
}

export interface IAIResponse {
  text: string | null;
  toolCalls?: IToolCall[];
  rawAssistantContent?: any;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface IAIProvider {
  sendMessage(messages: IChatMessage[], tools?: any[]): Promise<IAIResponse>;
}

export class QwenProvider implements IAIProvider {
  private apiKey: string;
  private host: string;
  private model: string;
  private timeoutMs: number;

  constructor(options?: { timeoutMs?: number }) {
    const key = config.qwen.apiKey || process.env.QWEN_API_KEY;
    if (!key) {
      throw new Error("Missing QWEN_API_KEY environment variable");
    }
    this.apiKey = key;
    this.host = config.qwen.apiHost || process.env.QWEN_API_HOST || "https://dashscope-international.aliyuncs.com/compatible-mode/v1";
    this.model = config.qwen.model || process.env.QWEN_MODEL || "qwen-plus";
    this.timeoutMs = options?.timeoutMs || 30000;
  }

  async sendMessage(messages: IChatMessage[], tools?: any[]): Promise<IAIResponse> {
    try {
      return await this.sendMessageOnce(sanitizeMessagesForQwen(messages, false), tools);
    } catch (err) {
      if (!isQwenInspectionError(err)) throw err;
      // Retry with aggressive sanitization if DashScope triggers content inspection filter
      return await this.sendMessageOnce(sanitizeMessagesForQwen(messages, true), tools);
    }
  }

  private async sendMessageOnce(messages: IChatMessage[], tools?: any[]): Promise<IAIResponse> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeoutMs);

    const body: Record<string, any> = {
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
        ...(m.tool_calls && { tool_calls: m.tool_calls }),
      })),
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.jsonSchema,
        },
      }));
    }

    try {
      const res = await fetch(`${this.host}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(id);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Qwen API error (${res.status}): ${errorText}`);
      }

      const data = await res.json() as any;

      if (data.error) {
        throw new Error(`Qwen API response error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      const choice = data.choices?.[0];
      if (!choice) {
        throw new Error("No choices returned from Qwen API");
      }

      const assistantMessage = choice.message;
      const text = assistantMessage.content || null;

      const toolCalls: IToolCall[] | undefined = assistantMessage.tool_calls
        ? assistantMessage.tool_calls.map((tc: any) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          }))
        : undefined;

      const usage = data.usage
        ? {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
          }
        : undefined;

      return {
        text,
        toolCalls,
        rawAssistantContent: assistantMessage,
        usage,
      };
    } catch (error: any) {
      clearTimeout(id);
      if (error.name === "AbortError") {
        throw new Error(`Qwen API request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    }
  }
}
