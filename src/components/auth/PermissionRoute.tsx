import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import AccessDenied from './AccessDenied';

interface PermissionRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
  showAccessDenied?: boolean; // Nueva prop para mostrar página de acceso denegado
}

/**
 * Componente que protege rutas basándose en permisos específicos
 * Si el usuario no tiene el permiso requerido, muestra acceso denegado o redirige
 */
const PermissionRoute: React.FC<PermissionRouteProps> = ({ 
  children, 
  requiredPermission,
  showAccessDenied = true // Por defecto muestra la página de acceso denegado
}) => {
  const { isAuthenticated, user } = useAuth();

  // Si no está autenticado, redirige al login
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Si no hay usuario o permisos, muestra acceso denegado o redirige
  if (!user || !user.permisos) {
    return showAccessDenied ? <AccessDenied /> : <Navigate to="/dashboard" replace />;
  }

  // Verifica si el usuario tiene el permiso requerido
  const hasPermission = user.permisos.includes(requiredPermission);

  if (!hasPermission) {
    // Si no tiene el permiso, muestra acceso denegado o redirige
    return showAccessDenied ? <AccessDenied /> : <Navigate to="/dashboard" replace />;
  }

  // Si tiene el permiso, permite el acceso
  return <>{children}</>;
};

export default PermissionRoute;
