import { View } from 'react-native';
import { Input } from '@/atoms/Input';
import { Text } from '@/atoms/Text';
import { styles } from './FormField.styles';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  errorText?: string;
  borderColor: string;
  focusColor: string;
  backgroundColor: string;
  textColor: string;
  placeholderColor: string;
  labelColor: string;
  errorColor: string;
}

export const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  errorText,
  borderColor,
  focusColor,
  backgroundColor,
  textColor,
  placeholderColor,
  labelColor,
  errorColor,
}: FormFieldProps) => (
  <View style={styles.root}>
    <Text variant="labelLg" color={labelColor} style={styles.label}>
      {label}
    </Text>
    <Input
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      borderColor={errorText ? errorColor : borderColor}
      focusColor={errorText ? errorColor : focusColor}
      backgroundColor={backgroundColor}
      textColor={textColor}
      placeholderColor={placeholderColor}
    />
    {errorText ? (
      <Text variant="bodySm" color={errorColor} style={styles.error}>
        {errorText}
      </Text>
    ) : null}
  </View>
);
