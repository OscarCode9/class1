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
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <LayoutRoot>
      <LayoutContainer maxWidth="lg">
        <HeroPanel>
          <Chip label="RF-10 Registro de usuario" color="secondary" />
          <HeroTitle variant="h1">Registro listo para integrarse.</HeroTitle>
          <HeroSubtitle variant="h6">
            Este frontend queda conectado al backend local por medio del proxy de
            Vite, apuntando al endpoint real <code>POST /api/v1/auth/register</code>.
          </HeroSubtitle>
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
