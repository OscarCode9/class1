import { Box, Container, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export const LayoutRoot = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  background: theme.palette.mode === "light"
    ? `
      radial-gradient(circle at top left, rgba(241, 179, 139, 0.9), transparent 28%),
      radial-gradient(circle at bottom right, rgba(18, 76, 90, 0.16), transparent 34%),
      linear-gradient(145deg, #f5efe6 0%, #f1e2d3 48%, #fff8f0 100%)
    `
    : `
      radial-gradient(circle at top left, rgba(241, 179, 139, 0.3), transparent 28%),
      radial-gradient(circle at bottom right, rgba(18, 76, 90, 0.08), transparent 34%),
      linear-gradient(145deg, #121212 0%, #1c1c1c 48%, #242424 100%)
    `,
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(3, 0),
}));

export const LayoutContainer = styled(Container)(({ theme }) => ({
  display: "grid",
  gap: theme.spacing(4),
  alignItems: "center",
  [theme.breakpoints.up("md")]: {
    gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
  },
}));

export const HeroPanel = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(2),
  padding: theme.spacing(2, 1, 2, 0),
}));

export const FormPanel = styled(Stack)({
  alignItems: "center",
});

export const HeroTitle = styled(Typography)(({ theme }) => ({
  fontSize: "3rem",
  color: theme.palette.text.primary,
  [theme.breakpoints.up("md")]: {
    fontSize: "4.5rem",
  },
}));

export const HeroSubtitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  maxWidth: 560,
}));

export const FeatureList = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(1.5),
  [theme.breakpoints.up("sm")]: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
}));
