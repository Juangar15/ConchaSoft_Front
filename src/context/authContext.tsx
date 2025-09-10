// src/context/AuthContext.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// === INTERFAZ DE USUARIO ACTUALIZADA ===
// Aquí nos aseguramos de que el tipo de 'user' incluya la lista de permisos.
interface UserInfo {
  login: string;
  correo: string;
  id_rol: number;
  permisos: string[]; // <-- ¡ESTA ES LA LÍNEA CLAVE!
}

// Define el tipo para el contexto de autenticación
interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  user: UserInfo | null; // El usuario ahora tendrá sus permisos
  login: (newToken: string, userData: UserInfo) => void;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

// Crea el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props para el AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Componente AuthProvider que gestiona el estado de autenticación
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserInfo | null>(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        // Al parsear, el objeto completo (incluyendo permisos) se carga al estado
        return JSON.parse(storedUser);
      } catch {
        localStorage.removeItem('user');
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
      // Al guardar, el objeto completo (incluyendo permisos) se guarda en localStorage
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = (newToken: string, userData: UserInfo) => {
    setToken(newToken);
    setUser(userData); // Se guarda el objeto de usuario completo
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const refreshUserData = async () => {
    if (!token || !user) {
      console.log('No se puede actualizar: token o user no disponibles');
      return;
    }
    
    try {
      console.log('Iniciando actualización de datos del usuario...');
      
      // Hacer una petición para obtener los datos actualizados del usuario
      const response = await fetch(`https://conchasoft-api.onrender.com/api/auth/users/${user.login}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('Datos del usuario obtenidos:', userData);
        
        // Obtener los permisos del rol
        const rolesResponse = await fetch('https://conchasoft-api.onrender.com/api/roles', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          const userRole = rolesData.roles.find((r: any) => r.id === userData.user.id_rol);
          
          if (userRole) {
            console.log('Rol del usuario encontrado:', userRole);
            
            // Obtener los permisos del rol
            const permissionsResponse = await fetch(`https://conchasoft-api.onrender.com/api/roles/${userRole.id}/permisos`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (permissionsResponse.ok) {
              const permissionsData = await permissionsResponse.json();
              console.log('IDs de permisos obtenidos:', permissionsData);
              
              // Obtener los nombres de los permisos
              const permissionsNames = await Promise.all(
                permissionsData.map(async (permId: number) => {
                  const permResponse = await fetch(`https://conchasoft-api.onrender.com/api/permisos/${permId}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  if (permResponse.ok) {
                    const permData = await permResponse.json();
                    return permData.nombre;
                  }
                  return null;
                })
              );
              
              const validPermissions = permissionsNames.filter(p => p !== null);
              console.log('Permisos válidos obtenidos:', validPermissions);
              
              // Actualizar el usuario con los nuevos permisos
              const updatedUser = {
                ...userData.user,
                permisos: validPermissions
              };
              
              console.log('Usuario actualizado:', updatedUser);
              setUser(updatedUser);
              console.log('Estado del usuario actualizado exitosamente');
              
              // Forzar un re-render adicional para asegurar que todos los componentes se actualicen
              setTimeout(() => {
                console.log('Forzando re-render adicional...');
                setUser(prev => prev ? { ...prev } : null);
              }, 100);
            } else {
              console.error('Error al obtener permisos del rol:', permissionsResponse.statusText);
            }
          } else {
            console.error('No se encontró el rol del usuario');
          }
        } else {
          console.error('Error al obtener roles:', rolesResponse.statusText);
        }
      } else {
        console.error('Error al obtener datos del usuario:', response.statusText);
      }
    } catch (error) {
      console.error('Error al actualizar datos del usuario:', error);
      throw error; // Re-lanzar el error para que el componente pueda manejarlo
    }
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, user, login, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};