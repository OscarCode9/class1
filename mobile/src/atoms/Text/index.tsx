import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { styles } from './Text.styles';

type Variant =
  | 'display'
  | 'headlineLg'
  | 'headlineMd'
  | 'headlineSm'
  | 'brand'
  | 'bodyLg'
  | 'bodyMd'
  | 'bodySm'
  | 'labelLg'
  | 'labelMd'
  | 'button'
  | 'chip';

interface AppTextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
}

export const Text = ({
  variant = 'bodyMd',
  color,
  style,
  ...rest
}: AppTextProps) => (
  <RNText style={[styles[variant], color ? { color } : null, style]} {...rest} />
);
