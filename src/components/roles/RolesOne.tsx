import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
// Make sure to import react-toastify CSS in your main file (e.g., App.tsx or index.tsx)
// import 'react-toastify/dist/ReactToastify.css';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import Tooltip from '@mui/material/Tooltip';
import Modal from "../ui/modal/Modal";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Pagination from '@mui/material/Pagination';

// --- MATERIAL-UI IMPORTS ---
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';


// --- Import your useAuth hook ---
import { useAuth } from '../../context/authContext';

// Define your API base URL
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api'; // VERIFY THIS IS YOUR CORRECT BACKEND URL!

/**
 * @interface Rol
 * @description Defines the structure of a Rol object, including the new 'estado' field.
 */
interface Rol {
  id: number;
  rol: string; // Property matching the 'rol' field in your database
  descripcion: string;
  estado: boolean; // New field for role status
}

export default function RolesTable() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * @state nuevoRol
   * @description Stores data for the role being created or edited.
   * Now includes 'rol' and 'estado' according to the Rol interface.
   */
  const [nuevoRol, setNuevoRol] = useState<Rol>({
    id: 0,
    rol: "", // Initialize 'rol'
    descripcion: "",
    estado: true, // Initialize 'estado' for new roles (usually active by default)
  });

  const [modoEdicion, setModoEdicion] = useState(false);
  const [rolEditandoId, setRolEditandoId] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rolAEliminar, setRolAEliminar] = useState<Rol | null>(null);

  const { token, isAuthenticated } = useAuth();

  // --- PAGINATION AND SEARCH STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Now selectable
  const [searchTerm, setSearchTerm] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Ref for debounce timer
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  /**
   * @function fetchRoles
   * @description Fetches the list of roles from the API, applying pagination and search filters.
   * Requires authentication.
   * This function is now memoized using useCallback in practice, but directly here for simplicity
   * due to its dependencies handled by useEffect.
   */
  const fetchRoles = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      setError("No autenticado. Por favor, inicia sesión.");
      toast.info("Necesitas iniciar sesión para ver los roles.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Build query parameters for the API
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      const response = await fetch(`${API_BASE_URL}/roles?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status}` }));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data.roles)) {
        setRoles(data.roles);
      } else {
        console.warn("API returned data.roles not as an array:", data.roles);
        setRoles([]); // Set to an empty array to avoid TypeError
      }

      setTotalItems(data.totalItems || 0);
      setTotalPages(data.totalPages || 1);

    } catch (err) {
      console.error("Error al cargar roles:", err);
      setError(`No se pudieron cargar los roles: ${err instanceof Error ? err.message : "Error desconocido"}`);
      toast.error(`Error al cargar los roles: ${err instanceof Error ? err.message : "Error desconocido"}`);
      setRoles([]); // Ensure 'roles' is an empty array in case of fetch error
    } finally {
      setLoading(false);
    }
  };

  // --- Main useEffect for fetching data based on pagination/itemsPerPage ---
  useEffect(() => {
    fetchRoles();
    // Cleanup function for when component unmounts or dependencies change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isAuthenticated, token, currentPage, itemsPerPage]); // searchTerm is NOT a dependency here

  // --- New useEffect for debounced search term ---
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Only call fetchRoles if the component is still mounted and search term changed
      // We explicitly call fetchRoles here, it will use the current searchTerm from state
      // The currentPage will be reset in handleSearchChange if the search term is non-empty.
      // If searchTerm becomes empty, fetchRoles will naturally run without the search filter.
      if (currentPage !== 1 && searchTerm !== "") { // If search term is active and not on page 1, reset page
          setCurrentPage(1); // This will trigger the main useEffect -> fetchRoles
      } else {
          fetchRoles(); // Otherwise, just refetch with current page and new search term
      }

    }, 500); // Debounce delay in milliseconds

    // Cleanup for this specific effect
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]); // This useEffect ONLY reacts to searchTerm changes


  // --- PAGINATION AND SEARCH HANDLERS ---
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Setting searchTerm will trigger the NEW useEffect for debounce
    // No explicit fetchRoles call here, the useEffect handles it.
  };

  const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1); // Important: Reset to the first page when changing items count
  };


  /**
   * @function toggleEstado
   * @description Changes the state (active/inactivo) of a role.
   * Sends the full role object with the modified state to the backend.
   */
  const toggleEstado = async (id: number, currentEstado: boolean) => {
    if (!isAuthenticated || !token) {
      toast.error("No estás autorizado para cambiar el estado del rol.");
      return;
    }
    try {
      const rolToUpdate = roles.find(rol => rol.id === id);
      if (!rolToUpdate) {
        toast.error("Rol no encontrado para actualizar su estado.");
        return;
      }

      const updatedPayload = {
        rol: rolToUpdate.rol,
        descripcion: rolToUpdate.descripcion,
        estado: !currentEstado,
      };

      const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status}` }));
        throw new Error(errorData.message || `Error al cambiar estado: ${response.status}`);
      }

      setRoles((prev) =>
        prev.map((rol) =>
          rol.id === id ? { ...rol, estado: !rol.estado } : rol
        )
      );
      toast.success("Estado del rol actualizado correctamente.");
    } catch (err) {
      console.error("Error al cambiar el estado del rol:", err);
      toast.error(`Error al cambiar el estado del rol: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  };

  /**
   * @function abrirModal
   * @description Opens the modal to add a new role.
   * Resets 'nuevoRol' state to default values.
   */
  const abrirModal = () => {
    setNuevoRol({ id: 0, rol: "", descripcion: "", estado: true });
    setModoEdicion(false);
    setRolEditandoId(null);
    setIsModalOpen(true);
  };

  /**
   * @function abrirModalEditar
   * @description Opens the modal to edit an existing role.
   * Loads selected role data into 'nuevoRol' state.
   */
  const abrirModalEditar = (rolData: Rol) => {
    setNuevoRol({
      id: rolData.id,
      rol: rolData.rol,
      descripcion: rolData.descripcion,
      estado: rolData.estado,
    });
    setModoEdicion(true);
    setRolEditandoId(rolData.id);
    setIsModalOpen(true);
  };

  /**
   * @function cerrarModal
   * @description Closes the modal and resets 'nuevoRol' state.
   */
  const cerrarModal = () => {
    setIsModalOpen(false);
    setNuevoRol({ id: 0, rol: "", descripcion: "", estado: true });
    setModoEdicion(false);
    setRolEditandoId(null);
  };

  /**
   * @function handleChange
   * @description Handles changes in modal form inputs.
   * Adapted to handle checkboxes (the 'estado' field).
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setNuevoRol((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /**
   * @function guardarRol
   * @description Saves (creates or updates) a role in the API.
   * Sends the 'payload' with 'rol', 'descripcion' and 'estado' properties.
   */
  const guardarRol = async () => {
    if (!nuevoRol.rol.trim()) {
      toast.warn("El nombre del rol no puede estar vacío.");
      return;
    }
    if (!isAuthenticated || !token) {
      toast.error("No estás autorizado para guardar roles.");
      return;
    }

    try {
      let method: string;
      let url: string;
      let successMessage: string;

      const payload = {
        rol: nuevoRol.rol,
        descripcion: nuevoRol.descripcion,
        estado: nuevoRol.estado,
      };

      if (modoEdicion && rolEditandoId !== null) {
        method = 'PUT';
        url = `${API_BASE_URL}/roles/${rolEditandoId}`;
        successMessage = "Rol actualizado correctamente.";
      } else {
        method = 'POST';
        url = `${API_BASE_URL}/roles`;
        successMessage = "Rol creado correctamente.";
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status}` }));
        throw new Error(errorData.message || `Error al guardar rol: ${response.status}`);
      }

      await fetchRoles();
      toast.success(successMessage);
      cerrarModal();
    } catch (err) {
      console.error("Error al guardar el rol:", err);
      toast.error(`Error al guardar el rol: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  };

  /**
   * @function solicitarConfirmacionEliminacion
   * @description Opens the confirmation dialog before deleting a role.
   */
  const solicitarConfirmacionEliminacion = (rol: Rol) => {
    setRolAEliminar(rol);
    setConfirmDialogOpen(true);
  };

  /**
   * @function confirmarEliminacion
   * @description Confirms and deletes a role from the API.
   */
  const confirmarEliminacion = async () => {
    if (!isAuthenticated || !token) {
      toast.error("No estás autorizado para eliminar roles.");
      setConfirmDialogOpen(false);
      return;
    }

    if (rolAEliminar) {
      try {
        const response = await fetch(`${API_BASE_URL}/roles/${rolAEliminar.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status}` }));
          throw new Error(errorData.message || `Error al eliminar rol: ${response.status}`);
        }

        await fetchRoles();
        toast.success("Rol eliminado correctamente.");
      } catch (err) {
        console.error("Error al eliminar el rol:", err);
        toast.error(`Error al eliminar el rol: ${err instanceof Error ? err.message : "Error desconocido"}`);
      } finally {
        setConfirmDialogOpen(false);
        setRolAEliminar(null);
      }
    }
  };

  // --- Component Rendering ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-gray-600 dark:text-gray-300">Cargando roles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    );
  }

  // Defensive check for `roles` array
  if (!Array.isArray(roles)) {
    console.error("Critical error: 'roles' is not an array at render time.", roles);
    return (
        <div className="flex justify-center items-center h-48">
            <p className="text-red-600 dark:text-red-400">
                Error interno: Los datos de roles no son válidos. Por favor, contacta a soporte.
            </p>
        </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4 flex flex-col sm:flex-row items-center justify-end flex-wrap gap-4">
        {/* Button to add a new role - positioned to the left if space allows */}
        <div className="mr-auto">
            <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={abrirModal}
            sx={{ textTransform: 'none' }}
            >
            Agregar Rol
            </Button>
        </div>

        {/* Search Input and Items Per Page Select - Grouped to the right */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <input
            type="text"
            placeholder="Buscar rol por nombre, descripción o estado..."
            value={searchTerm}
            onChange={handleChangeSearch}
            className="border border-gray-400 bg-white rounded px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            />

            {/* CONTROL FOR ITEMS PER PAGE */}
            <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel id="items-per-page-label">Elementos</InputLabel>
            <Select
                labelId="items-per-page-label"
                id="items-per-page-select"
                value={itemsPerPage}
                label="Elementos"
                onChange={handleItemsPerPageChange}
                sx={{
                color: 'black',
                '.MuiOutlinedInput-notchedOutline': {
                    borderColor: 'gray',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--brand-500)',
                },
                '.MuiSvgIcon-root': {
                    color: 'black',
                },
                '.MuiInputLabel-root': {
                    color: 'black',
                },
                '.MuiInputLabel-root.Mui-focused': {
                    color: 'var(--brand-500)',
                },
                }}
            >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
            </Select>
            </FormControl>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-400 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Nombre
              </TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Descripción
              </TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Estado
              </TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-gray-600 dark:text-gray-400">
                  No hay roles disponibles.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((rol) => (
                <TableRow key={rol.id}>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    {rol.rol}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    {rol.descripcion}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => rol.rol !== "Administrador" && toggleEstado(rol.id, rol.estado)}
                        disabled={rol.rol === "Administrador"}
                        className={`w-10 h-5 rounded-full transition-all duration-300 relative ${
                          rol.estado || rol.rol === "Administrador"
                            ? "bg-green-500"
                            : "bg-gray-400 dark:bg-gray-600"
                        } ${rol.rol === "Administrador" ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                            rol.estado || rol.rol === "Administrador"
                              ? "translate-x-5 left-0"
                              : "translate-x-0 left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 space-x-2">
                    {rol.rol !== "Administrador" && (
                      <>
                        <Tooltip title="Editar">
                          <IconButton
                            color="primary"
                            onClick={() => abrirModalEditar(rol)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            color="error"
                            onClick={() => solicitarConfirmacionEliminacion(rol)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Permisos">
                      <IconButton
                        color="secondary"
                        onClick={() => navigate(`/roles/${rol.id}/permisos`)}
                      >
                        <SecurityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(totalPages > 1 || totalItems > 0) && (
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {totalItems > 0 && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando {roles.length} de {totalItems} roles
              </p>
            )}
          </div>

          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
              sx={{
                '& .MuiPaginationItem-root': {
                  color: 'black',
                  '&.Mui-selected': {
                    backgroundColor: 'var(--brand-500)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'var(--brand-600)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                },
                '.MuiPaginationItem-ellipsis': {
                  color: 'black',
                },
                '.MuiSvgIcon-root': {
                  color: 'black',
                },
                '.MuiButtonBase-root.Mui-disabled': {
                  opacity: 0.5,
                  pointerEvents: 'none',
                },
              }}
            />
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} handleClose={cerrarModal}>
        <h2 className="text-lg font-bold mb-4">
          {modoEdicion ? "Editar rol" : "Agregar nuevo rol"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre <span className="text-error-500">*</span>
            </label>
            <input
              name="rol"
              type="text"
              value={nuevoRol.rol}
              onChange={handleChange}
              className="w-full border border-gray-400 bg-gray-200 px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Descripción <span className="text-error-500">*</span>
            </label>
            <textarea
              name="descripcion"
              value={nuevoRol.descripcion}
              onChange={handleChange}
              className="w-full border border-gray-400 bg-gray-200 px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
            />
          </div>
          {modoEdicion && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Estado
              </label>
              <input
                type="checkbox"
                name="estado"
                checked={nuevoRol.estado}
                onChange={handleChange}
                className="form-checkbox h-5 w-5 text-green-600"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {nuevoRol.estado ? "Activo" : "Inactivo"}
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={cerrarModal}
              className="px-4 py-2 bg-gray-500 text-white rounded dark:bg-gray-500 dark:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={guardarRol}
              className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
            >
              {modoEdicion ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </div>
      </Modal>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="bg-red-500 text-white font-bold text-xl">
          <div className="flex items-center">
            <DeleteIcon className="mr-2" />
            Confirmar eliminación
          </div>
        </DialogTitle>
        <DialogContent className="bg-gray-100">
          <DialogContentText className="text-lg text-gray-700">
            ¿Estás seguro de que deseas eliminar el rol{' '}
            <strong className="font-semibold text-red-600">{rolAEliminar?.rol}</strong>? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions className="bg-gray-50 p-4">
          <Tooltip title="Cancelar">
            <IconButton
              onClick={() => setConfirmDialogOpen(false)}
              color="default"
              className="hover:bg-gray-200 rounded-full"
            >
              <CancelIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              onClick={confirmarEliminacion}
              color="error"
              variant="contained"
              startIcon={<DeleteIcon />}
              className="capitalize font-medium hover:bg-red-600"
            >
              Eliminar
            </Button>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </div>
  );
}