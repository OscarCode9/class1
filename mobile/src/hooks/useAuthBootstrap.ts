import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import {
  logoutLocal,
  restoreSession,
} from '@/store/slices/authSlice';
import { registerUnauthorizedHandler } from '@/services/api';
import { tokenStorage, userStorage } from '@/services/token.storage';

export const useAuthBootstrap = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const { token, bootstrapped } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      void tokenStorage.clear();
      void userStorage.clear();
      dispatch(logoutLocal());
    });
  }, [dispatch]);

  useEffect(() => {
    if (!bootstrapped) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && !inMainGroup) {
      router.replace('/(main)/tasks');
    }
  }, [bootstrapped, token, segments, router]);

  return { bootstrapped, isAuthenticated: Boolean(token) };
};
