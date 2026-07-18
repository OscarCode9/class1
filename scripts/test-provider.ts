import { QwenProvider } from "../src/agent/ai-provider";

async function main() {
  const message = process.argv.slice(2).join(" ");
  if (!message) {
    console.error("Error: Please provide a message. Example: task chat 'Hola como andas'");
    process.exit(1);
  }

  try {
    const provider = new QwenProvider();
    console.log(`Enviando mensaje a Qwen (${process.env.QWEN_MODEL || "qwen-plus"})...`);
    const response = await provider.sendMessage([{ role: "user", content: message }]);
    
    console.log("\n--- Respuesta del Proveedor ---");
    console.log(response.text);
    console.log("-------------------------------\n");
    
    if (response.usage) {
      console.log(`[Uso de Tokens - Entrada: ${response.usage.inputTokens}, Salida: ${response.usage.outputTokens}]`);
    }
  } catch (error: any) {
    console.error("Error al llamar a Qwen API:", error.message);
    process.exit(1);
  }
}

main();
