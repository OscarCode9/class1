import { useFormStatus } from "react-dom";
import { StyledSubmitButton } from "./SubmitButton.styles";

interface SubmitButtonProps {
  idleLabel: string;
  pendingLabel: string;
}

export function SubmitButton({ idleLabel, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <StyledSubmitButton type="submit" variant="contained" fullWidth disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </StyledSubmitButton>
  );
}
