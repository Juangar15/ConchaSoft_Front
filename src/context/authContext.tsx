// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// === INTERFAZ ACTUALIZADA PARA LA INFORMACIÓN DEL USUARIO ===
interface UserInfo {
  login: string;
  correo: string;
  id_rol: number; // <--- ¡ASEGÚRATE DE QUE TU BACKEND DEVUELVA ESTE CAMPO AL INICIAR SESIÓN!
}

// Define el tipo para el contexto de autenticación
interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  user: UserInfo | null; // Almacenará la info del usuario
  login: (newToken: string, userData: UserInfo) => void; // Acepta datos de usuario
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
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserInfo | null>(() => {
    const storedUser = localStorage.getItem('user'); // Tu clave para guardar el objeto user
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error("Error parsing user info from localStorage:", e);
        localStorage.removeItem('user'); // Limpiar si hay error
        return null;
      }
    }
    return null;
  });
  const isAuthenticated = !!token;

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = (newToken: string, userData: UserInfo) => {
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, user, login, logout }}>
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