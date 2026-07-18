# 📋 Plan de Infraestructura y Despliegue de AWS (Planificador de Agente)

Este documento sirve como un plan de ejecución formal e interactivo diseñado para ser interpretado y ejecutado por un agente de automatización (DevOps Agent). Describe la topología de red, aprovisionamiento de recursos en AWS (vía AWS CLI) y la orquestación de contenedores (vía Docker Compose) basados en el diagrama provisto por el usuario, configurado para el dominio **oscar.oventlabs.net**.

---

## 📊 Diagrama de Arquitectura de Red y Flujo (Mermaid)

*Nota: Se ha simplificado la estructura para asegurar la máxima compatibilidad de renderizado en cualquier visor de Markdown.*

```mermaid
graph TD
    %% Nodos de Clientes
    User["Browser / Mobile Client"]

    %% Nodos del ALB
    ALB_HTTP["ALB Listener HTTP (Port 80)"]
    ALB_HTTPS["ALB Listener HTTPS (Port 443)"]

    %% Nodos de Contenedores en EC2 (t3.small)
    FRON["burritas-frontend (Port 80)"]
    API["burritas-api (Port 6060)"]
    DB["MySQL Database (Port 3306)"]
    MCP["MCP Bridge Server (Port 3000)"]
    Agent["sigmop-agent (Port 8001)"]

    %% Storage
    S3["S3 Bucket (logired)"]

    %% Conexiones e Internet
    User -->|HTTP| ALB_HTTP
    User -->|HTTPS| ALB_HTTPS
    ALB_HTTP -->|Redirect 301| ALB_HTTPS

    %% Reglas de Enrutamiento del ALB
    ALB_HTTPS -->|Host: oscar.oventlabs.net| FRON
    ALB_HTTPS -->|Host: api.oscar.oventlabs.net| API
    ALB_HTTPS -->|Host: mcp.oscar.oventlabs.net| MCP

    %% Red Docker Interna de la Instancia EC2
    FRON -->|Proxy API| API
    API -->|MySQL Connect| DB
    API -->|Internal Port 8001| Agent
    Agent -->|MCP Bridge Connection| MCP

    %% Almacenamiento
    API -.->|Uploads / Evidencias| S3
```

---

## 🛠️ Fase 1: Aprovisionamiento de AWS (AWS CLI)

El agente de automatización debe ejecutar la siguiente secuencia de comandos del **AWS CLI** para crear y configurar los recursos de red y cómputo.

### 1. Variables de Entorno del Script
El agente ejecutor debe exportar las siguientes variables antes de iniciar el despliegue para levantar la infraestructura:

```bash
export AWS_DEFAULT_REGION="us-east-2"
export DOMAIN_NAME="oscar.oventlabs.net" # Dominio verificado como ACTIVO
export KEY_NAME="oventlabs-key" # Llave ssh previamente subida a AWS
```

### 2. Creación de la Red (VPC, Subnets, Gateway)
```bash
# 1. Crear VPC (rango 10.0.0.0/16)
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text)
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames '{"Value":true}'
echo "VPC Creada: $VPC_ID"

# 2. Crear Subredes Públicas en diferentes Zonas de Disponibilidad (requerido por ALB)
SUBNET_A=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone us-east-2a --query 'Subnet.SubnetId' --output text)
SUBNET_B=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone us-east-2b --query 'Subnet.SubnetId' --output text)
SUBNET_C=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.3.0/24 --availability-zone us-east-2c --query 'Subnet.SubnetId' --output text)
echo "Subredes creadas: A=$SUBNET_A, B=$SUBNET_B, C=$SUBNET_C"

# 3. Crear e interconectar el Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID
echo "Internet Gateway conectado: $IGW_ID"

# 4. Crear Tabla de Ruteo Pública y agregar ruta por defecto hacia Internet
RT_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $RT_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

# 5. Asociar tabla de ruteo con subredes públicas
aws ec2 associate-route-table --subnet-id $SUBNET_A --route-table-id $RT_ID
aws ec2 associate-route-table --subnet-id $SUBNET_B --route-table-id $RT_ID
aws ec2 associate-route-table --subnet-id $SUBNET_C --route-table-id $RT_ID
echo "Tabla de ruteo pública configurada y asociada."
```

