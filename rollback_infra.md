# ↩️ Guía de Rollback y Limpieza Total de Infraestructura AWS - oventlabs-alb

Este documento detalla todas las acciones y comandos necesarios para deshacer los cambios, eliminar por completo los recursos aprovisionados (incluyendo el balanceador de carga y los Target Groups) y dejar la cuenta de AWS totalmente limpia.

---

## 📋 Resumen de los Recursos a Eliminar

Al completar esta guía, se habrán eliminado los siguientes recursos de AWS:
1. **Balanceador de Carga (ALB):** `oventlabs-alb`
2. **Target Groups (6):** `tg-frontend`, `tg-api`, `tg-mcp`, `tg-frontend-juan`, `tg-api-juan`, `tg-mcp-juan`.
3. **Instancias EC2:**
   * `i-08a062da4cf5d14b4` (nombre tag: `juan-app-host`, key: `truck`).
   * `i-08af7653fa81ec295` (nombre tag: `juan-app-host`, key: `oventlabs-key`).
4. **Security Group Asociado:** `sg-00085d9c7d2f6ad73` (`juan-ec2-sg`).
5. **Certificados SSL en ACM:**
   * Solicitado para `oscar.oventlabs.net` y `*.oscar.oventlabs.net`.
   * Solicitado para `juan.oventlabs.net` y `*.juan.oventlabs.net` (ARN: `arn:aws:acm:us-east-2:799168220850:certificate/5614b442-5228-4102-b720-b82b8161dba1`).
6. **Políticas IAM:** Permisos otorgados al usuario `juan-paredes`.

---

## 🛠️ Comandos de Deshacer y Destrucción de Recursos (AWS CLI)

Ejecuta los siguientes comandos en orden para evitar errores de dependencias de recursos (por ejemplo, no puedes borrar un Target Group mientras esté siendo usado por un balanceador).

### 1. Terminar las Instancias EC2 (`i-08a062da4cf5d14b4` e `i-08af7653fa81ec295`)
Detiene y elimina de forma definitiva los servidores EC2:

```bash
aws ec2 terminate-instances --instance-ids i-08a062da4cf5d14b4 i-08af7653fa81ec295 --region us-east-2
```

### 2. Eliminar el Balanceador de Carga (`oventlabs-alb`)
Al borrar el balanceador, automáticamente se eliminarán sus Listeners y sus Reglas de enrutamiento basadas en Host Header:

```bash
aws elbv2 delete-load-balancer \
    --load-balancer-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:loadbalancer/app/oventlabs-alb/c38a802994595f47"
```

*Nota: Espera unos 30 segundos a que la eliminación del balanceador finalice en segundo plano antes de continuar.*

### 3. Eliminar todos los Target Groups (6)
Una vez desasociados del balanceador, puedes borrarlos con seguridad:

```bash
# Eliminar Target Groups de Producción
aws elbv2 delete-target-group --target-group-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-frontend/af60590f9613156b"
aws elbv2 delete-target-group --target-group-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-api/aabf048deec78ccf"
aws elbv2 delete-target-group --target-group-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-mcp/21adf33277ea4129"

# Eliminar Target Groups de Juan
aws elbv2 delete-target-group --target-group-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-frontend-juan/8592262688fad4ee"
aws elbv2 delete-target-group --target-group-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-api-juan/924bd767c806b782"
aws elbv2 delete-target-group --target-group-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:targetgroup/tg-mcp-juan/95f92b9578499005"
```

### 4. Eliminar el Security Group de la Instancia (`sg-00085d9c7d2f6ad73`)
Una vez ambas instancias EC2 estén en estado `terminated` (terminadas), procede a borrar su grupo de seguridad:

```bash
# Esperar confirmación de terminación
aws ec2 wait instance-terminated --instance-ids i-08a062da4cf5d14b4 i-08af7653fa81ec295 --region us-east-2

# Eliminar Security Group
aws ec2 delete-security-group --group-id sg-00085d9c7d2f6ad73 --region us-east-2
```

### 5. Eliminar los Certificados SSL en ACM
Para el certificado de `juan.oventlabs.net` que está asociado al listener del ALB, primero se debe desasociar y luego eliminar. Para los demás, se pueden eliminar directamente:

```bash
# --- CERTIFICADO DE juan.oventlabs.net ---
# 1. Quitar el certificado del listener HTTPS del ALB
aws elbv2 remove-listener-certificates \
    --listener-arn "arn:aws:elasticloadbalancing:us-east-2:799168220850:listener/app/oventlabs-alb/c38a802994595f47/31cca2d2277ebabb" \
    --certificates CertificateArn="arn:aws:acm:us-east-2:799168220850:certificate/5614b442-5228-4102-b720-b82b8161dba1" \
    --region us-east-2

# 2. Eliminar el certificado de ACM
aws acm delete-certificate \
    --certificate-arn "arn:aws:acm:us-east-2:799168220850:certificate/5614b442-5228-4102-b720-b82b8161dba1" \
    --region us-east-2


# --- CERTIFICADO DE oscar.oventlabs.net ---
# Reemplaza <CERTIFICATE_ARN> por el correspondiente a oscar.oventlabs.net y elimínalo:
aws acm delete-certificate --certificate-arn <CERTIFICATE_ARN> --region us-east-2
```

### 6. Remover los permisos IAM de Juan
Detiene el acceso de administración sobre el ALB otorgado al usuario `juan-paredes`:

```bash
aws iam detach-user-policy \
    --user-name juan-paredes \
    --policy-arn arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess
```
