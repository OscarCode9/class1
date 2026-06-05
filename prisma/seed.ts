import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Clean database
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create users
  const passwordHash = await Bun.password.hash("Password123!");

  const alice = await prisma.user.create({
    data: {
      name: "Alice Vance",
      email: "alice@example.com",
      passwordHash,
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob Builder",
      email: "bob@example.com",
      passwordHash,
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: "Charlie Brown",
      email: "charlie@example.com",
      passwordHash,
    },
  });

  console.log("Created users:", [alice.name, bob.name, charlie.name]);

  // 3. Create tasks
  const tasksData = [
    {
      title: "Configurar Servidor MCP",
      description: "Implementar transporte stdio y registrar herramientas básicas.",
      status: "completed" as const,
      priority: "critical" as const,
      tags: ["mcp", "backend"],
      assigneeId: alice.id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days future
    },
    {
      title: "Diseñar UI del Dashboard",
      description: "Crear mockups y estructura base del frontend utilizando componentes web.",
      status: "in_progress" as const,
      priority: "high" as const,
      tags: ["frontend", "design"],
      assigneeId: bob.id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days future
    },
    {
      title: "Pruebas Unitarias e Integración",
      description: "Escribir pruebas funcionales para los endpoints de la API REST y el servidor MCP.",
      status: "in_progress" as const,
      priority: "high" as const,
      tags: ["testing", "mcp"],
      assigneeId: alice.id,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Corregir vulnerabilidades de seguridad",
      description: "Revisar políticas de contraseñas y sanitización de inputs para evitar inyecciones.",
      status: "pending" as const,
      priority: "critical" as const,
      tags: ["security", "bug"],
      assigneeId: charlie.id,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Optimizar queries de base de datos",
      description: "Agregar índices a campos clave de búsqueda como email y status.",
      status: "pending" as const,
      priority: "medium" as const,
      tags: ["database", "backend"],
      assigneeId: bob.id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Redactar documentación técnica",
      description: "Documentar todos los endpoints, herramientas MCP y modelos de datos en el archivo README.md.",
      status: "pending" as const,
      priority: "low" as const,
      tags: ["documentation"],
      assigneeId: null,
      dueDate: null,
    },
  ];

  for (const t of tasksData) {
    const createdTask = await prisma.task.create({
      data: t,
    });
    console.log(`Created task: "${createdTask.title}"`);
  }

  console.log("Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
