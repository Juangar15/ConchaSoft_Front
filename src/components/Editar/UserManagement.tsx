import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importa tus componentes de formulario y UI (asegúrate de que estas rutas sean correctas)
import Label from '../form/Label';
import Input from '../form/input/InputField';
import Button from '../ui/button/Button'; // Tu componente Button.tsx

// Define las interfaces para tus datos
interface User {
  login: string;
  correo: string;
  id_rol: number;
}

interface Role {
  id: number;
  rol: string;
  // If your roles API returns other fields like 'descripcion' or 'estado',
  // you might want to add them here, though for UserManagement, 'id' and 'rol' are likely sufficient.
  // descripcion?: string;
  // estado?: boolean;
}

interface UserFormData {
  login: string;
  correo: string;
  id_rol: number;
  contraseña?: string; // For creating a user
  newPassword?: string; // For updating a user's password
}

// Ensure these URLs are correct for your backend deployments
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api/auth';
const ROLES_API_URL = 'https://conchasoft-api.onrender.com/api/roles'; // This URL now returns an object with a 'roles' array

const UserManagement: React.FC = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentEditingUser, setCurrentEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    login: '',
    correo: '',
    id_rol: 2, // Default role ID (e.g., 'Usuario' if ID 2 corresponds to it)
    contraseña: '',
    newPassword: '',
  });

  const getToken = () => localStorage.getItem('token');

  /**
   * @function fetchRoles
   * @description Fetches the list of roles from the API.
   * IMPORTANT: Now expects the API to return an object with a 'roles' array.
   */
  const fetchRoles = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        setError('No autenticado. Por favor, inicia sesión.');
        return;
      }
      const response = await axios.get(ROLES_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // --- KEY CHANGE HERE: Access 'data.roles' instead of 'data' directly ---
      if (Array.isArray(response.data.roles)) {
        setRoles(response.data.roles);
      } else {
        console.warn("API for roles returned data.roles not as an array:", response.data);
        setRoles([]); // Fallback to empty array
        toast.warn("Formato inesperado de la API de roles. No se pudo cargar la lista de roles.");
      }
      // --- END KEY CHANGE ---

    } catch (err) {
      console.error('Error al cargar roles:', err);
      if (axios.isAxiosError(err) && err.response) {
        toast.error(err.response.data.error || 'Error al cargar roles.');
      } else {
        toast.error('Error de red o desconocido al cargar roles.');
      }
      setError('Error al cargar roles. No se pudo obtener la lista de roles.');
    }
  }, []); // Dependencies: empty array as this function only depends on external token.

  /**
   * @function fetchUsers
   * @description Fetches the list of users from the API.
   */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        setError('No autenticado. Por favor, inicia sesión.');
        setLoading(false);
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.users); // Assuming your /api/auth/users endpoint returns { users: [...] }
      toast.success('Usuarios cargados exitosamente.');
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Error al cargar usuarios.');
        toast.error(err.response.data.error || 'Error al cargar usuarios.');
      } else {
        setError('Error de red o desconocido al cargar usuarios.');
        toast.error('Error de red o desconocido al cargar usuarios.');
      }
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies: empty array as this function only depends on external token.

  // Fetch roles and users on component mount
  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, [fetchRoles, fetchUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'id_rol' ? parseInt(value, 10) : value }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.login.trim() || !formData.correo.trim() || !formData.contraseña || formData.id_rol === undefined) {
      toast.error('Todos los campos son obligatorios para crear un usuario.');
      setLoading(false);
      return;
    }
    if (formData.contraseña.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setError('No autenticado.');
        toast.error('No autenticado.');
        setLoading(false);
        return;
      }
      await axios.post(`${API_BASE_URL}/users/create`, {
        login: formData.login,
        correo: formData.correo,
        id_rol: formData.id_rol,
        contraseña: formData.contraseña,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Usuario creado exitosamente.');
      setFormData({ login: '', correo: '', id_rol: 2, contraseña: '', newPassword: '' });
      fetchUsers(); // Refresh the user list
    } catch (err) {
      console.error('Error al crear usuario:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Error al crear usuario.');
        toast.error(err.response.data.error || 'Error al crear usuario.');
      } else {
        setError('Error de red o desconocido al crear usuario.');
        toast.error('Error de red o desconocido al crear usuario.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: User) => {
    setIsEditing(true);
    setCurrentEditingUser(user);
    setFormData({
      login: user.login,
      correo: user.correo,
      id_rol: user.id_rol,
      contraseña: '', // Passwords should never be pre-filled
      newPassword: '',
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!currentEditingUser) return;

    const updateData: Partial<UserFormData> = {};
    if (formData.correo !== currentEditingUser.correo) {
      updateData.correo = formData.correo;
    }
    if (formData.id_rol !== currentEditingUser.id_rol) {
      updateData.id_rol = formData.id_rol;
    }
    if (formData.newPassword) {
      if (formData.newPassword.length < 8) {
        toast.error('La nueva contraseña debe tener al menos 8 caracteres.');
        setLoading(false);
        return;
      }
      updateData.newPassword = formData.newPassword;
    }

    if (Object.keys(updateData).length === 0) {
      toast.info('No hay cambios para actualizar.');
      setLoading(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setError('No autenticado.');
        toast.error('No autenticado.');
        setLoading(false);
        return;
      }
      await axios.put(`${API_BASE_URL}/users/${currentEditingUser.login}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Usuario actualizado exitosamente.');
      setIsEditing(false);
      setCurrentEditingUser(null);
      setFormData({ login: '', correo: '', id_rol: 2, contraseña: '', newPassword: '' });
      fetchUsers(); // Refresh the user list
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Error al actualizar usuario.');
        toast.error(err.response.data.error || 'Error al actualizar usuario.');
      } else {
        setError('Error de red o desconocido al actualizar usuario.');
        toast.error('Error de red o desconocido al actualizar usuario.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (loginToDelete: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${loginToDelete}?`)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        setError('No autenticado.');
        toast.error('No autenticado.');
        setLoading(false);
        return;
      }
      await axios.delete(`${API_BASE_URL}/users/${loginToDelete}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Usuario ${loginToDelete} eliminado exitosamente.`);
      fetchUsers(); // Refresh the user list
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Error al eliminar usuario.');
        toast.error(err.response.data.error || 'Error al eliminar usuario.');
      } else {
        setError('Error de red o desconocido al eliminar usuario.');
        toast.error('Error de red o desconocido al eliminar usuario.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-4xl mx-auto my-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Usuarios</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/dashboard')}
        >
          Regresar al Dashboard
        </Button>
      </div>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      {loading && <p className="text-gray-600 dark:text-gray-400 text-center mb-4">Cargando usuarios...</p>}

      {/* Formulario de Creación/Edición */}
      <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">
          {isEditing ? `Editar Usuario: ${currentEditingUser?.login}` : 'Crear Nuevo Usuario'}
        </h3>
        <form onSubmit={isEditing ? handleUpdateUser : handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="login">Login:</Label>
            <Input
              id="login"
              name="login"
              type="text"
              placeholder="Nombre de usuario"
              value={formData.login}
              onChange={handleInputChange}
              disabled={isEditing}
            />
          </div>
          <div>
            <Label htmlFor="correo">Correo:</Label>
            <Input
              id="correo"
              name="correo"
              type="email"
              placeholder="correo@ejemplo.com"
              value={formData.correo}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="id_rol">Rol:</Label>
            <select
              id="id_rol"
              name="id_rol"
              value={formData.id_rol}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {roles.length > 0 ? (
                roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.rol}
                  </option>
                ))
              ) : (
                <option value="" disabled>Cargando roles...</option>
              )}
            </select>
          </div>
          {isEditing ? (
            <div>
              <Label htmlFor="newPassword">Nueva Contraseña (opcional):</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="Deja vacío para no cambiar"
                value={formData.newPassword}
                onChange={handleInputChange}
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="contraseña">Contraseña:</Label>
              <Input
                id="contraseña"
                name="contraseña"
                type="password"
                placeholder="Contraseña"
                value={formData.contraseña}
                onChange={handleInputChange}
              />
            </div>
          )}
          <div className="col-span-1 md:col-span-2 flex justify-end space-x-3 mt-4">
            <Button type="submit" size="sm" disabled={loading}>
              {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
            </Button>
            {isEditing && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setCurrentEditingUser(null);
                  setFormData({ login: '', correo: '', id_rol: 2, contraseña: '', newPassword: '' });
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de Usuarios */}
      <h3 className="text-xl font-semibold text-gray-700 dark:text-white mb-4 mt-8 text-center">Lista de Usuarios</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <th className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-sm font-medium">Login</th>
              <th className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-sm font-medium">Correo</th>
              <th className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-sm font-medium">Rol</th>
              <th className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-center text-sm font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && !error ? (
              <tr>
                <td colSpan={4} className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">No hay usuarios para mostrar.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.login} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4 text-gray-800 dark:text-white">{user.login}</td>
                  <td className="py-3 px-4 text-gray-800 dark:text-white">{user.correo}</td>
                  <td className="py-3 px-4 text-gray-800 dark:text-white">
                    {roles.find(r => r.id === user.id_rol)?.rol || 'Desconocido'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditClick(user)}
                      className="mr-2"
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => handleDeleteUser(user.login)}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;