import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppSelector } from '@/hooks/useAppStore';
import { colors } from '@/constants/theme';

export default function IndexRoute() {
  const { token, bootstrapped } = useAppSelector((s) => s.auth);
  const mode = useAppSelector((s) => s.theme.mode);
  const c = colors[mode];

  if (!bootstrapped) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(main)/tasks" />;
  }

  return <Redirect href="/(auth)/login" />;
}
