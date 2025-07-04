import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, Id } from 'react-toastify'; // Importa 'Id' para el toastId
import 'react-toastify/dist/ReactToastify.css';

// Importa tus componentes de formulario y UI (asegúrate de que estas rutas sean correctas)
import Label from '../form/Label';
import Input from '../form/input/InputField';
import Button from '../ui/button/Button'; // Tu componente Button.tsx

// --- 1. Define las interfaces para tus datos (Añade 'activo') ---
interface User {
    login: string;
    correo: string;
    id_rol: number;
    activo: boolean; // Añadido: true para activo, false para inactivo
}

interface Role {
    id: number;
    rol: string;
}

interface UserFormData {
    login: string;
    correo: string;
    id_rol: number;
    contraseña?: string; // Para crear un usuario
    newPassword?: string; // Para actualizar la contraseña de un usuario
    activo: boolean; // Añadido: Estado de actividad
}

// Ensure these URLs are correct for your backend deployments
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api/auth';
const ROLES_API_URL = 'https://conchasoft-api.onrender.com/api/roles';

// --- Nuevo: Componente de Confirmación para Toastify ---
interface ConfirmationToastProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    toastId: Id;
}

const ConfirmationToast: React.FC<ConfirmationToastProps> = ({ message, onConfirm, onCancel, toastId }) => {
    return (
        <div>
            <p className="mb-3 text-sm text-gray-700 dark:text-gray-200">{message}</p>
            <div className="flex justify-end space-x-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        toast.dismiss(toastId); // Cierra el toast
                        onCancel();
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                        toast.dismiss(toastId); // Cierra el toast
                        onConfirm();
                    }}
                >
                    Confirmar
                </Button>
            </div>
        </div>
    );
};


