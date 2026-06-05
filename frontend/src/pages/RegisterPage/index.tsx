import { RegisterForm } from "../../organisms/RegisterForm";
import { AuthLayout } from "../../templates/AuthLayout";

export function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
