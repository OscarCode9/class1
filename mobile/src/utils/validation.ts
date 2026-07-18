import type { LoginFieldErrors, RegisterFieldErrors } from '@/types/auth.types';

export function validateLogin(email: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmed = email.trim();

  if (!trimmed) {
    errors.email = 'El email es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    errors.email = 'Ingresa un email con formato válido.';
  }

  if (!password) {
    errors.password = 'La contraseña es obligatoria.';
  }

  return errors;
}

export function validateRegister(
  name: string,
  email: string,
  password: string,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  if (!trimmedName) {
    errors.name = 'El nombre es obligatorio.';
  } else if (trimmedName.length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres.';
  }

  if (!trimmedEmail) {
    errors.email = 'El email es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Ingresa un email con formato válido.';
  }

  if (!password) {
    errors.password = 'La contraseña es obligatoria.';
  } else if (password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  }

  return errors;
}
