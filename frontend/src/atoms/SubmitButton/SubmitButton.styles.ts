import { Button } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledSubmitButton = styled(Button)(({ theme }) => ({
  minHeight: 56,
  borderRadius: 999,
  fontSize: "1rem",
  boxShadow: "0 18px 34px rgba(199, 92, 42, 0.22)",
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  "&:hover": {
    boxShadow: "0 20px 40px rgba(199, 92, 42, 0.28)",
  },
}));
