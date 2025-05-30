// src/theme/muiTheme.ts (o la ruta que elijas)

import { createTheme, ThemeOptions, PaletteMode, responsiveFontSizes } from '@mui/material';

// 1. Define las opciones base de tu tema para ambos modos
const baseThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: 'Outfit, sans-serif', // Asegúrate que esta fuente esté disponible en tu CSS global
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '9999px',
          padding: '8px 20px',
          fontWeight: 600,
          transition: 'background-color 0.25s, color 0.25s, border-color 0.25s',
          // Aquí no definimos colores base para que sean sobreescritos por la paleta
        },
        outlined: {
          // Los colores específicos para outlined se definirán dinámicamente en getAppMuiTheme
          // para asegurar que respetan el modo claro/oscuro.
        },
        contained: {
          // Puedes añadir estilos específicos para botones "contained" si los necesitas
        }
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          // El color del icono será manejado por el color del texto o por el tema
        }
      }
    },
    // Añade overrides para otros componentes MUI si es necesario
    MuiInputBase: { // Para tus FloatingInput, si son de Material-UI
        styleOverrides: {
            root: {
                // Aquí puedes configurar estilos base para todos los inputs si lo necesitas
            }
        }
    },
    MuiOutlinedInput: { // Específico para el outlined variant de los inputs
        styleOverrides: {
            root: {
                // Configura los colores del borde del input aquí si no se ven bien
                // en modo claro/oscuro por defecto
            }
        }
    }
    // ... más componentes
  },
};

// 2. Función para obtener el tema completo según el modo (light/dark)
export const getAppMuiTheme = (mode: PaletteMode) => {
  const theme = createTheme({
    ...baseThemeOptions,
    palette: {
      mode, // Establece el modo de la paleta (light o dark)
      ...(mode === 'light'
        ? {
            // Colores para el MODO CLARO
            primary: {
              main: '#4F46E5', // Ejemplo: indigo-600 para un botón primario
            },
            secondary: {
              main: '#374151', // Este será el color por defecto para 'color="secondary"' en modo claro (Tailwind gray-700)
              light: '#6B7280',
              dark: '#1F2937',
            },
            text: {
              primary: '#1F2937', // Color de texto principal (gris muy oscuro)
              secondary: '#374151', // Color de texto secundario (gris oscuro)
            },
            background: {
              default: '#F9FAFB', // Fondo general de la app (Tailwind gray-50)
              paper: '#FFFFFF', // Fondo de componentes como modales (blanco puro)
            },
            divider: '#D1D5DB', // Divisores (Tailwind gray-300)
          }
        : {
            // Colores para el MODO OSCURO
            primary: {
              main: '#818CF8', // Ejemplo: indigo-400 para un botón primario
            },
            secondary: {
              main: 'rgba(255, 255, 255, 0.7)', // Color "secondary" en dark mode
              light: 'rgba(255, 255, 255, 0.5)',
              dark: 'rgba(255, 255, 255, 0.9)',
            },
            text: {
              primary: 'rgba(255, 255, 255, 0.9)', // Texto principal
              secondary: 'rgba(255, 255, 255, 0.7)', // Texto secundario
            },
            background: {
              default: '#111827', // Fondo general de la app (Tailwind gray-900)
              paper: '#1F2937', // Fondo de componentes como modales (Tailwind gray-800)
            },
            divider: 'rgba(255, 255, 255, 0.12)', // Divisores para dark mode
          }),
    },
    // Sobreescrituras de componentes que dependen de la paleta y el modo
    components: {
      MuiButton: {
        styleOverrides: {
          outlined: {
            // Aquí definimos los colores específicos para el botón "outlined"
            // utilizando el modo actual.
            borderColor: mode === 'light' ? '#374151' : 'rgba(255, 255, 255, 0.5)',
            color: mode === 'light' ? '#1F2937' : 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              backgroundColor: mode === 'light' ? '#E5E7EB' : 'rgba(255, 255, 255, 0.15)',
              borderColor: mode === 'light' ? '#4B5563' : 'rgba(255, 255, 255, 0.6)',
            },
          },
          // Si el botón Cancelar usa color="secondary", puedes añadir esto
          // variants: [
          //   {
          //     props: { variant: 'outlined', color: 'secondary' },
          //     style: {
          //       borderColor: mode === 'light' ? '#374151' : 'rgba(255, 255, 255, 0.5)',
          //       color: mode === 'light' ? '#1F2937' : 'rgba(255, 255, 255, 0.9)',
          //       '&:hover': {
          //           backgroundColor: mode === 'light' ? '#E5E7EB' : 'rgba(255, 255, 255, 0.15)',
          //           borderColor: mode === 'light' ? '#4B5563' : 'rgba(255, 255, 255, 0.6)',
          //       },
          //     },
          //   },
          // ],
        },
      },
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            color: mode === 'light' ? '#1F2937' : 'rgba(255, 255, 255, 0.9)',
          },
        },
      },
      // ... otros componentes
    },
  });
  return responsiveFontSizes(theme); // Opcional: para tipografía responsiva
};