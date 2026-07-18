import { LoginForm } from "../../organisms/LoginForm";
import { AuthLayout } from "../../templates/AuthLayout";
import type { LoginSuccess } from "../../types/auth";

interface LoginPageProps {
  onLoginSuccess: (result: LoginSuccess) => void;
  onNavigateToRegister: () => void;
  onToggleTheme: () => void;
}

export function LoginPage({ onLoginSuccess, onNavigateToRegister, onToggleTheme }: LoginPageProps) {
  return (
    <AuthLayout
      title="Acceso al Task Manager"
      subtitle={
        <>
          Inicia sesión para gestionar tus tareas y organizar tus prioridades con
          el endpoint <code>POST /api/v1/auth/login</code>.
        </>
      }
      chipLabel="RF-11 Inicio de sesión"
      onToggleTheme={onToggleTheme}
    >
      <LoginForm
        onLoginSuccess={onLoginSuccess}
        onNavigateToRegister={onNavigateToRegister}
      />
    </AuthLayout>
  );
}
