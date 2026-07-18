import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import { clearAuthError, register } from '@/store/slices/authSlice';
import type { RegisterFieldErrors } from '@/types/auth.types';
import { validateRegister } from '@/utils/validation';

export const useRegister = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { status, error } = useAppSelector((s) => s.auth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

  const submit = useCallback(async () => {
    dispatch(clearAuthError());
    const errors = validateRegister(name, email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await dispatch(
      register({ name: name.trim(), email: email.trim(), password }),
    );
    if (register.fulfilled.match(result)) {
      router.replace('/(main)/tasks');
    }
  }, [dispatch, name, email, password, router]);

  const goToLogin = useCallback(() => {
    router.replace('/(auth)/login');
  }, [router]);

  return {
    name,
    email,
    password,
    setName,
    setEmail,
    setPassword,
    submit,
    goToLogin,
    isLoading: status === 'loading',
    error,
    fieldErrors,
  };
};
