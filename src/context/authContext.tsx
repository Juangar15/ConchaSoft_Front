// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// Define el tipo para el contexto de autenticación
interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (newToken: string) => void;
  logout: () => void;
}

// Crea el contexto con un valor predeterminado de 'undefined'
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props para el AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Componente AuthProvider que gestiona el estado de autenticación
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Inicializa el token desde localStorage al montar el componente
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  // Calcula si el usuario está autenticado basado en la existencia del token
  const isAuthenticated = !!token;

  // Usa useEffect para sincronizar el estado 'token' con localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]); // Este efecto se ejecuta cada vez que el 'token' cambia

  // Función para iniciar sesión: guarda el nuevo token
  const login = (newToken: string) => {
    setToken(newToken);
  };

  // Función para cerrar sesión: elimina el token
  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};