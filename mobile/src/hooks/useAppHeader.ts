import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import { logout } from '@/store/slices/authSlice';
import { toggleTheme } from '@/store/slices/themeSlice';

export const useAppHeader = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const mode = useAppSelector((s) => s.theme.mode);

  const onToggleTheme = useCallback(() => {
    dispatch(toggleTheme());
  }, [dispatch]);

  const onLogout = useCallback(async () => {
    await dispatch(logout());
    router.replace('/(auth)/login');
  }, [dispatch, router]);

  return {
    user,
    mode,
    onToggleTheme,
    onLogout,
  };
};
