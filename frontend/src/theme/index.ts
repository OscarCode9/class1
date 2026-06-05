import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#c75c2a",
      dark: "#923d18",
      light: "#f1b38b",
    },
    secondary: {
      main: "#124c5a",
      dark: "#0b333d",
      light: "#7fb5be",
    },
    background: {
      default: "#f5efe6",
      paper: "#fffaf4",
    },
    text: {
      primary: "#23160f",
      secondary: "#5f4a3d",
    },
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: "-0.04em",
    },
    h2: {
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
  },
});
