import { Alert, Card, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const FormCard = styled(Card)(({ theme }) => ({
  width: "100%",
  maxWidth: 560,
  borderRadius: 28,
  padding: theme.spacing(1),
  background: "rgba(255, 250, 244, 0.82)",
  border: "1px solid rgba(18, 76, 90, 0.1)",
  boxShadow: "0 30px 80px rgba(35, 22, 15, 0.12)",
  backdropFilter: "blur(18px)",
}));

export const FormContent = styled("form")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  padding: theme.spacing(4),
}));

export const Headline = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  maxWidth: 420,
}));

export const SupportingText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  maxWidth: 460,
}));

export const StatusAlert = styled(Alert)({
  borderRadius: 18,
  alignItems: "center",
});

export const ActionText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  textAlign: "center",
  marginTop: theme.spacing(1),
}));
