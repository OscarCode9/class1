import type { ReactNode } from "react";
import { Chip, IconButton, Tooltip, useTheme, Box } from "@mui/material";
import { DarkModeRounded, LightModeRounded } from "@mui/icons-material";
import {
  FeatureList,
  FormPanel,
  HeroPanel,
  HeroSubtitle,
  HeroTitle,
  LayoutContainer,
  LayoutRoot,
} from "./AuthLayout.styles";

interface AuthLayoutProps {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  chipLabel?: string;
  onToggleTheme?: () => void;
}

export function AuthLayout({
  children,
  title = "Registro listo para integrarse.",
  subtitle = (
    <>
      Este frontend queda conectado al backend local por medio del proxy de
      Vite, apuntando al endpoint real <code>POST /api/v1/auth/register</code>.
    </>
  ),
  chipLabel = "RF-10 Registro de usuario",
  onToggleTheme,
}: AuthLayoutProps) {
  const theme = useTheme();

  return (
    <LayoutRoot sx={{ position: "relative" }}>
      {onToggleTheme && (
        <Box sx={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}>
          <Tooltip title={theme.palette.mode === "light" ? "Modo Oscuro" : "Modo Claro"}>
            <IconButton onClick={onToggleTheme} color="primary" sx={{ background: theme.palette.mode === "light" ? "rgba(255, 255, 255, 0.7)" : "rgba(30, 30, 30, 0.7)", backdropFilter: "blur(4px)" }}>
              {theme.palette.mode === "light" ? <DarkModeRounded /> : <LightModeRounded />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <LayoutContainer maxWidth="lg">
        <HeroPanel>
          <Chip label={chipLabel} color="secondary" style={{ width: "fit-content" }} />
          <HeroTitle variant="h1">{title}</HeroTitle>
          <HeroSubtitle variant="h6">{subtitle}</HeroSubtitle>
          <FeatureList>
            <Chip label="React 19 + MUI" />
            <Chip label="Estructura atómica ligera" />
            <Chip label="Integración local /api" />
          </FeatureList>
        </HeroPanel>

        <FormPanel>{children}</FormPanel>
      </LayoutContainer>
    </LayoutRoot>
  );
}

