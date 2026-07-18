import { RegisterForm } from "../../organisms/RegisterForm";
import { AuthLayout } from "../../templates/AuthLayout";
import type { RegisterSuccess } from "../../types/auth";

interface RegisterPageProps {
  onRegisterSuccess: (result: RegisterSuccess) => void;
  onNavigateToLogin: () => void;
  onToggleTheme: () => void;
}

export function RegisterPage({ onRegisterSuccess, onNavigateToLogin, onToggleTheme }: RegisterPageProps) {
  return (
    <AuthLayout onToggleTheme={onToggleTheme}>
      <RegisterForm
        onRegisterSuccess={onRegisterSuccess}
        onNavigateToLogin={onNavigateToLogin}
      />
    </AuthLayout>
  );
}
