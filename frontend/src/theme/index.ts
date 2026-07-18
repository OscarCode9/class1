import { createTheme } from "@mui/material/styles";

export const getTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "light" ? "#c75c2a" : "#e28657",
        dark: mode === "light" ? "#923d18" : "#c75c2a",
        light: mode === "light" ? "#f1b38b" : "#fcd8c4",
      },
      secondary: {
        main: mode === "light" ? "#124c5a" : "#7fb5be",
        dark: mode === "light" ? "#0b333d" : "#124c5a",
        light: mode === "light" ? "#7fb5be" : "#afdbe2",
      },
      background: {
        default: mode === "light" ? "#f5efe6" : "#121212",
        paper: mode === "light" ? "#fffaf4" : "#1e1e1e",
      },
      text: {
        primary: mode === "light" ? "#23160f" : "#f5efe6",
        secondary: mode === "light" ? "#5f4a3d" : "#a89b93",
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
