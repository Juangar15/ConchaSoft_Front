// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx"; // Contiene Helmet
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from './context/authContext.tsx'; // Tu nuevo AuthProvider
import { HelmetProvider } from 'react-helmet-async'; // Necesario para Helmet

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* HelmetProvider debe envolver todo lo que usa Helmet (como AppWrapper) */}
    <HelmetProvider>
      {/* AuthProvider envuelve la app para proveer el estado de autenticación */}
      <AuthProvider>
        {/* ThemeProvider envuelve la app para proveer el estado del tema */}
        <ThemeProvider>
          {/* AppWrapper podría contener PageMeta, y PageMeta usa Helmet,
              por eso ThemeProvider y AuthProvider pueden ir dentro o fuera de él
              dependiendo de si AppWrapper usa esos contextos.
              Si AppWrapper NO usa AuthProvider o ThemeProvider, este orden es seguro. */}
          <AppWrapper>
            <App />
          </AppWrapper>
        </ThemeProvider>
      </AuthProvider>
    </HelmetProvider>
  </StrictMode>,
);