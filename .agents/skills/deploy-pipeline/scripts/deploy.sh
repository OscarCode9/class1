#!/usr/bin/env bash
# =============================================================================
# Pipeline de Despliegue para el proyecto class1
# Ejecuta el flujo completo para subir cambios al servidor EC2 de producción.
# =============================================================================

set -e

# Configuración por defecto
PEM_KEY="${PEM_KEY:-/Users/oscarcode/api-burritas/truck.pem}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_HOST="${REMOTE_HOST:-3.144.31.234}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/class1}"
LOCAL_DIR="/Users/oscarcode/class1"

echo "=== 🚀 Iniciando Pipeline de Despliegue para class1 ==="
echo "Host remoto: $REMOTE_USER@$REMOTE_HOST"
echo "Directorio remoto: $REMOTE_DIR"
echo "Llave PEM: $PEM_KEY"
echo ""

# 1. Crear backup de la base de datos en el servidor remoto
echo "=== 💾 Paso 1: Creando respaldo (backup) de la base de datos ==="
BACKUP_FILE="backup_\$(date +%Y%m%d_%H%M%S).sql"
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" \
  "mkdir -p $REMOTE_DIR/backups && sudo docker exec -t class1-db pg_dump -U class1_admin -d class1_prod_db > $REMOTE_DIR/backups/$BACKUP_FILE"
echo "✅ Respaldo creado con éxito en el servidor: backups/$BACKUP_FILE"
echo ""

# 2. Sincronizar archivos usando rsync
echo "=== 🔄 Paso 2: Sincronizando archivos con el servidor remoto (rsync) ==="
rsync -avz \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude '.vscode' \
  --exclude '.antigravitycli' \
  --exclude '.env' \
  -e "ssh -o StrictHostKeyChecking=no -i $PEM_KEY" \
  "$LOCAL_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
echo "✅ Sincronización de archivos completada."
echo ""

# 3. Compilar y levantar contenedores
echo "=== 🐳 Paso 3: Recompilando y levantando contenedores Docker ==="
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" \
  "cd $REMOTE_DIR && sudo docker compose up -d --build"
echo "✅ Contenedores levantados e iniciados."
echo ""

# 4. Sincronizar esquema de base de datos
echo "=== 🗄️ Paso 4: Sincronizando el esquema de base de datos con Prisma ==="
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" "$REMOTE_USER@$REMOTE_HOST" \
  "cd $REMOTE_DIR && sudo docker compose exec -T api bunx prisma db push"
echo "✅ Esquema de base de datos sincronizado con éxito."
echo ""

# 5. Ejecutar verificaciones de salud (Health Checks) de los servicios
echo "=== 🩺 Paso 5: Ejecutando verificación de salud (Health Checks) ==="
echo "Esperando 10 segundos para que se estabilicen los servicios..."
sleep 10
ERRORS=0

echo -n "Comprobando Frontend (https://oscar.oventlabs.net/)... "
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://oscar.oventlabs.net/ || echo "000")
if [ "$FRONTEND_CODE" == "200" ]; then
  echo "🟢 SALUDABLE (HTTP 200)"
else
  echo "🔴 ERROR (HTTP $FRONTEND_CODE)"
  ERRORS=$((ERRORS + 1))
fi

echo -n "Comprobando API (https://api.oscar.oventlabs.net/api/v1/health)... "
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://api.oscar.oventlabs.net/api/v1/health || echo "000")
if [ "$API_CODE" == "200" ]; then
  echo "🟢 SALUDABLE (HTTP 200)"
else
  echo "🔴 ERROR (HTTP $API_CODE)"
  ERRORS=$((ERRORS + 1))
fi

echo -n "Comprobando MCP (https://mcp.oscar.oventlabs.net/health)... "
MCP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://mcp.oscar.oventlabs.net/health || echo "000")
if [ "$MCP_CODE" == "200" ]; then
  echo "🟢 SALUDABLE (HTTP 200)"
else
  echo "🔴 ERROR (HTTP $MCP_CODE)"
  ERRORS=$((ERRORS + 1))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "🎉 ¡Despliegue completado con éxito y todos los servicios saludables!"
  exit 0
else
  echo "⚠️ ¡El despliegue completó, pero $ERRORS servicio(s) reportaron fallos en el Health Check!"
  exit 1
fi
