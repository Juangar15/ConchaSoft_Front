import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';

// --- Importaciones de Material-UI (MUI) ---
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SecurityIcon from '@mui/icons-material/Security';
import AddIcon from "@mui/icons-material/Add";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Pagination from '@mui/material/Pagination';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

// --- Importaciones de Contexto y UI Personalizada ---
import { useAuth } from '../../context/authContext';
import Modal from "../ui/modal/Modal"; // Usado para el modal de detalle

// --- Interfaces ---
interface Rol {
  id: number;
  rol: string;
  descripcion: string;
  estado: boolean;
}

// --- URLs de API ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com';
const API_ROLES_URL = `${API_BASE_URL}/api/roles`;

export default function RolesTable() {
    // --- ESTADOS ---
    const [allRoles, setAllRoles] = useState<Rol[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [rolEditandoId, setRolEditandoId] = useState<number | null>(null);
    const [nuevoRol, setNuevoRol] = useState<Omit<Rol, "id">>({
        rol: "",
        descripcion: "",
        estado: true,
    });

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [rolAEliminar, setRolAEliminar] = useState<Rol | null>(null);

    const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
    const [detalleActual, setDetalleActual] = useState<Rol | null>(null);

    const { token, logout } = useAuth();
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // --- LÓGICA DE DATOS ---
    const getAuthHeaders = useCallback(() => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }), [token]);

    const fetchRoles = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_ROLES_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    toast.error("Sesión expirada. Inicia sesión de nuevo.");
                    logout();
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const data: Rol[] | { roles: Rol[] } = await response.json();
            // La API puede devolver { roles: [...] } o [...] directamente.
            const rolesList = 'roles' in data ? data.roles : data;
            setAllRoles(rolesList);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(`No se pudieron cargar los roles: ${errorMessage}`);
            toast.error(`Error al cargar roles: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, [token, logout]);

    useEffect(() => {
        if (token) {
            fetchRoles();
        }
    }, [token, fetchRoles]);

    const { currentTableData, totalPages, totalItems } = useMemo(() => {
        let filteredData = allRoles;
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredData = allRoles.filter(r =>
                r.rol.toLowerCase().includes(lowercasedFilter) ||
                r.descripcion.toLowerCase().includes(lowercasedFilter)
            );
        }
        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        return { currentTableData: paginatedData, totalPages, totalItems };
    }, [allRoles, searchTerm, currentPage, itemsPerPage]);

    // --- MANEJADOR DE ACCIONES CRUD GENÉRICO ---
    const handleAction = async (action: () => Promise<void>, successMessage: string, errorMessage: string) => {
        if (!token) return toast.error("No autenticado.");
        try {
            await action();
            toast.success(successMessage);
            await fetchRoles(); // Refrescar datos
        } catch (err: unknown) {
            const apiError = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
            toast.error(`${errorMessage}: ${apiError}`);
            if (err && typeof err === 'object' && 'status' in err && (err.status === 401 || err.status === 403)) logout();
        }
    };
    
    const guardarRol = () => {
        if (!nuevoRol.rol.trim() || !nuevoRol.descripcion.trim()) {
            return toast.error("El nombre y la descripción son obligatorios.");
        }

        const isEditing = modoEdicion && rolEditandoId !== null;
        const apiCall = async () => {
            const url = isEditing ? `${API_ROLES_URL}/${rolEditandoId}` : API_ROLES_URL;
            const method = isEditing ? 'PUT' : 'POST';
            
            const payload = isEditing ? nuevoRol : { ...nuevoRol, estado: true };

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Error ${response.status}`);
            }
        };

        handleAction(
            apiCall,
            `Rol ${isEditing ? 'actualizado' : 'creado'} correctamente.`,
            `Error al ${isEditing ? 'actualizar' : 'crear'} rol`
        ).finally(() => cerrarModal());
    };

    const confirmarEliminacion = () => {
        if (!rolAEliminar) return;
        const apiCall = async () => {
            const response = await fetch(`${API_ROLES_URL}/${rolAEliminar.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Error ${response.status}`);
            }
        };
        handleAction(apiCall, "Rol eliminado.", "Error al eliminar.")
            .finally(() => {
                setConfirmDialogOpen(false);
                setRolAEliminar(null);
            });
    };

    const toggleEstado = (rol: Rol) => {
        if (rol.rol === "Administrador") {
            toast.warn("El estado del rol 'Administrador' no se puede cambiar.");
            return;
        }
        const apiCall = async () => {
            const response = await fetch(`${API_ROLES_URL}/${rol.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ...rol, estado: !rol.estado })
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Error ${response.status}`);
            }
        };
        handleAction(apiCall, "Estado del rol actualizado.", "Error al cambiar estado.");
    };

    // --- MANEJADORES DE UI ---
    const abrirModalAgregar = () => {
        setModoEdicion(false);
        setRolEditandoId(null);
        setNuevoRol({
            rol: "",
            descripcion: "",
            estado: true,
        });
        setIsModalOpen(true);
    };

    const abrirModalEditar = (rol: Rol) => {
        setModoEdicion(true);
        setRolEditandoId(rol.id);
        setNuevoRol({
            rol: rol.rol,
            descripcion: rol.descripcion,
            estado: rol.estado,
        });
        setIsModalOpen(true);
    };
    
    const cerrarModal = () => setIsModalOpen(false);
    
    const verDetalle = (rol: Rol) => {
      setDetalleActual(rol);
      setModalDetalleOpen(true);
    };

    const cerrarDetalle = () => setModalDetalleOpen(false);

    const solicitarConfirmacionEliminacion = (rol: Rol) => {
        if (rol.rol === "Administrador") {
            toast.error("El rol 'Administrador' no se puede eliminar.");
            return;
        }
        setRolAEliminar(rol);
        setConfirmDialogOpen(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setNuevoRol(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => setCurrentPage(value);
    const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };
    const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
        setItemsPerPage(Number(event.target.value));
        setCurrentPage(1);
    };
    
    if (loading && allRoles.length === 0) return <div className="p-4 text-center">Cargando roles...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between flex-wrap gap-4">
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={abrirModalAgregar}>
                    Agregar Rol
                </Button>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o descripción..."
                        value={searchTerm}
                        onChange={handleChangeSearch}
                        className="border border-gray-400 bg-white rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <FormControl sx={{ minWidth: 120 }} size="small">
                        <InputLabel>Items/pág</InputLabel>
                        <Select value={itemsPerPage} label="Items/pág" onChange={handleItemsPerPageChange}>
                            <MenuItem value={5}>5</MenuItem>
                            <MenuItem value={10}>10</MenuItem>
                            <MenuItem value={20}>20</MenuItem>
                            <MenuItem value={50}>50</MenuItem>
                        </Select>
                    </FormControl>
                </div>
            </div>

            <div className="max-w-full overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-400 dark:border-white/[0.05]">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Nombre</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Descripción</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Estado</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
                        {currentTableData.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-4">No se encontraron resultados.</td></tr>
                        ) : (
                            currentTableData.map((rol) => (
                                <tr key={rol.id}>
                                    <td className="px-5 py-4 whitespace-nowrap">{rol.rol}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">{rol.descripcion}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span onClick={() => toggleEstado(rol)} className={`cursor-pointer px-2 py-1 rounded-full text-xs font-semibold ${rol.estado ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {rol.estado ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap space-x-1">
                                        <Tooltip title="Ver Detalle"><IconButton color="info" onClick={() => verDetalle(rol)}><VisibilityIcon /></IconButton></Tooltip>
                                        <Tooltip title="Permisos"><IconButton color="secondary" onClick={() => navigate(`/roles/${rol.id}/permisos`)}><SecurityIcon /></IconButton></Tooltip>
                                        
                                        {rol.rol !== "Administrador" && (
                                            <>
                                                <Tooltip title={!rol.estado ? "El rol está inactivo" : "Editar"}>
                                                    <span>
                                                        <IconButton color="primary" onClick={() => abrirModalEditar(rol)} disabled={!rol.estado}><EditIcon /></IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title={!rol.estado ? "El rol está inactivo" : "Eliminar"}>
                                                   <span>
                                                     <IconButton color="error" onClick={() => solicitarConfirmacionEliminacion(rol)} disabled={!rol.estado}><DeleteIcon /></IconButton>
                                                   </span>
                                                </Tooltip>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-700">Mostrando {currentTableData.length} de {totalItems} roles</p>
                {totalPages > 1 && <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />}
            </div>

            <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="sm" fullWidth>
                <DialogTitle>{modoEdicion ? "Editar Rol" : "Agregar Nuevo Rol"}</DialogTitle>
                <DialogContent dividers>
                    <div className="grid grid-cols-1 gap-4 pt-2">
                        <TextField name="rol" label="Nombre del Rol" value={nuevoRol.rol} onChange={handleChange} fullWidth disabled={modoEdicion && nuevoRol.rol === 'Administrador'}/>
                        <TextField name="descripcion" label="Descripción" value={nuevoRol.descripcion} onChange={handleChange} fullWidth multiline rows={3} />
                        {modoEdicion && (
                           <FormControlLabel
                             control={<Switch checked={nuevoRol.estado} onChange={handleChange} name="estado" disabled={nuevoRol.rol === 'Administrador'} />}
                             label={nuevoRol.estado ? "Activo" : "Inactivo"}
                           />
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cerrarModal}>Cancelar</Button>
                    <Button onClick={guardarRol} variant="contained" disabled={modoEdicion && nuevoRol.rol === 'Administrador'}>{modoEdicion ? "Actualizar" : "Guardar"}</Button>
                </DialogActions>
            </Dialog>

            <Modal isOpen={modalDetalleOpen} handleClose={cerrarDetalle}>
                <h2 className="text-2xl font-bold mb-6">Detalle del Rol</h2>
                {detalleActual &&
                    <div className="space-y-4 mb-6">
                        <div><strong>Nombre del Rol:</strong> {detalleActual.rol}</div>
                        <div><strong>Descripción:</strong> {detalleActual.descripcion}</div>
                        <div><strong>Estado:</strong> {detalleActual.estado ? "Activo" : "Inactivo"}</div>
                    </div>
                }
                 <div className="mt-8 flex justify-end">
                    <Button onClick={cerrarDetalle} variant="contained">Cerrar</Button>
                </div>
            </Modal>
            
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de eliminar el rol <strong>{rolAEliminar?.rol}</strong>? Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={confirmarEliminacion} color="error">Eliminar</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

