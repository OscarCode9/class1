import { AuthTemplate } from '@/templates/AuthTemplate';
import { RegisterForm } from '@/organisms/RegisterForm';

export const RegisterScreen = () => (
  <AuthTemplate title="Task Manager" subtitle="Crea tu cuenta en segundos.">
    <RegisterForm />
  </AuthTemplate>
);
