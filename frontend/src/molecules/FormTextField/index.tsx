import { StyledTextField } from "./FormTextField.styles";

interface FormTextFieldProps {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  errorText?: string;
}

export function FormTextField({
  name,
  label,
  type = "text",
  autoComplete,
  defaultValue,
  errorText,
}: FormTextFieldProps) {
  return (
    <StyledTextField
      name={name}
      label={label}
      type={type}
      autoComplete={autoComplete}
      defaultValue={defaultValue}
      error={Boolean(errorText)}
      helperText={errorText ?? " "}
      required
      fullWidth
    />
  );
}
