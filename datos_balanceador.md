# 🌐 Datos del Nuevo Balanceador de Carga (ALB) y Target Groups

Este documento contiene los datos de configuración del Application Load Balancer (ALB) y los Target Groups aprovisionados en AWS. Estos datos deben ser utilizados por Juan para conectar la nueva instancia EC2.

---

## ⚙️ Especificaciones del Balanceador de Carga

| Propiedad | Valor / Detalle |
| :--- | :--- |
| **Nombre del ALB** | `oventlabs-alb` |
| **DNS Público** | `oventlabs-alb-1777817210.us-east-2.elb.amazonaws.com` |
| **ARN del ALB** | `arn:aws:elasticloadbalancing:us-east-2:799168220850:loadbalancer/app/oventlabs-alb/c38a802994595f47` |
| **VPC ID** | `vpc-08b3021ce8b48a817` |
| **Security Group del ALB** | `sg-03fe3853596e6b289` |
| **Región** | `us-east-2` |
| **Estado** | `active` (Disponible para tráfico) |

---

## 🎯 Target Groups Creados

He creado los tres Target Groups necesarios en la VPC para conectar los contenedores:

1.  **Frontend Target Group (`tg-frontend`)**:
    *   **Puerto**: `80` (HTTP)
    *   **ARN**: `arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-frontend/af60590f9613156b`
2.  **API Target Group (`tg-api`)**:
    *   **Puerto**: `6060` (HTTP)
    *   **ARN**: `arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-api/aabf048deec78ccf`
3.  **MCP Target Group (`tg-mcp`)**:
    *   **Puerto**: `3000` (HTTP)
    *   **ARN**: `arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-mcp/21adf33277ea4129`

---

## 🗺️ Distribución de Subredes y Zonas de Disponibilidad

El balanceador ha sido desplegado de forma redundante en las siguientes subredes públicas:

*   **us-east-2a**: `subnet-02e58604755555d5f`
*   **us-east-2b**: `subnet-0be1ccbd5a1cfb63c`
*   **us-east-2c**: `subnet-067619961aed3ee72`

---

## 🛡️ Configuración e Interconexión de la Instancia de Juan

Para conectar la instancia EC2 de Juan al balanceador, Juan debe ejecutar las siguientes tareas paso a paso en el AWS CLI usando sus credenciales:

### 1. Definición de Variables de Trabajo para Juan
```bash
export VPC_ID="vpc-08b3021ce8b48a817"
export SUBNET_ID="subnet-02e58604755555d5f" # Subred us-east-2a
export ALB_SG="sg-03fe3853596e6b289" # Security Group del ALB
export KEY_NAME="oventlabs-key" # Tu llave SSH
```

### 2. Crear Security Group para la Instancia de Juan
Se crea un grupo de seguridad que restringe el tráfico a los puertos de la aplicación, aceptando únicamente peticiones provenientes del balanceador de carga (`sg-03fe3853596e6b289`):

```bash
# 1. Crear el Security Group
JUAN_SG=$(aws ec2 create-security-group \
    --group-name juan-ec2-sg \
    --description "SG para la instancia de Juan enlazada al ALB" \
    --vpc-id $VPC_ID \
    --query 'GroupId' --output text)

# 2. Permitir SSH (Puerto 22) desde cualquier IP (o limitar a tu IP de admin)
aws ec2 authorize-security-group-ingress --group-id $JUAN_SG --protocol tcp --port 22 --cidr 0.0.0.0/0

# 3. Permitir trafico HTTP (Puerto 80) solo desde el Security Group del ALB
aws ec2 authorize-security-group-ingress --group-id $JUAN_SG --protocol tcp --port 80 --source-group $ALB_SG

# 4. Permitir trafico API (Puerto 6060) solo desde el Security Group del ALB
aws ec2 authorize-security-group-ingress --group-id $JUAN_SG --protocol tcp --port 6060 --source-group $ALB_SG

# 5. Permitir trafico MCP (Puerto 3000) solo desde el Security Group del ALB
aws ec2 authorize-security-group-ingress --group-id $JUAN_SG --protocol tcp --port 3000 --source-group $ALB_SG

echo "Security Group de Juan listo: $JUAN_SG"
```

