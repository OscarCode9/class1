import { useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { RegisterPage } from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { getTheme } from "./theme";
import type { RegisteredUser } from "./types/auth";

type PageType = "login" | "register" | "dashboard";

export default function App() {
  // Read initial session from localStorage
  const savedToken = localStorage.getItem("accessToken");
  const savedUserStr = localStorage.getItem("user");

  let initialUser: RegisteredUser | null = null;
  if (savedUserStr) {
    try {
      initialUser = JSON.parse(savedUserStr) as RegisteredUser;
    } catch {
      localStorage.removeItem("user");
    }
  }

  const [token, setToken] = useState<string | null>(savedToken);
  const [user, setUser] = useState<RegisteredUser | null>(initialUser);
  const [page, setPage] = useState<PageType>(savedToken && initialUser ? "dashboard" : "login");

  // Dark Mode State
  const [mode, setMode] = useState<"light" | "dark">(
    () => (localStorage.getItem("themeMode") as "light" | "dark") || "light"
  );

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("themeMode", next);
      return next;
    });
  };

  const theme = getTheme(mode);

  const handleLoginSuccess = (result: { user: RegisteredUser; accessToken: string }) => {
    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("user", JSON.stringify(result.user));
    setToken(result.accessToken);
    setUser(result.user);
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setPage("login");
  };

  let pageContent;

  if (page === "dashboard" && token && user) {
    pageContent = (
      <DashboardPage
        user={user}
        token={token}
        onLogout={handleLogout}
        onToggleTheme={toggleTheme}
      />
    );
  } else if (page === "register") {
    pageContent = (
      <RegisterPage
        onRegisterSuccess={handleLoginSuccess}
        onNavigateToLogin={() => setPage("login")}
        onToggleTheme={toggleTheme}
      />
    );
  } else {
    pageContent = (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateToRegister={() => setPage("register")}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {pageContent}
    </ThemeProvider>
  );
}