### 3. Grupos de Seguridad (Security Groups)
```bash
# 1. Crear SG para el Load Balancer (ALB)
ALB_SG=$(aws ec2 create-security-group --group-name oventlabs-alb-sg --description "SG del balanceador ALB" --vpc-id $VPC_ID --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 443 --cidr 0.0.0.0/0
echo "Security Group del ALB configurado: $ALB_SG"

# 2. Crear SG para el Servidor EC2
EC2_SG=$(aws ec2 create-security-group --group-name oventlabs-ec2-sg --description "SG del host EC2" --vpc-id $VPC_ID --query 'GroupId' --output text)
# Permitir SSH (Limitar idealmente a IP del admin)
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 22 --cidr 0.0.0.0/0
# Permitir puertos de contenedores sólo desde el ALB SG
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 80 --source-group $ALB_SG
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 6060 --source-group $ALB_SG
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 3000 --source-group $ALB_SG
echo "Security Group de la EC2 configurado: $EC2_SG"
```

### 4. Certificados SSL (ACM) y Validación en Hostinger
```bash
# Solicitar certificado para oscar.oventlabs.net y su wildcard *.oscar.oventlabs.net
CERT_ARN=$(aws acm request-certificate --domain-name $DOMAIN_NAME --subject-alternative-names "*.$DOMAIN_NAME" --validation-method DNS --query 'CertificateArn' --output text)
echo "Certificado solicitado (ACM ARN): $CERT_ARN"

# Obtener los CNAMEs de validacion provistos por AWS ACM:
aws acm describe-certificate --certificate-arn $CERT_ARN --query 'Certificate.DomainValidationOptions'
```

#### 🔑 Integración de DNS con Hostinger (Validación de Dominio)
Al consultar el portafolio mediante el Token de API en `hostinguer.txt`, se verificó la siguiente disponibilidad de dominios:
*   ❌ `oventlabs.com`: **EXPIRADO** (22/05/2026)
*   ✅ `oventlabs.net`: **ACTIVO** (28/05/2027)

Por lo tanto, la validación se realiza sobre el dominio activo **`oventlabs.net`**.

