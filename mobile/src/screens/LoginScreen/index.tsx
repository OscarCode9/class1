import { AuthTemplate } from '@/templates/AuthTemplate';
import { LoginForm } from '@/organisms/LoginForm';

export const LoginScreen = () => (
  <AuthTemplate title="Task Manager" subtitle="Inicia sesión para continuar.">
    <LoginForm />
  </AuthTemplate>
);
