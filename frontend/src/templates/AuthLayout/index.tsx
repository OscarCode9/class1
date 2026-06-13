import type { ReactNode } from "react";
import { Chip } from "@mui/material";
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
}: AuthLayoutProps) {
  return (
    <LayoutRoot>
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

