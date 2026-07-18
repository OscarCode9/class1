import { useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { styles } from './Input.styles';

interface InputProps extends TextInputProps {
  borderColor: string;
  focusColor: string;
  backgroundColor: string;
  textColor: string;
  placeholderColor: string;
}

export const Input = ({
  borderColor,
  focusColor,
  backgroundColor,
  textColor,
  placeholderColor,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={placeholderColor}
      style={[
        styles.root,
        {
          borderColor: focused ? focusColor : borderColor,
          backgroundColor,
          color: textColor,
        },
        focused && styles.focused,
        style,
      ]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
};
