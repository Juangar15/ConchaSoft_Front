import { useAuth } from '../context/authContext';

/**
 * Hook personalizado para verificar permisos del usuario
 * Proporciona funciones útiles para verificar permisos en componentes
 */
export const usePermissions = () => {
  const { user } = useAuth();

  /**
   * Verifica si el usuario tiene un permiso específico
   * @param permission - El permiso a verificar
   * @returns true si el usuario tiene el permiso, false en caso contrario
   */
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permisos) return false;
    return user.permisos.includes(permission);
  };

  /**
   * Verifica si el usuario tiene alguno de los permisos especificados
   * @param permissions - Array de permisos a verificar
   * @returns true si el usuario tiene al menos uno de los permisos
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.permisos) return false;
    return permissions.some(permission => user.permisos.includes(permission));
  };

  /**
   * Verifica si el usuario tiene todos los permisos especificados
   * @param permissions - Array de permisos a verificar
   * @returns true si el usuario tiene todos los permisos
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user || !user.permisos) return false;
    return permissions.every(permission => user.permisos.includes(permission));
  };

  /**
   * Obtiene todos los permisos del usuario
   * @returns Array de permisos del usuario o array vacío si no hay permisos
   */
  const getUserPermissions = (): string[] => {
    return user?.permisos || [];
  };

  /**
   * Verifica si el usuario es administrador (id_rol === 1)
   * @returns true si el usuario es administrador
   */
  const isAdmin = (): boolean => {
    return user?.id_rol === 1;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    isAdmin,
    user
  };
};


