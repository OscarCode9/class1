# 📋 Plan de Infraestructura y Despliegue de AWS (Planificador de Agente)

Este documento sirve como un plan de ejecución formal e interactivo diseñado para ser interpretado y ejecutado por un agente de automatización (DevOps Agent). Describe la topología de red, aprovisionamiento de recursos en AWS (vía Terraform) y la orquestación de contenedores (vía Docker Compose) basados en el diagrama provisto por el usuario, configurado para el dominio **oscar.oventlabs.com**.

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

    %% Nodos de Contenedores en EC2 (t3.xlarge)
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
    ALB_HTTPS -->|Host: oscar.oventlabs.com| FRON
    ALB_HTTPS -->|Host: api.oscar.oventlabs.com| API
    ALB_HTTPS -->|Host: mcp.oscar.oventlabs.com| MCP

    %% Red Docker Interna de la Instancia EC2
    FRON -->|Proxy API| API
    API -->|MySQL Connect| DB
    API -->|Internal Port 8001| Agent
    Agent -->|MCP Bridge Connection| MCP

    %% Almacenamiento
    API -.->|Uploads / Evidencias| S3
```

---

## 🛠️ Fase 1: Aprovisionamiento de AWS (Código de Terraform)

El agente debe aplicar la siguiente configuración de **Terraform** en el directorio `./infra` para levantar los recursos correspondientes.

### 1. `providers.tf`
```hcl
terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

### 2. `variables.tf`
```hcl
variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "domain_name" {
  type    = string
  default = "oscar.oventlabs.com"
}

variable "instance_type" {
  type    = string
  default = "t3.xlarge" # 4 vCPUs, 16 GB RAM
}
```

### 3. `vpc.tf`
```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "oventlabs-vpc" }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "oventlabs-igw" }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-2a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-2b"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-2c"
  map_public_ip_on_launch = true
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
}

resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}
```

### 4. `security_groups.tf`
```hcl
resource "aws_security_group" "alb" {
  name        = "oventlabs-alb-sg"
  description = "Allow inbound HTTP/HTTPS traffic to ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ec2" {
  name        = "oventlabs-ec2-sg"
  description = "Allow SSH and traffic from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Limitar a IPs de administracion en produccion
  }

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port       = 6060
    to_port         = 6060
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### 5. `alb.tf`
```hcl
resource "aws_lb" "this" {
  name               = "oventlabs-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id, aws_subnet.public_c.id]
}

# Target Groups
resource "aws_lb_target_group" "frontend" {
  name     = "tg-frontend"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path = "/"
    port = "80"
  }
}

resource "aws_lb_target_group" "api" {
  name     = "tg-api"
  port     = 6060
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path = "/health"
    port = "6060"
  }
}

resource "aws_lb_target_group" "mcp" {
  name     = "tg-mcp"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path = "/health"
    port = "3000"
  }
}

# HTTP Listener Redirect to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ACM Certificate Setup (Solicita el certificado para oscar.oventlabs.com y su wildcard)
resource "aws_acm_certificate" "cert" {
  domain_name       = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method = "DNS"
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# ALB Host routing rules
resource "aws_lb_listener_rule" "api_routing" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    host_header {
      values = ["api.${var.domain_name}"]
    }
  }
}

resource "aws_lb_listener_rule" "mcp_routing" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mcp.arn
  }

  condition {
    host_header {
      values = ["mcp.${var.domain_name}"]
    }
  }
}
```

### 6. `ec2.tf`
```hcl
resource "aws_instance" "app_server" {
  ami           = "ami-05fb0b2c14bb3d829" # Ubuntu Server 22.04 LTS en us-east-2
  instance_type = var.instance_type
  subnet_id     = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name      = "oventlabs-key" # Registrar llave ssh previamente

  root_block_device {
    volume_size           = 50
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = "oventlabs-host"
  }
}

# ALB Target Group Associations
resource "aws_lb_target_group_attachment" "frontend" {
  target_group_arn = aws_lb_target_group.frontend.arn
  target_id        = aws_instance.app_server.id
  port             = 80
}

resource "aws_lb_target_group_attachment" "api" {
  target_group_arn = aws_lb_target_group.api.arn
  target_id        = aws_instance.app_server.id
  port             = 6060
}

resource "aws_lb_target_group_attachment" "mcp" {
  target_group_arn = aws_lb_target_group.mcp.arn
  target_id        = aws_instance.app_server.id
  port             = 3000
}
```

---

## 🐳 Fase 2: Configuración del Host y Despliegue de Contenedores

Una vez creada la instancia EC2 por Terraform, el agente ejecutor debe:

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
        VITE_API_URL: https://api.oscar.oventlabs.com/api
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
- Configurar credenciales en la máquina local desde donde se ejecutará Terraform:
  ```bash
  export AWS_ACCESS_KEY_ID="AKIA3UERDJ2ZA2WEKDNW"
  export AWS_SECRET_ACCESS_KEY="TU_SECRET_KEY_AQUI"
  ```

### Paso 2: Ejecutar Terraform
- Inicializar, validar y aplicar el plan de Terraform:
  ```bash
  cd ./infra
  terraform init
  terraform plan -out=tfplan
  terraform apply tfplan
  ```
- Tomar nota de las IPs públicas y DNS generados.

### Paso 3: Configurar registros DNS
- En Route 53 o tu proveedor DNS, crear registros CNAME apuntando al DNS del ALB:
  - `oscar.oventlabs.com` -> ALB DNS
  - `api.oscar.oventlabs.com` -> ALB DNS
  - `mcp.oscar.oventlabs.com` -> ALB DNS

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
- Crear el archivo `/home/ubuntu/api-burritas/.env.production` basándose en el `.env` local e inyectando las URLs productivas (apuntando a `oscar.oventlabs.com`).

### Paso 6: Compilar y Lanzar Contenedores
- Levantar la infraestructura en producción:
  ```bash
  docker compose -f docker-compose.prod.yml up -d --build
  ```

### Paso 7: Validar Funcionamiento
- Realizar pruebas de sanidad usando Curl o peticiones HTTP:
  - Frontend: `curl -I https://oscar.oventlabs.com` (debe responder 200 OK)
  - API Health Check: `curl https://api.oscar.oventlabs.com/health` (debe responder OK)
  - MCP Server: `curl -X POST https://mcp.oscar.oventlabs.com` (debe indicar JSON-RPC error esperado sobre inicialización).