### 3. Crear la Instancia EC2 (t3.small)
Juan lanza su servidor en la misma red y zona:

```bash
JUAN_INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-05fb0b2c14bb3d829 \
    --count 1 \
    --instance-type t3.small \
    --key-name $KEY_NAME \
    --security-group-ids $JUAN_SG \
    --subnet-id $SUBNET_ID \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=juan-app-host}]' \
    --query 'Instances[0].InstanceId' --output text)

echo "Instancia de Juan creada (ID): $JUAN_INSTANCE_ID"

# Esperar a que pase a estado Running
aws ec2 wait instance-running --instance-ids $JUAN_INSTANCE_ID
```

### 4. Conectar / Registrar la Instancia en los Target Groups del ALB
Para que el balanceador redirija el tráfico a la instancia de Juan, se debe registrar su ID en los tres Target Groups creados previamente:

```bash
# Registrar en tg-frontend (Puerto 80)
aws elbv2 register-targets \
    --target-group-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-frontend/af60590f9613156b" \
    --targets Id=$JUAN_INSTANCE_ID,Port=80
echo "Instancia registrada en tg-frontend (Puerto 80)"

# Registrar en tg-api (Puerto 6060)
aws elbv2 register-targets \
    --target-group-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-api/aabf048deec78ccf" \
    --targets Id=$JUAN_INSTANCE_ID,Port=6060
echo "Instancia registrada en tg-api (Puerto 6060)"

# Registrar en tg-mcp (Puerto 3000)
aws elbv2 register-targets \
    --target-group-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-mcp/21adf33277ea4129" \
    --targets Id=$JUAN_INSTANCE_ID,Port=3000
echo "Instancia registrada en tg-mcp (Puerto 3000)"
```

---

## 🔗 Pasos Restantes para Juan (SSL e HTTPS)

Debido a que el usuario `juan-paredes` no tiene actualmente los permisos de ACM (Certificate Manager) para solicitar certificados, **el Administrador primero debe ejecutar el script de asignación de permisos**:

```bash
# Ejecutar por un Administrador de la cuenta:
./crear_permisos_juan.sh juan-paredes
```

Una vez que Juan posea estos permisos y el ALB esté en estado `active`, Juan podrá completar la configuración ejecutando los siguientes comandos:

### 1. Solicitar el Certificado SSL
```bash
CERT_ARN=$(aws acm request-certificate \
    --domain-name oscar.oventlabs.net \
    --subject-alternative-names "*.oscar.oventlabs.net" \
    --validation-method DNS \
    --query 'CertificateArn' \
    --output text)
```
*(Nota: Recuerda añadir el CNAME generado por ACM en tu DNS de Hostinger para validar el certificado).*

### 2. Crear los Listeners (HTTP y HTTPS) en el ALB
```bash
# Listener HTTP (80) - Redirección automática a HTTPS (443)
aws elbv2 create-listener \
    --load-balancer-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:loadbalancer/app/oventlabs-alb/c38a802994595f47" \
    --protocol HTTP --port 80 \
    --default-actions '[{"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","Port":"443","StatusCode":"HTTP_301"}}]'

# Listener HTTPS (443) - Apuntando por defecto a tg-frontend
HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:loadbalancer/app/oventlabs-alb/c38a802994595f47" \
    --protocol HTTPS --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn="arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-frontend/af60590f9613156b" \
    --query 'Listeners[0].ListenerArn' --output text)
```

### 3. Crear las Reglas de Enrutamiento Basadas en Host Header
```bash
# Regla para redirigir api.oscar.oventlabs.net a tg-api
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 10 \
    --conditions Field=host-header,Values="api.oscar.oventlabs.net" \
    --actions Type=forward,TargetGroupArn="arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-api/aabf048deec78ccf"

# Regla para redirigir mcp.oscar.oventlabs.net a tg-mcp
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 20 \
    --conditions Field=host-header,Values="mcp.oscar.oventlabs.net" \
    --actions Type=forward,TargetGroupArn="arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-mcp/21adf33277ea4129"
```