const UserManagement: React.FC = () => {
    const navigate = useNavigate();

    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [generalError, setGeneralError] = useState<string | null>(null); // Para errores generales de la API

    // Estados para errores de validación de campos específicos
    const [loginError, setLoginError] = useState<string | null>(null);
    const [correoError, setCorreoError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [newPasswordError, setNewPasswordError] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentEditingUser, setCurrentEditingUser] = useState<User | null>(null);
    // --- 2. Estado del formulario (Añade 'activo') ---
    const [formData, setFormData] = useState<UserFormData>({
        login: '',
        correo: '',
        id_rol: 0, // O el ID del primer rol si lo sabes, ej: 1
        contraseña: '',
        newPassword: '',
        activo: true, // Por defecto, un nuevo usuario es activo
    });

    const getToken = () => localStorage.getItem('token');

    // Regex para validaciones
    const alphanumericRegex = /^[a-zA-Z0-9]*$/;
    const noSpacesRegex = /^\S*$/;

    // --- Funciones de Validación Individuales ---
    const validateLogin = (value: string): string | null => {
        if (!value.trim()) {
            return "El login es requerido.";
        }
        if (!noSpacesRegex.test(value)) {
            return "El login no puede contener espacios.";
        }
        if (!alphanumericRegex.test(value)) {
            return "El login solo puede contener letras y números.";
        }
        return null; // Válido
    };

    const validateCorreo = (value: string): string | null => {
        if (!value.trim()) {
            return "El correo es requerido.";
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return "El formato del correo electrónico no es válido.";
        }
        return null;
    };

    const validatePassword = (value: string): string | null => {
    if (!value.trim()) {
        return "La contraseña es requerida.";
    }
    if (value.length < 8) {
        return "La contraseña debe tener al menos 8 caracteres.";
    }
    if (!/[A-Z]/.test(value)) {
        return "Debe contener al menos una letra mayúscula.";
    }
    if (!/[a-z]/.test(value)) {
        return "Debe contener al menos una letra minúscula.";
    }
    if (!/\d/.test(value)) {
        return "Debe contener al menos un número.";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        return "Debe contener al menos un carácter especial.";
    }

    // Evitar secuencias numéricas o alfabéticas
    const sequences = ['123456', 'abcdef', 'qwerty', '654321', '098765'];
    const lower = value.toLowerCase();
    if (sequences.some(seq => lower.includes(seq))) {
        return "No se permiten secuencias comunes como '123456' o 'abcdef'.";
    }

    // Evitar repeticiones consecutivas del mismo carácter
    if (/(\w)\1{3,}/.test(value)) {
        return "No se permiten más de 3 caracteres iguales consecutivos.";
    }

    // Evitar solo símbolos repetidos como @@@@@@@
    if (/^[!@#$%^&*()_+\-=\\[\]{};':"|,.<>/?]{6,}$/
.test(value)) {
        return "La contraseña no puede estar compuesta solo por símbolos.";
    }

    return null; // Si pasa todas las reglas, es válida
};


    // --- Manejadores de Cambio con Validación en Tiempo Real ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement; // Cast para acceder a 'checked'

        // --- 3. Manejo de entrada para el campo 'activo' (checkbox) ---
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'id_rol' ? parseInt(value, 10) : (type === 'checkbox' ? checked : value)
        }));

        // Validar en tiempo real y establecer errores específicos
        if (name === 'login') {
            setLoginError(validateLogin(value));
        } else if (name === 'correo') {
            setCorreoError(validateCorreo(value));
        } else if (name === 'contraseña') {
            setPasswordError(validatePassword(value));
        } else if (name === 'newPassword') {
            setNewPasswordError(value ? validatePassword(value) : null);
        }
    };


    /**
     * @function fetchRoles
     * @description Fetches the list of roles from the API.
     * IMPORTANT: Now expects the API to return an object with a 'roles' array.
     */
    const fetchRoles = useCallback(async () => {
        try {
            const token = getToken();
            if (!token) {
                setGeneralError('No autenticado. Por favor, inicia sesión.');
                return;
            }
            const response = await axios.get(ROLES_API_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (Array.isArray(response.data.roles)) {
                setRoles(response.data.roles);
            } else {
                setRoles([]); // Fallback to empty array
                toast.warn("Formato inesperado de la API de roles. No se pudo cargar la lista de roles.");
            }
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                toast.error(err.response.data.error || 'Error al cargar roles.');
            } else {
                toast.error('Error de red o desconocido al cargar roles.');
            }
            setGeneralError('Error al cargar roles. No se pudo obtener la lista de roles.');
        }
    }, []);

    /**
     * @function fetchUsers
     * @description Fetches the list of users from the API.
     * Optionally takes `estado` for filtering.
     */
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setGeneralError(null);
        try {
            const token = getToken();
            if (!token) {
                setGeneralError('No autenticado. Por favor, inicia sesión.');
                setLoading(false);
                return;
            }
            // --- 4. fetchUsers: Ahora el backend devuelve un objeto con 'users' ---
            // Puedes añadir parámetros de búsqueda y paginación si los implementas en el front
            const response = await axios.get(`${API_BASE_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` },
                // params: { page: 1, limit: 10, search: '', estado: 1 } // Ejemplo de cómo enviar filtros
            });
            // Asumiendo que el backend devuelve { usuarios: [...], totalItems: N, currentPage: M, ... }
            setUsers(response.data.users || []); // Asegúrate de que coincida con la propiedad del backend
            toast.success('Usuarios cargados exitosamente.');
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                setGeneralError(err.response.data.error || 'Error al cargar usuarios.');
                toast.error(err.response.data.error || 'Error al cargar usuarios.');
            } else {
                setGeneralError('Error de red o desconocido al cargar usuarios.');
                toast.error('Error de red o desconocido al cargar usuarios.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Este useEffect se ejecutará solo cuando la lista de 'roles' cambie y tenga contenido.
    useEffect(() => {
        // Si no estamos editando y ya tenemos roles cargados
        if (!isEditing && roles.length > 0) {
            // Establecemos el id_rol en el formulario al ID del primer rol de la lista
            setFormData(prev => ({ ...prev, id_rol: roles[0].id }));
        }
    }, [roles, isEditing]);

    // Fetch roles and users on component mount
    useEffect(() => {
        fetchRoles();
        fetchUsers();
    }, [fetchRoles, fetchUsers]);


    // --- Funciones de Manejo de Formularios con Validación Final ---

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setGeneralError(null);
        setLoginError(null);
        setCorreoError(null);
        setPasswordError(null);

        // Validaciones finales antes de enviar
        const loginErr = validateLogin(formData.login);
        const correoErr = validateCorreo(formData.correo);
        const passwordErr = validatePassword(formData.contraseña || ''); // La contraseña es requerida para crear

        setLoginError(loginErr);
        setCorreoError(correoErr);
        setPasswordError(passwordErr);

        if (loginErr || correoErr || passwordErr) {
            toast.error('Por favor, corrige los errores en el formulario.');
            setLoading(false);
            return;
        }

        try {
            const token = getToken();
            if (!token) {
                setGeneralError('No autenticado.');
                toast.error('No autenticado.');
                setLoading(false);
                return;
            }
            // --- 5. handleCreateUser: Envía el campo 'activo' ---
            await axios.post(`${API_BASE_URL}/users/create`, {
                login: formData.login,
                correo: formData.correo,
                id_rol: formData.id_rol,
                contraseña: formData.contraseña,
                activo: formData.activo, // Envía el estado activo
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Usuario creado exitosamente.');
            setFormData({ // Restablece el formulario a valores iniciales
                login: '',
                correo: '',
                id_rol: roles.length > 0 ? roles[0].id : 0,
                contraseña: '',
                newPassword: '',
                activo: true, // Restablece activo a true por defecto
            });
            fetchUsers(); // Refresh the user list
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                setGeneralError(err.response.data.error || 'Error al crear usuario.');
                toast.error(err.response.data.error || 'Error al crear usuario.');
            } else {
                setGeneralError('Error de red o desconocido al crear usuario.');
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
            contraseña: '', // Las contraseñas nunca deben rellenarse
            newPassword: '',
            activo: user.activo, // Carga el estado actual del usuario
        });
        // Limpiar errores al iniciar la edición
        setLoginError(null);
        setCorreoError(null);
        setPasswordError(null);
        setNewPasswordError(null);
        setGeneralError(null);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setGeneralError(null);
        setLoginError(null); // El login no se edita, pero lo limpiamos por si acaso
        setCorreoError(null);
        setNewPasswordError(null);


        if (!currentEditingUser) {
            toast.error('No hay usuario seleccionado para actualizar.');
            setLoading(false);
            return;
        };

        const updateData: Partial<UserFormData> = {};
        let hasChanges = false;
        let isValid = true;

        // Validar correo si ha cambiado
        if (formData.correo !== currentEditingUser.correo) {
            const correoErr = validateCorreo(formData.correo);
            setCorreoError(correoErr);
            if (correoErr) isValid = false;
            else {
                updateData.correo = formData.correo;
                hasChanges = true;
            }
        }

        // Validar y agregar rol si ha cambiado
        if (formData.id_rol !== currentEditingUser.id_rol) {
            updateData.id_rol = formData.id_rol;
            hasChanges = true;
        }

        // Validar nueva contraseña si se ha proporcionado
        if (formData.newPassword) {
            const newPasswordErr = validatePassword(formData.newPassword);
            setNewPasswordError(newPasswordErr);
            if (newPasswordErr) isValid = false;
            else {
                updateData.newPassword = formData.newPassword; // Enviar como newPassword al backend
                hasChanges = true;
            }
        }

        // --- 5. handleUpdateUser: Compara y envía el campo 'activo' ---
        if (formData.activo !== currentEditingUser.activo) {
            updateData.activo = formData.activo;
            hasChanges = true;
        }


        if (!isValid) {
            toast.error('Por favor, corrige los errores en el formulario.');
            setLoading(false);
            return;
        }

        if (!hasChanges) {
            toast.info('No hay cambios para actualizar.');
            setLoading(false);
            return;
        }

        try {
            const token = getToken();
            if (!token) {
                setGeneralError('No autenticado.');
                toast.error('No autenticado.');
                setLoading(false);
                return;
            }
            // Ajusta la propiedad de la contraseña según lo que espera tu backend (contraseña o newPassword)
            const payload = {
  ...updateData
};


            await axios.put(`${API_BASE_URL}/users/${currentEditingUser.login}`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Usuario actualizado exitosamente.');
            setIsEditing(false);
            setCurrentEditingUser(null);
            setFormData({ login: '', correo: '', id_rol: roles.length > 0 ? roles[0].id : 0, contraseña: '', newPassword: '', activo: true });
            fetchUsers(); // Refresh the user list
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                setGeneralError(err.response.data.error || 'Error al actualizar usuario.');
                toast.error(err.response.data.error || 'Error al actualizar usuario.');
            } else {
                setGeneralError('Error de red o desconocido al actualizar usuario.');
                toast.error('Error de red o desconocido al actualizar usuario.');
            }
        } finally {
            setLoading(false);
        }
    };

    // --- Nueva función para cambiar el estado (activar/desactivar) de un usuario ---
    const handleChangeUserStatus = async (userLogin: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        const action = newStatus ? 'activar' : 'desactivar';
        const confirmationMessage = `¿Estás seguro de que quieres ${action} al usuario ${userLogin}?`;

        // Utiliza una promesa para manejar la confirmación con Toastify
        const confirmAction = () => {
            return new Promise<void>((resolve, reject) => {
                toast.info(
                    ({ toastProps }) => (
                        <ConfirmationToast
                            message={confirmationMessage}
                            onConfirm={resolve}
                            onCancel={reject}
                            toastId={toastProps.toastId}
                        />
                    ),
                    {
                        autoClose: false, // El toast no se cierra automáticamente
                        closeButton: false, // No muestra el botón de cerrar predeterminado
                        draggable: false, // Evita que se pueda arrastrar
                        closeOnClick: false, // Evita que se cierre al hacer clic fuera
                    }
                );
            });
        };

        try {
            await confirmAction(); // Espera a que el usuario confirme o cancele en el toast

            setLoading(true);
            setGeneralError(null);
            const token = getToken();
            if (!token) {
                setGeneralError('No autenticado.');
                toast.error('No autenticado.');
                setLoading(false);
                return;
            }
            await axios.put(`${API_BASE_URL}/users/${userLogin}/toggle-status`, { activo: newStatus ? 1 : 0 }, { // Envía 1 o 0
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success(`Usuario ${userLogin} ${action} exitosamente.`);
            fetchUsers(); // Actualizar la lista de usuarios
        } catch (err) {
            // Si el error es una cancelación del toast (reject de la promesa), no muestres un toast de error.
            if (err === 'cancel') {
                toast.info('Cambio de estado cancelado.');
                return;
            }
            if (axios.isAxiosError(err) && err.response) {
                setGeneralError(err.response.data.error || `Error al ${action} usuario.`);
                toast.error(err.response.data.error || `Error al ${action} usuario.`);
            } else {
                setGeneralError(`Error de red o desconocido al ${action} usuario.`);
                toast.error(`Error de red o desconocido al ${action} usuario.`);
            }
        } finally {
            setLoading(false);
        }
    };


    const handleDeleteUser = async (loginToDelete: string) => {
        const confirmationMessage = `¿Estás seguro de que quieres eliminar al usuario ${loginToDelete}? Esta acción es irreversible.`;

        const confirmAction = () => {
            return new Promise<void>((resolve, reject) => {
                toast.warn(
                    ({ toastProps }) => (
                        <ConfirmationToast
                            message={confirmationMessage}
                            onConfirm={resolve}
                            onCancel={reject}
                            toastId={toastProps.toastId}
                        />
                    ),
                    {
                        autoClose: false,
                        closeButton: false,
                        draggable: false,
                        closeOnClick: false,
                    }
                );
            });
        };

        try {
            await confirmAction();

            setLoading(true);
            setGeneralError(null);
            const token = getToken();
            if (!token) {
                setGeneralError('No autenticado.');
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
            if (err === 'cancel') {
                toast.info('Eliminación de usuario cancelada.');
                return;
            }
            if (axios.isAxiosError(err) && err.response) {
                setGeneralError(err.response.data.error || 'Error al eliminar usuario.');
                toast.error(err.response.data.error || 'Error al eliminar usuario.');
            } else {
                setGeneralError('Error de red o desconocido al eliminar usuario.');
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

            {generalError && <p className="text-red-500 text-center mb-4">{generalError}</p>}
            {loading && <p className="text-gray-600 dark:text-gray-400 text-center mb-4">Cargando usuarios...</p>}

            {/* Formulario de Creación/Edición */}
            <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
  <h3 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">
    {isEditing ? `Editar Usuario: ${currentEditingUser?.login}` : 'Crear Nuevo Usuario'}
  </h3>
  <form onSubmit={isEditing ? handleUpdateUser : handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Login */}
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
        className={loginError ? "border-error-500 focus:ring-error-500" : ""}
      />
      {loginError && <p className="mt-1 text-sm text-error-500">{loginError}</p>}
    </div>

    {/* Correo */}
    <div>
      <Label htmlFor="correo">Correo:</Label>
      <Input
        id="correo"
        name="correo"
        type="email"
        placeholder="correo@ejemplo.com"
        value={formData.correo}
        onChange={handleInputChange}
        className={correoError ? "border-error-500 focus:ring-error-500" : ""}
      />
      {correoError && <p className="mt-1 text-sm text-error-500">{correoError}</p>}
    </div>

    {/* Rol */}
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

    {/* Checkbox activo */}
    <div className="flex items-center mt-6">
      <Input
        id="activo"
        name="activo"
        type="checkbox"
        checked={formData.activo}
        onChange={handleInputChange}
        className="mr-2 h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
      />
      <Label htmlFor="activo" className="text-gray-700 dark:text-white">Usuario Activo</Label>
    </div>

    {/* Contraseña / Nueva Contraseña */}
    <div className="md:col-span-2">
      <Label htmlFor={isEditing ? "newPassword" : "contraseña"}>
        {isEditing ? "Nueva Contraseña (opcional):" : "Contraseña:"}
      </Label>
      <Input
        id={isEditing ? "newPassword" : "contraseña"}
        name={isEditing ? "newPassword" : "contraseña"}
        type="password"
        placeholder={isEditing ? "Deja vacío para no cambiar" : "Contraseña"}
        value={isEditing ? formData.newPassword : formData.contraseña}
        onChange={handleInputChange}
        className={(isEditing ? newPasswordError : passwordError) ? "border-error-500 focus:ring-error-500" : ""}
      />
      {/* Lista de validaciones */}
      {/* Validación visual de requisitos de contraseña */}
{(formData.contraseña || formData.newPassword) && (
  <div className="mt-3 col-span-1 md:col-span-2">
    <ul className="list-none text-sm space-y-1">
      {(() => {
        const currentPassword = (isEditing ? formData.newPassword : formData.contraseña) || '';
        const validations = [
          { label: "Mínimo 8 caracteres", valid: currentPassword.length >= 8 },
          { label: "Al menos una mayúscula", valid: /[A-Z]/.test(currentPassword) },
          { label: "Al menos una minúscula", valid: /[a-z]/.test(currentPassword) },
          { label: "Al menos un número", valid: /\d/.test(currentPassword) },
          { label: "Carácter especial (!@#$...)", valid: /[!@#$%^&*(),.?":{}|<>]/.test(currentPassword) },
          { label: "Sin secuencias comunes", valid: !['123456', 'abcdef', 'qwerty'].some(seq => currentPassword.toLowerCase().includes(seq)) },
          { label: "Sin más de 3 repeticiones", valid: !/(\w)\1{3,}/.test(currentPassword) },
          { label: "Sin solo símbolos", valid: !/^[!@#$%^&*()_+\-=\\[\]{};':"|,.<>/?]{6,}$/.test(currentPassword) },
          { label: "Sin espacios", valid: !/\s/.test(currentPassword) },
        ];
        return validations.map(({ label, valid }, i) => (
          <li key={i} className={`flex items-center ${valid ? 'text-green-600' : 'text-gray-500'}`}>
            <span className="mr-2">{valid ? '✔' : '✖'}</span>{label}
          </li>
        ));
      })()}
    </ul>
  </div>
)}

      {(isEditing && newPasswordError) && <p className="mt-1 text-sm text-error-500">{newPasswordError}</p>}
      {(!isEditing && passwordError) && <p className="mt-1 text-sm text-error-500">{passwordError}</p>}
    </div>

    {/* Botones */}
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
            setFormData({ login: '', correo: '', id_rol: roles.length > 0 ? roles[0].id : 0, contraseña: '', newPassword: '', activo: true });
            setLoginError(null);
            setCorreoError(null);
            setPasswordError(null);
            setNewPasswordError(null);
            setGeneralError(null);
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
    <th className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-left text-sm font-medium">Estado</th>
    <th className="py-3 px-4 border-b border-gray-200 dark:border-gray-600 text-center text-sm font-medium">Acciones</th>
  </tr>
</thead>

                    <tbody>
  {users.length === 0 && !loading && !generalError && (
    <tr>
      <td colSpan={5} className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
        No hay usuarios para mostrar.
      </td>
    </tr>
  )}

  {users.map((user) => (
    <tr
      key={user.login}
      className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <td className="py-3 px-4 text-gray-800 dark:text-white">{user.login}</td>
      <td className="py-3 px-4 text-gray-800 dark:text-white">{user.correo}</td>
      <td className="py-3 px-4 text-gray-800 dark:text-white">
        {roles.find((r) => r.id === user.id_rol)?.rol || 'Desconocido'}
      </td>
      <td className="py-3 px-4 text-left">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {user.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="py-3 px-4 text-center whitespace-nowrap">
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
          variant={user.activo ? 'secondary' : 'success'}
          className={`mr-2 ${
            user.activo
              ? 'bg-yellow-500 hover:bg-yellow-600'
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
          onClick={() => handleChangeUserStatus(user.login, user.activo)}
        >
          {user.activo ? 'Desactivar' : 'Activar'}
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
  ))}
</tbody>

                </table>
            </div>
        </div>
    );
};

export default UserManagement;