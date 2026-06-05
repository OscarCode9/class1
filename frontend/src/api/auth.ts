import type {
  ApiResponse,
  RegisterField,
  RegisterFieldErrors,
  RegisterPayload,
  RegisterSuccess,
} from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class RegisterRequestError extends Error {
  readonly code: string;
  readonly fieldErrors: RegisterFieldErrors;

  constructor(code: string, message: string, fieldErrors: RegisterFieldErrors = {}) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterSuccess> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new RegisterRequestError(
      "NETWORK_ERROR",
      "No se pudo conectar con el backend local. Levanta el API antes de intentar registrar usuarios.",
    );
  }

  const body = await response.json() as ApiResponse<RegisterSuccess>;

  if (!response.ok || !body.success || !body.data) {
    const message = getErrorMessage(response.status, body.error?.message);

    throw new RegisterRequestError(
      body.error?.code ?? "REQUEST_FAILED",
      message,
      extractFieldErrors(message, body.error?.details),
    );
  }

  return body.data;
}

function getErrorMessage(status: number, message?: string): string {
  if (message) {
    return message;
  }

  if (status === 404) {
    return "El endpoint POST /api/v1/auth/register no está disponible en este backend local.";
  }

  if (status === 409) {
    return "Este email ya está registrado.";
  }

  if (status === 400) {
    return "Los datos enviados no pasaron la validación del backend.";
  }

  return "No se pudo completar el registro.";
}

function extractFieldErrors(
  message: string,
  details: unknown,
): RegisterFieldErrors {
  if (Array.isArray(details)) {
    const fromDetails = details.reduce<RegisterFieldErrors>((errors, detail) => {
      if (!detail || typeof detail !== "object") {
        return errors;
      }

      const field = getFieldName(detail);
      const detailMessage =
        "message" in detail && typeof detail.message === "string"
          ? detail.message
          : null;

      if (field && detailMessage) {
        errors[field] = detailMessage;
      }

      return errors;
    }, {});

    if (Object.keys(fromDetails).length > 0) {
      return fromDetails;
    }
  }

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("name") || normalizedMessage.includes("nombre")) {
    return { name: message };
  }

  if (normalizedMessage.includes("email")) {
    return { email: message };
  }

  if (
    normalizedMessage.includes("password") ||
    normalizedMessage.includes("contrase")
  ) {
    return { password: message };
  }

  return {};
}

function getFieldName(detail: object): RegisterField | null {
  const candidate =
    ("field" in detail && typeof detail.field === "string" && detail.field) ||
    ("path" in detail && typeof detail.path === "string" && detail.path);

  if (candidate === "name" || candidate === "email" || candidate === "password") {
    return candidate;
  }

  return null;
}
