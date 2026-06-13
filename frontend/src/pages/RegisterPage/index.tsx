import { RegisterForm } from "../../organisms/RegisterForm";
import { AuthLayout } from "../../templates/AuthLayout";
import type { RegisterSuccess } from "../../types/auth";

interface RegisterPageProps {
  onRegisterSuccess: (result: RegisterSuccess) => void;
  onNavigateToLogin: () => void;
}

export function RegisterPage({ onRegisterSuccess, onNavigateToLogin }: RegisterPageProps) {
  return (
    <AuthLayout>
      <RegisterForm
        onRegisterSuccess={onRegisterSuccess}
        onNavigateToLogin={onNavigateToLogin}
      />
    </AuthLayout>
  );
}
