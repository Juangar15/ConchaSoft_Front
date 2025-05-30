// src/main.tsx
import React from 'react';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx"; // Contiene Helmet
import { ThemeProvider as AppThemeProvider, useTheme } from "./context/ThemeContext.tsx"; // Renombrado a AppThemeProvider
import { AuthProvider } from './context/authContext.tsx';
import { HelmetProvider } from 'react-helmet-async';

// Importa el ThemeProvider de Material-UI y tu función para obtener el tema
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, PaletteMode } from '@mui/material'; // CssBaseline para reseteo básico de CSS
import { getAppMuiTheme } from './theme/muiTheme'; // Ajusta esta ruta a donde guardaste el archivo

// Componente Wrapper para usar useTheme y construir el tema de MUI
function MuiThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme: appTheme } = useTheme(); // Obtiene el tema 'light' o 'dark' de tu AppThemeProvider
  
  // Memoiza el tema para evitar recrearlo en cada render si el tema no cambia
  const muiTheme = React.useMemo(() => {
    return getAppMuiTheme(appTheme as PaletteMode);
  }, [appTheme]);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline enableColorScheme /> {/* Resetea el CSS de forma consistente y permite el modo oscuro */}
      {children}
    </MuiThemeProvider>
  );
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <AppThemeProvider> {/* Tu ThemeProvider de contexto para light/dark */}
          <MuiThemeWrapper> {/* Este componente nuevo envuelve la app en el MuiThemeProvider */}
            <AppWrapper>
              <App />
            </AppWrapper>
          </MuiThemeWrapper>
        </AppThemeProvider>
      </AuthProvider>
    </HelmetProvider>
  </StrictMode>,
);