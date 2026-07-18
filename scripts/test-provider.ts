import { runAgent } from "../src/agent/agent-runner";
import { prisma } from "../src/config/prisma";

async function main() {
  const message = process.argv.slice(2).join(" ");
  if (!message) {
    console.error("Error: Please provide a message. Example: task chat 'Hola como andas'");
    process.exit(1);
  }

  try {
    // Fetch a real user from the database so tools can query real data
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error("Error: No users found in database. Please seed the database first (bun run db:seed).");
      process.exit(1);
    }

    console.log(`Iniciando Agent Runner para el usuario ${user.name} (${user.email})...`);
    console.log(`Enviando mensaje: "${message}"...\n`);

    const result = await runAgent(message, user.id);
    
    console.log("--- Respuesta del Agente (Compa) ---");
    console.log(result.text);
    console.log("------------------------------------\n");
    
    if (result.pendingConfirmation) {
      console.log(`[Confirmación Pendiente] taskId: ${result.pendingConfirmation.taskId}, Token: ${result.pendingConfirmation.confirmToken}\n`);
    }

    console.log(`[Eventos del Trace - traceId: ${result.traceId}]`);
    result.events.forEach((e) => {
      console.log(` - [${e.timestamp}] ${e.type}${e.data ? `: ${JSON.stringify(e.data)}` : ""}`);
    });
    console.log("");

  } catch (error: any) {
    console.error("Error ejecutando el loop del agente:", error.message);
    process.exit(1);
  }
}

main();