##### Método A: Manual (hPanel de Hostinger)
1.  Inicia sesión en [hPanel de Hostinger](https://hpanel.hostinger.com).
2.  Ve a **Domains** > selecciona **`oventlabs.net`** > **DNS / Nameservers**.
3.  Añade un registro nuevo de tipo **CNAME**:
    *   **Nombre:** El subdominio de validación generado por AWS ACM (ej. `_x2.oscar`).
    *   **Objetivo:** El valor DNS generado por AWS (ej. `_x3.acm-validations.aws.`).
    *   **TTL:** `14400`

##### Método B: Automatizado (API de Hostinger)
El agente de automatización puede usar el token de `hostinguer.txt` para crear la regla CNAME automáticamente:

```bash
# Inyectar el CNAME de validacion en la zona DNS de Hostinger
HOSTINGER_TOKEN="2XXLno0aJ1SoyZHH9x5nfvea56BfU0H85m9UrzFa5e1df855"

curl -s -X PUT "https://developers.hostinger.com/api/dns/v1/zones/oventlabs.net" \
     -H "Authorization: Bearer $HOSTINGER_TOKEN" \
     -H "Accept: application/json" \
     -H "Content-Type: application/json" \
     -d '{
           "records": [
             {
               "type": "CNAME",
               "name": "<INSERTAR_VALOR_NAME_DE_ACM_SIN_DOMINIO>",
               "value": "<INSERTAR_VALOR_VALUE_DE_ACM>",
               "ttl": 14400
             }
           ]
         }'
```

### 5. Instancia EC2 (t3.small - 2 vCPUs / 2GB RAM)
```bash
# AMI: Ubuntu Server 22.04 LTS (HVM) en us-east-2 (ami-05fb0b2c14bb3d829)
# Se utiliza el tamaño t3.small (2 vCPUs y 2 GB RAM) conforme a los requisitos simplificados de carga.
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-05fb0b2c14bb3d829 \
    --count 1 \
    --instance-type t3.small \
    --key-name $KEY_NAME \
    --security-group-ids $EC2_SG \
    --subnet-id $SUBNET_A \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=oventlabs-host}]' \
    --query 'Instances[0].InstanceId' --output text)
echo "Instancia EC2 levantada: $INSTANCE_ID"

# Esperar a que la instancia este en modo running para obtener la IP publica
aws ec2 wait instance-running --instance-ids $INSTANCE_ID
EC2_PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "IP publica del host EC2: $EC2_PUBLIC_IP"
```

### 6. Configuración del Application Load Balancer y Enrutamiento
```bash
# 1. Crear ALB en las subredes publicas
ALB_ARN=$(aws elbv2 create-load-balancer --name oventlabs-alb --subnets $SUBNET_A $SUBNET_B $SUBNET_C --security-groups $ALB_SG --query 'LoadBalancers[0].LoadBalancerArn' --output text)
echo "ALB Creado (ARN): $ALB_ARN"

# 2. Crear Target Groups (Frontend, API y MCP)
TG_FRONTEND=$(aws elbv2 create-target-group --name tg-frontend --protocol HTTP --port 80 --vpc-id $VPC_ID --health-check-path / --query 'TargetGroups[0].TargetGroupArn' --output text)
TG_API=$(aws elbv2 create-target-group --name tg-api --protocol HTTP --port 6060 --vpc-id $VPC_ID --health-check-path /health --query 'TargetGroups[0].TargetGroupArn' --output text)
TG_MCP=$(aws elbv2 create-target-group --name tg-mcp --protocol HTTP --port 3000 --vpc-id $VPC_ID --health-check-path /health --query 'TargetGroups[0].TargetGroupArn' --output text)

# 3. Registrar la instancia EC2 en cada Target Group
aws elbv2 register-targets --target-group-arn $TG_FRONTEND --targets Id=$INSTANCE_ID,Port=80
aws elbv2 register-targets --target-group-arn $TG_API --targets Id=$INSTANCE_ID,Port=6060
aws elbv2 register-targets --target-group-arn $TG_MCP --targets Id=$INSTANCE_ID,Port=3000
echo "Instancia registrada en los Target Groups."

# 4. Crear Listener HTTP (80) con redireccion automatica a HTTPS (443)
aws elbv2 create-listener --load-balancer-arn $ALB_ARN --protocol HTTP --port 80 --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]'

# 5. Crear Listener HTTPS (443) apuntando a Frontend (tg-frontend) por defecto
HTTPS_LISTENER_ARN=$(aws elbv2 create-listener --load-balancer-arn $ALB_ARN --protocol HTTPS --port 443 --certificates CertificateArn=$CERT_ARN --default-actions Type=forward,TargetGroupArn=$TG_FRONTEND --query 'Listeners[0].ListenerArn' --output text)
echo "Listener HTTPS Creado: $HTTPS_LISTENER_ARN"

# 6. Reglas de ruteo basadas en Host Header para API y MCP
aws elbv2 create-rule --listener-arn $HTTPS_LISTENER_ARN --priority 10 --conditions Field=host-header,Values="api.$DOMAIN_NAME" --actions Type=forward,TargetGroupArn=$TG_API
aws elbv2 create-rule --listener-arn $HTTPS_LISTENER_ARN --priority 20 --conditions Field=host-header,Values="mcp.$DOMAIN_NAME" --actions Type=forward,TargetGroupArn=$TG_MCP
echo "Reglas de ruteo del ALB configuradas correctamente."
```

---

## 🐳 Fase 2: Configuración del Host y Despliegue de Contenedores

Una vez creada la instancia EC2 por el CLI de AWS, el agente ejecutor debe:

1. **Instalar Docker y Docker Compose** en el host.
2. **Configurar el entorno**: Crear el archivo `.env.production` con las variables correctas.
3. **Subir los servicios**: Ejecutar `docker-compose -f docker-compose.prod.yml up -d --build`.

### Archivo `docker-compose.prod.yml`
Guarda esta configuración en el servidor para lanzar todos los servicios de la instancia robusta:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: burritas-mysql-prod
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: production_root_password
      MYSQL_DATABASE: burritas_db
      MYSQL_USER: burritas_user
      MYSQL_PASSWORD: production_db_password
    volumes:
      - mysql-prod-data:/var/lib/mysql
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: burritas-api-prod
    ports:
      - "6060:6060"
    env_file:
      - .env.production
    environment:
      - PORT=6060
      - NODE_ENV=production
      - AGENT_URL=http://sigmop-agent:8000
      - STANDALONE_AGENT_URL=http://sigmop-agent:8001
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy

  frontend:
    build:
      context: ./sigmop-front
      dockerfile: Dockerfile
      args:
        VITE_API_URL: https://api.oscar.oventlabs.net/api
        VITE_GOOGLE_MAPS_API_KEY: AIzaSyCA7a9ma31u-ovLZdLf6onJ2NNaWpqe0SE
    container_name: burritas-frontend-prod
    ports:
      - "80:80"
    restart: unless-stopped
    depends_on:
      - api

  agent:
    build:
      context: .
      dockerfile: agent/Dockerfile
    container_name: sigmop-agent-prod
    ports:
      - "8001:8001"
    env_file:
      - .env.production
    environment:
      - AGENT_PORT=8001
      - NODE_ENV=production
    restart: unless-stopped

  mcp-bridge:
    build:
      context: .
      dockerfile: agent/Dockerfile # Reutiliza el runtime de Node para lanzar el bridge
    container_name: logired-mcp-bridge
    ports:
      - "3000:3000"
    command: node dist/agent/lib/mcp-bridge.js
    env_file:
      - .env.production
    environment:
      - PORT=3000
      - NODE_ENV=production
    restart: unless-stopped
    depends_on:
      - agent

volumes:
  mysql-prod-data:
```

---

## 📋 Lista de Tareas para la Ejecución del Agente

A continuación se detalla la secuencia exacta de comandos que el agente de ejecución debe seguir:

### Paso 1: Configurar llaves y credenciales de AWS
- Crear llave SSH en AWS llamada `oventlabs-key` y descargar archivo `.pem`.
- Configurar credenciales en la máquina local desde donde se ejecutarán los scripts de CLI:
  ```bash
  export AWS_ACCESS_KEY_ID="AKIA3UERDJ2ZA2WEKDNW"
  export AWS_SECRET_ACCESS_KEY="TU_SECRET_KEY_AQUI"
  ```

### Paso 2: Ejecutar los Scripts de AWS CLI
- Guardar la secuencia de comandos descrita en la **Fase 1** en un archivo `.sh` (ej. `provision.sh`) y ejecutarlo:
  ```bash
  bash provision.sh
  ```
- Tomar nota de las variables impresas en consola (`VPC_ID`, `EC2_PUBLIC_IP`, `ALB_ARN`, etc.).

### Paso 3: Configurar registros DNS
- En Hostinger, crear registros CNAME apuntando al DNS del ALB:
  - `oscar.oventlabs.net` -> ALB DNS
  - `api.oscar.oventlabs.net` -> ALB DNS
  - `mcp.oscar.oventlabs.net` -> ALB DNS

### Paso 4: Preparar el Servidor EC2
- Acceder al servidor por SSH:
  ```bash
  ssh -i oventlabs-key.pem ubuntu@<IP_PUBLICA_EC2>
  ```
- Instalar dependencias esenciales, Docker y Git:
  ```bash
  sudo apt-get update
  sudo apt-get install -y docker.io git
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -aG docker ubuntu
  ```

### Paso 5: Clonar Código y Crear archivo `.env.production`
- Clonar el repositorio del proyecto en `/home/ubuntu/api-burritas`.
- Crear el archivo `/home/ubuntu/api-burritas/.env.production` basándose en el `.env` local e inyectando las URLs productivas (apuntando a `oscar.oventlabs.net`).

### Paso 6: Compilar y Lanzar Contenedores
- Levantar la infraestructura en producción:
  ```bash
  docker compose -f docker-compose.prod.yml up -d --build
  ```

### Paso 7: Validar Funcionamiento
- Realizar pruebas de sanidad usando Curl o peticiones HTTP:
  - Frontend: `curl -I https://oscar.oventlabs.net` (debe responder 200 OK)
  - API Health Check: `curl https://api.oscar.oventlabs.net/health` (debe responder OK)
  - MCP Server: `curl -X POST https://mcp.oscar.oventlabs.net` (debe indicar JSON-RPC error esperado sobre inicialización).

---

## 🛡️ Asignación de Permisos de IAM (Para Juan)

Para que Juan (u otro miembro del equipo con acceso limitado) pueda desplegar todos los recursos, debe poseer los permisos listados abajo.

### 📜 Políticas de AWS Requeridas
*   `AmazonEC2FullAccess`: Control sobre EC2, Security Groups, VPCs y llaves.
*   `AmazonSSMFullAccess`: Control de sesiones seguras por AWS Systems Manager.
*   `AmazonElasticLoadBalancingFullAccess`: Control de ALBs, listeners, target groups y enrutamiento.
*   `AWSCertificateManagerFullAccess`: Solicitud y validación de certificados SSL.
*   `PassRolePolicy`: Política personalizada que permite asociar roles de IAM a instancias EC2.

### ⚙️ Automatización de Permisos
Un administrador de la cuenta con accesos a IAM puede configurar automáticamente los permisos para Juan ejecutando el script provisto en la raíz del proyecto:

```bash
# Otorgar permisos a Juan (usar su nombre exacto de usuario de IAM)
./crear_permisos_juan.sh <nombre_usuario_iam_de_juan>
```

