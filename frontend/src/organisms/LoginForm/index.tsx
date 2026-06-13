import { useActionState, useEffect } from "react";
import { LoginRounded } from "@mui/icons-material";
import { Button } from "@mui/material";
import { loginUser, LoginRequestError } from "../../api/auth";
import { SubmitButton } from "../../atoms/SubmitButton";
import { FormTextField } from "../../molecules/FormTextField";
import type {
  LoginFieldErrors,
  LoginPayload,
  LoginSuccess,
} from "../../types/auth";
import {
  FormCard,
  FormContent,
  Headline,
  StatusAlert,
  SupportingText,
  ActionText,
} from "./LoginForm.styles";

interface LoginFormProps {
  onLoginSuccess: (result: LoginSuccess) => void;
  onNavigateToRegister: () => void;
}

interface LoginFormState {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: LoginFieldErrors;
  values: LoginPayload;
  result: LoginSuccess | null;
}

const initialState: LoginFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: {
    email: "",
    password: "",
  },
  result: null,
};

export function LoginForm({ onLoginSuccess, onNavigateToRegister }: LoginFormProps) {
  const [state, submitAction] = useActionState(handleLoginSubmit, initialState);
  const formKey = state.result?.user.id ?? `${state.values.email}|${state.values.password}`;

  useEffect(() => {
    if (state.status === "success" && state.result) {
      onLoginSuccess(state.result);
    }
  }, [state.status, state.result, onLoginSuccess]);

  return (
    <FormCard>
      <FormContent key={formKey} action={submitAction}>
        <LoginRounded color="secondary" fontSize="large" />
        <Headline variant="h4">Inicia Sesión</Headline>
        <SupportingText variant="body1">
          Ingresa tus credenciales para acceder al sistema de gestión de tareas.
        </SupportingText>

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
          autoComplete="current-password"
          defaultValue={state.values.password}
          errorText={state.fieldErrors.password}
        />

        {state.message ? (
          <StatusAlert severity={state.status === "success" ? "success" : "error"}>
            {state.message}
          </StatusAlert>
        ) : null}

        <SubmitButton idleLabel="Iniciar Sesión" pendingLabel="Iniciando sesión..." />

        <ActionText variant="body2">
          ¿No tienes una cuenta?{" "}
          <Button
            variant="text"
            color="primary"
            onClick={onNavigateToRegister}
            style={{ fontWeight: 700, padding: 0, minWidth: "auto", textTransform: "none" }}
          >
            Registrarse
          </Button>
        </ActionText>
      </FormContent>
    </FormCard>
  );
}

async function handleLoginSubmit(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const values: LoginPayload = {
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
    const result = await loginUser(values);

    return {
      status: "success",
      message: "Sesión iniciada correctamente.",
      fieldErrors: {},
      values: {
        email: "",
        password: "",
      },
      result,
    };
  } catch (error) {
    if (error instanceof LoginRequestError) {
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
      message: "No se pudo iniciar sesión por un error inesperado.",
      fieldErrors: {},
      values,
      result: null,
    };
  }
}

function validateForm(values: LoginPayload): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const email = values.email.trim();
  const password = values.password;

  if (email.length === 0) {
    errors.email = "El email es obligatorio.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Ingresa un email con formato válido.";
  }

  if (password.length === 0) {
    errors.password = "La contraseña es obligatoria.";
  }

  return errors;
}
