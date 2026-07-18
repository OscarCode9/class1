import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import { clearAuthError, login } from '@/store/slices/authSlice';
import type { LoginFieldErrors } from '@/types/auth.types';
import { validateLogin } from '@/utils/validation';

export const useLogin = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { status, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  const submit = useCallback(async () => {
    dispatch(clearAuthError());
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await dispatch(
      login({ email: email.trim(), password }),
    );
    if (login.fulfilled.match(result)) {
      router.replace('/(main)/tasks');
    }
  }, [dispatch, email, password, router]);

  const goToRegister = useCallback(() => {
    router.push('/(auth)/register');
  }, [router]);

  return {
    email,
    password,
    setEmail,
    setPassword,
    submit,
    goToRegister,
    isLoading: status === 'loading',
    error,
    fieldErrors,
  };
};
