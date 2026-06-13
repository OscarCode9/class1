import { useActionState, useEffect } from "react";
import { PersonAddAlt1Rounded } from "@mui/icons-material";
import { Button, Typography } from "@mui/material";
import { registerUser, RegisterRequestError } from "../../api/auth";
import { SubmitButton } from "../../atoms/SubmitButton";
import { FormTextField } from "../../molecules/FormTextField";
import type {
  RegisterFieldErrors,
  RegisterPayload,
  RegisterSuccess,
} from "../../types/auth";
import {
  FormCard,
  FormContent,
  Headline,
  PasswordRules,
  RuleChip,
  StatusAlert,
  SupportingText,
  TokenPanel,
  ActionText,
} from "./RegisterForm.styles";

interface RegisterFormProps {
  onRegisterSuccess: (result: RegisterSuccess) => void;
  onNavigateToLogin: () => void;
}

interface RegisterFormState {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: RegisterFieldErrors;
  values: RegisterPayload;
  result: RegisterSuccess | null;
}

const initialState: RegisterFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: {
    name: "",
    email: "",
    password: "",
  },
  result: null,
};

export function RegisterForm({ onRegisterSuccess, onNavigateToLogin }: RegisterFormProps) {
  const [state, submitAction] = useActionState(handleRegister, initialState);
  const formKey = state.result?.user.id ?? `${state.values.name}|${state.values.email}|${state.values.password}`;

  useEffect(() => {
    if (state.status === "success" && state.result) {
      onRegisterSuccess(state.result);
    }
  }, [state.status, state.result, onRegisterSuccess]);

  return (
    <FormCard>
      <FormContent key={formKey} action={submitAction}>
        <PersonAddAlt1Rounded color="secondary" fontSize="large" />
        <Headline variant="h4">Crea tu cuenta</Headline>
        <SupportingText variant="body1">
          El formulario consume el endpoint real{" "}
          <code>POST /api/v1/auth/register</code> y muestra los errores de validación
          del backend de forma clara.
        </SupportingText>

        <FormTextField
          name="name"
          label="Nombre"
          autoComplete="name"
          defaultValue={state.values.name}
          errorText={state.fieldErrors.name}
        />
        <FormTextField
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          defaultValue={state.values.email}
          errorText={state.fieldErrors.email}
        />
        <FormTextField
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          defaultValue={state.values.password}
          errorText={state.fieldErrors.password}
        />

        <PasswordRules>
          <RuleChip label="8+ caracteres" />
          <RuleChip label="1 mayúscula" />
          <RuleChip label="1 minúscula" />
          <RuleChip label="1 número" />
          <RuleChip label="1 símbolo" />
        </PasswordRules>

        {state.message ? (
          <StatusAlert severity={state.status === "success" ? "success" : "error"}>
            {state.message}
          </StatusAlert>
        ) : null}

        {state.result ? (
          <TokenPanel>
            <Typography variant="subtitle2">Registro completado</Typography>
            <Typography variant="body2">
              Usuario creado: {state.result.user.name} ({state.result.user.email})
            </Typography>
            <Typography variant="body2">
              El access token ya fue recibido por el frontend y queda listo para el
              siguiente paso del flujo autenticado.
            </Typography>
          </TokenPanel>
        ) : null}

        <SubmitButton idleLabel="Crear cuenta" pendingLabel="Creando cuenta..." />

        <ActionText variant="body2">
          ¿Ya tienes una cuenta?{" "}
          <Button
            variant="text"
            color="primary"
            onClick={onNavigateToLogin}
            style={{ fontWeight: 700, padding: 0, minWidth: "auto", textTransform: "none" }}
          >
            Iniciar Sesión
          </Button>
        </ActionText>
      </FormContent>
    </FormCard>
  );
}

async function handleRegister(
  _previousState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const values: RegisterPayload = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const fieldErrors = validateForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Revisa los campos marcados antes de continuar.",
      fieldErrors,
      values,
      result: null,
    };
  }

  try {
    const result = await registerUser(values);

    return {
      status: "success",
      message: `Cuenta creada para ${result.user.name}.`,
      fieldErrors: {},
      values: {
        name: "",
        email: "",
        password: "",
      },
      result,
    };
  } catch (error) {
    if (error instanceof RegisterRequestError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: error.fieldErrors,
        values,
        result: null,
      };
    }

    return {
      status: "error",
      message: "No se pudo completar el registro por un error inesperado.",
      fieldErrors: {},
      values,
      result: null,
    };
  }
}

function validateForm(values: RegisterPayload): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const password = values.password;

  if (name.length === 0) {
    errors.name = "El nombre es obligatorio.";
  } else if (name.length > 100) {
    errors.name = "El nombre no puede exceder 100 caracteres.";
  }

  if (email.length === 0) {
    errors.email = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Ingresa un email con formato válido.";
  }

  if (password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  } else if (!/[A-Z]/.test(password)) {
    errors.password = "La contraseña debe incluir al menos 1 mayúscula.";
  } else if (!/[a-z]/.test(password)) {
    errors.password = "La contraseña debe incluir al menos 1 minúscula.";
  } else if (!/[0-9]/.test(password)) {
    errors.password = "La contraseña debe incluir al menos 1 número.";
  } else if (!/[^A-Za-z0-9]/.test(password)) {
    errors.password = "La contraseña debe incluir al menos 1 símbolo.";
  }

  return errors;
}
