#!/usr/bin/env bash
# =============================================================================
# Script para crear y asignar los permisos necesarios para Juan en AWS IAM.
# Debe ser ejecutado por un Administrador de la cuenta con permisos de IAM.
# Uso: ./crear_permisos_juan.sh <nombre_usuario_iam_de_juan>
# =============================================================================

set -e

USER_NAME=$1

if [ -z "$USER_NAME" ]; then
    echo "Error: Debes proporcionar el nombre del usuario de IAM de Juan."
    echo "Uso: $0 <nombre_usuario_iam_de_juan>"
    exit 1
fi

echo "Iniciando asignacion de permisos para el usuario: $USER_NAME"

# 1. Crear el archivo JSON de politica para PassRole
cat << 'EOF' > pass-role-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "*"
    }
  ]
}
EOF

# 2. Crear la politica de PassRole en IAM
echo "Creando politica PassRolePolicy en IAM..."
POLICY_ARN=$(aws iam create-policy \
    --policy-name PassRolePolicy \
    --policy-document file://pass-role-policy.json \
    --description "Permite pasar roles a servicios de AWS como EC2" \
    --query 'Policy.Arn' \
    --output text 2>/dev/null || aws iam list-policies --query "Policies[?PolicyName=='PassRolePolicy'].Arn" --output text)

echo "Politica de PassRole disponible en: $POLICY_ARN"

# 3. Asignar las politicas necesarias para ejecutar toda la infraestructura
echo "Asociando politicas al usuario $USER_NAME..."

# Control total sobre EC2, llaves SSH, Security Groups, VPCs y volumenes
aws iam attach-user-policy --user-name "$USER_NAME" --policy-arn "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
echo "✅ Adjuntada: AmazonEC2FullAccess"

# Acceso para usar Systems Manager Session Manager
aws iam attach-user-policy --user-name "$USER_NAME" --policy-arn "arn:aws:iam::aws:policy/AmazonSSMFullAccess"
echo "✅ Adjuntada: AmazonSSMFullAccess"

# Requerido para crear, registrar y configurar el Application Load Balancer
aws iam attach-user-policy --user-name "$USER_NAME" --policy-arn "arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess"
echo "✅ Adjuntada: ElasticLoadBalancingFullAccess"

# Requerido para solicitar y validar certificados SSL
aws iam attach-user-policy --user-name "$USER_NAME" --policy-arn "arn:aws:iam::aws:policy/AWSCertificateManagerFullAccess"
echo "✅ Adjuntada: AWSCertificateManagerFullAccess"

# Asociar la politica personalizada de PassRole
aws iam attach-user-policy --user-name "$USER_NAME" --policy-arn "$POLICY_ARN"
echo "✅ Adjuntada: PassRolePolicy ($POLICY_ARN)"

# Limpiar archivos temporales
rm -f pass-role-policy.json

echo "====================================================================="
echo "¡Completado! Juan ($USER_NAME) ahora tiene todos los permisos"
echo "necesarios para ejecutar los comandos del plan de despliegue."
echo "====================================================================="
