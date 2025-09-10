import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from 'react-toastify';

// --- Importaciones de Material-UI (MUI) ---
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from '@mui/icons-material/Edit';

import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Pagination from '@mui/material/Pagination';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

// --- Importaciones de Contexto y UI Personalizada ---
import { useAuth } from "../../context/authContext";
import Modal from "../ui/modal/Modal";

// --- Interfaces ---
interface Proveedor {
    id: number;
    tipo_proveedor: 'persona_natural' | 'empresa';
    nombre_comercial: string;
    razon_social: string | null;
    nombre_contacto: string | null;
    tipo_documento: string;
    documento: string;
    correo: string;
    telefono: string;
    direccion: string;
    departamento: string;
    municipio: string;
    barrio: string | null;
    estado: 0 | 1;
}

// Interfaces adaptadas para la nueva API (api-colombia.com)
interface Departamento {
    id: number;
    name: string;
}

interface Municipio {
    id: number;
    name: string;
}

// --- URLs de API ---
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api/proveedores';
// Se usan las URLs de api-colombia.com
const API_COLOMBIA_DEPARTMENTS_URL = 'https://api-colombia.com/api/v1/Department';
const API_COLOMBIA_CITIES_BASE_URL = 'https://api-colombia.com/api/v1/Department';

export default function ProveedoresTable() {
    // --- ESTADOS ---
    const [allProveedores, setAllProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [proveedorEditandoId, setProveedorEditandoId] = useState<number | null>(null);
    const [nuevoProveedor, setNuevoProveedor] = useState<Omit<Proveedor, 'id' | 'estado'>>({
        tipo_proveedor: 'persona_natural',
        nombre_comercial: "",
        razon_social: null,
        nombre_contacto: null,
        tipo_documento: "CC",
        documento: "",
        correo: "",
        telefono: "",
        direccion: "",
        departamento: "",
        municipio: "",
        barrio: null,
    });

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [proveedorAEliminar, setProveedorAEliminar] = useState<Proveedor | null>(null);

    const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
    const [detalleActual, setDetalleActual] = useState<Proveedor | null>(null);

    const { token, logout } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Estados para manejar departamentos y municipios con la nueva API
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [municipios, setMunicipios] = useState<Municipio[]>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
    const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
    const [loadingMunicipios, setLoadingMunicipios] = useState(false);

    // Estado para la validación del correo electrónico
    const [emailError, setEmailError] = useState<string | null>(null);

    // --- LÓGICA DE DATOS ---
    const fetchProveedores = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_BASE_URL, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    toast.error("Sesión expirada. Inicia sesión de nuevo.");
                    logout();
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const data: Proveedor[] = await response.json();
            setAllProveedores(data);
        } catch (err: any) {
            setError(`No se pudieron cargar los proveedores: ${err.message}`);
            toast.error(`Error al cargar proveedores: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [token, logout]);

    const fetchDepartamentos = useCallback(async () => {
        setLoadingDepartamentos(true);
        try {
            const response = await fetch(API_COLOMBIA_DEPARTMENTS_URL);
            if (!response.ok) throw new Error('Error al cargar departamentos');
            const data: Departamento[] = await response.json();
            setDepartamentos(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error: any) {
            toast.error(`Error al cargar departamentos: ${error.message}`);
        } finally {
            setLoadingDepartamentos(false);
        }
    }, []);

    const fetchMunicipios = useCallback(async (departmentId: number) => {
        setLoadingMunicipios(true);
        setMunicipios([]);
        try {
            const url = `${API_COLOMBIA_CITIES_BASE_URL}/${departmentId}/cities`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error al cargar municipios`);
            const data: Municipio[] = await response.json();
            setMunicipios(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error: any) {
            toast.error(`Error al cargar municipios: ${error.message}`);
        } finally {
            setLoadingMunicipios(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchProveedores();
            fetchDepartamentos();
        }
    }, [token, fetchProveedores, fetchDepartamentos]);

    useEffect(() => {
        if (selectedDepartmentId) {
            fetchMunicipios(selectedDepartmentId);
        } else {
            setMunicipios([]);
        }
    }, [selectedDepartmentId, fetchMunicipios]);

    const { currentTableData, totalPages, totalItems } = useMemo(() => {
        let filteredData = allProveedores;
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredData = allProveedores.filter(p =>
                p.nombre_comercial.toLowerCase().includes(lowercasedFilter) ||
                (p.razon_social && p.razon_social.toLowerCase().includes(lowercasedFilter)) ||
                p.documento.toLowerCase().includes(lowercasedFilter) ||
                p.correo.toLowerCase().includes(lowercasedFilter)
            );
        }
        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        return { currentTableData: paginatedData, totalPages, totalItems };
    }, [allProveedores, searchTerm, currentPage, itemsPerPage]);

    // --- MANEJADORES DE EVENTOS Y ACCIONES CRUD ---

    // Email validation function
    const validateEmail = (email: string): boolean => {
        // Regex for email validation (basic, allows common domains)
        const emailRegex = /^[^\s@]+@[^\s@]+\.(com|co|org|net|gov|edu|info|biz|io|xyz)$/i;
        return emailRegex.test(email);
    };

    const handleAction = async (action: () => Promise<any>, successMessage: string, errorMessage: string) => {
        if (!token) return toast.error("No autenticado.");
        try {
            await action();
            toast.success(successMessage);
            await fetchProveedores();
        } catch (err: any) {
            toast.error(`${errorMessage}: ${err.message}`);
            if (err.status === 401 || err.status === 403) logout();
        }
    };

    const guardarProveedor = () => {
        // Validate email before saving
        if (!validateEmail(nuevoProveedor.correo)) {
            setEmailError("El correo electrónico no es válido. Debe contener '@' y un dominio válido (ej: .com, .co).");
            return;
        } else {
            setEmailError(null);
        }

        const isEditing = modoEdicion && proveedorEditandoId !== null;
        const apiCall = async () => {
            const url = isEditing ? `${API_BASE_URL}/${proveedorEditandoId}` : API_BASE_URL;
            const method = isEditing ? 'PUT' : 'POST';
            const payload = isEditing ? nuevoProveedor : { ...nuevoProveedor, estado: 1 };
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}`);
            }
        };
        handleAction(
            apiCall,
            `Proveedor ${isEditing ? 'actualizado' : 'creado'} correctamente.`,
            `Error al ${isEditing ? 'actualizar' : 'crear'} proveedor`
        ).finally(() => cerrarModal());
    };

    const confirmarEliminacion = () => {
        if (!proveedorAEliminar) return;
        const apiCall = async () => {
            const response = await fetch(`${API_BASE_URL}/${proveedorAEliminar.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}`);
            }
        };
        handleAction(apiCall, "Proveedor eliminado.", "Error al eliminar.")
            .finally(() => {
                setConfirmDialogOpen(false);
                setProveedorAEliminar(null);
            });
    };

    const toggleEstado = (proveedor: Proveedor) => {
        const apiCall = async () => {
            const response = await fetch(`${API_BASE_URL}/${proveedor.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ estado: proveedor.estado === 1 ? 0 : 1 })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}`);
            }
        };
        handleAction(apiCall, "Estado actualizado.", "Error al cambiar estado.");
    };

    // --- MANEJADORES DE UI (MODALES, PAGINACIÓN, ETC.) ---
    const abrirModalAgregar = () => {
        setModoEdicion(false);
        setProveedorEditandoId(null);
        setNuevoProveedor({
            tipo_proveedor: 'persona_natural',
            nombre_comercial: "",
            razon_social: null,
            nombre_contacto: null,
            tipo_documento: "CC",
            documento: "",
            correo: "",
            telefono: "",
            direccion: "",
            departamento: "",
            municipio: "",
            barrio: null,
        });
        setSelectedDepartmentId(null);
        setMunicipios([]);
        setEmailError(null); // Clear email error when opening for add
        setIsModalOpen(true);
    };

    const abrirModalEditar = (proveedor: Proveedor) => {
        setModoEdicion(true);
        setProveedorEditandoId(proveedor.id);
        setNuevoProveedor({
            tipo_proveedor: proveedor.tipo_proveedor,
            nombre_comercial: proveedor.nombre_comercial,
            razon_social: proveedor.razon_social,
            nombre_contacto: proveedor.nombre_contacto,
            tipo_documento: proveedor.tipo_documento,
            documento: proveedor.documento,
            correo: proveedor.correo,
            telefono: proveedor.telefono,
            direccion: proveedor.direccion,
            departamento: proveedor.departamento,
            municipio: proveedor.municipio,
            barrio: proveedor.barrio,
        });
        const deptoEncontrado = departamentos.find(d => d.name === proveedor.departamento);
        if (deptoEncontrado) {
            setSelectedDepartmentId(deptoEncontrado.id);
        } else {
            setSelectedDepartmentId(null);
        }
        setEmailError(null); // Clear email error when opening for edit
        setIsModalOpen(true);
    };

    const cerrarModal = () => setIsModalOpen(false);

    const verDetalle = (proveedor: Proveedor) => {
        setDetalleActual(proveedor);
        setModalDetalleOpen(true);
    };

    const cerrarDetalle = () => setModalDetalleOpen(false);

    const solicitarConfirmacionEliminacion = (proveedor: Proveedor) => {
        setProveedorAEliminar(proveedor);
        setConfirmDialogOpen(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNuevoProveedor(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'tipo_proveedor') {
                updated.razon_social = null;
                updated.nombre_contacto = null;
                updated.tipo_documento = value === 'empresa' ? 'NIT' : 'CC';
            }
            // Validate email on change
            if (name === 'correo') {
                if (!validateEmail(value) && value !== "") { // Only show error if not empty and invalid
                    setEmailError("El correo electrónico no es válido. Debe contener '@' y un dominio válido (ej: .com, .co).");
                } else {
                    setEmailError(null);
                }
            }
            return updated;
        });
    };

    const handleSelectChange = (e: SelectChangeEvent<any>) => {
        const { name, value } = e.target;
        if (name === 'departamento') {
            const selectedDepto = departamentos.find(d => d.name === value);
            setSelectedDepartmentId(selectedDepto ? selectedDepto.id : null);
            setNuevoProveedor(prev => ({ ...prev, departamento: value, municipio: "" }));
        } else {
            setNuevoProveedor(prev => ({ ...prev, [name]: value }));
        }
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

    if (loading && allProveedores.length === 0) return <div className="p-4 text-center">Cargando proveedores...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
            {/* --- BARRA SUPERIOR CON BOTÓN, BÚSQUEDA Y PAGINACIÓN --- */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between flex-wrap gap-4">
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={abrirModalAgregar}>
                    Agregar Proveedor
                </Button>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, documento..."
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

            {/* --- TABLA DE PROVEEDORES --- */}
            <div className="max-w-full overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-400 dark:border-white/[0.05]">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Nombre / Razón Social</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Documento</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Contacto</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Estado</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
                        {currentTableData.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4">No se encontraron resultados.</td></tr>
                        ) : (
                            currentTableData.map((proveedor) => (
                                <tr key={proveedor.id}>
                                    <td className="px-5 py-4 whitespace-nowrap">{proveedor.tipo_proveedor === 'empresa' ? proveedor.razon_social : proveedor.nombre_comercial}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">{proveedor.tipo_documento}: {proveedor.documento}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">{proveedor.correo}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span onClick={() => toggleEstado(proveedor)} className={`cursor-pointer px-2 py-1 rounded-full text-xs font-semibold ${proveedor.estado === 1 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {proveedor.estado === 1 ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap space-x-1">
                                        <Tooltip title="Ver Detalle">
                                            <IconButton color="secondary" onClick={() => verDetalle(proveedor)}>
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Editar">
                                            <span> {/* Wrap to allow disabled Tooltip */}
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => abrirModalEditar(proveedor)}
                                                    disabled={proveedor.estado === 0} // Disable if inactive
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <span> {/* Wrap to allow disabled Tooltip */}
                                                <IconButton
                                                    color="error"
                                                    onClick={() => solicitarConfirmacionEliminacion(proveedor)}
                                                    disabled={proveedor.estado === 0} // Disable if inactive
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- BARRA INFERIOR CON INFO Y PAGINACIÓN --- */}
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-700">Mostrando {currentTableData.length} de {totalItems} proveedores</p>
                {totalPages > 1 && <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />}
            </div>

            {/* --- MODAL DE AGREGAR/EDITAR PROVEEDOR --- */}
            <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="md" fullWidth>
                <DialogTitle>{modoEdicion ? "Editar Proveedor" : "Agregar Nuevo Proveedor"}</DialogTitle>
                <DialogContent dividers>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                        <FormControl fullWidth>
                            <InputLabel>Tipo de Proveedor</InputLabel>
                            <Select name="tipo_proveedor" value={nuevoProveedor.tipo_proveedor} label="Tipo de Proveedor" onChange={handleSelectChange}>
                                <MenuItem value="persona_natural">Persona Natural</MenuItem>
                                <MenuItem value="empresa">Empresa</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField name="nombre_comercial" label={nuevoProveedor.tipo_proveedor === 'persona_natural' ? "Nombre Completo" : "Nombre Comercial"} value={nuevoProveedor.nombre_comercial || ''} onChange={handleChange} fullWidth />
                        {nuevoProveedor.tipo_proveedor === 'empresa' && <>
                            <TextField name="razon_social" label="Razón Social" value={nuevoProveedor.razon_social || ''} onChange={handleChange} fullWidth />
                            <TextField name="nombre_contacto" label="Nombre de Contacto" value={nuevoProveedor.nombre_contacto || ''} onChange={handleChange} fullWidth />
                        </>}
                        <FormControl fullWidth>
                            <InputLabel>Tipo Documento</InputLabel>
                            <Select name="tipo_documento" value={nuevoProveedor.tipo_documento} label="Tipo Documento" onChange={handleSelectChange}>
                                {nuevoProveedor.tipo_proveedor === 'empresa' ?
                                    <MenuItem value="NIT">NIT</MenuItem> :
                                    [<MenuItem key="CC" value="CC">CC</MenuItem>, <MenuItem key="CE" value="CE">CE</MenuItem>]}
                            </Select>
                        </FormControl>
                        <TextField name="documento" label="Documento" value={nuevoProveedor.documento} onChange={handleChange} fullWidth />
                        <TextField
                            name="correo"
                            label="Correo Electrónico"
                            type="email"
                            value={nuevoProveedor.correo}
                            onChange={handleChange}
                            fullWidth
                            error={!!emailError} // Set error state for TextField
                            helperText={emailError} // Display error message
                        />
                        <TextField name="telefono" label="Teléfono" value={nuevoProveedor.telefono} onChange={handleChange} fullWidth />
                        <TextField name="direccion" label="Dirección" value={nuevoProveedor.direccion} onChange={handleChange} fullWidth />

                        <FormControl fullWidth disabled={loadingDepartamentos}>
                            <InputLabel>Departamento</InputLabel>
                            <Select name="departamento" value={nuevoProveedor.departamento} label="Departamento" onChange={handleSelectChange}>
                                <MenuItem value="">{loadingDepartamentos ? "Cargando..." : "Seleccionar"}</MenuItem>
                                {departamentos.map(d => <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth disabled={!selectedDepartmentId || loadingMunicipios}>
                            <InputLabel>Municipio</InputLabel>
                            <Select name="municipio" value={nuevoProveedor.municipio} label="Municipio" onChange={handleSelectChange}>
                                <MenuItem value="">{loadingMunicipios ? "Cargando..." : "Seleccionar"}</MenuItem>
                                {municipios.map(m => <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <TextField name="barrio" label="Barrio (Opcional)" value={nuevoProveedor.barrio || ''} onChange={handleChange} fullWidth />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cerrarModal}>Cancelar</Button>
                    <Button onClick={guardarProveedor} variant="contained" disabled={!!emailError}>
                        {modoEdicion ? "Actualizar" : "Guardar"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- MODAL DE VER DETALLE --- */}
            <Modal isOpen={modalDetalleOpen} handleClose={cerrarDetalle}>
                <h2 className="text-2xl font-bold mb-6">Detalle del Proveedor</h2>
                {detalleActual &&
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <div><strong>Tipo:</strong> {detalleActual.tipo_proveedor === 'empresa' ? 'Empresa' : 'Persona Natural'}</div>
                        <div><strong>Nombre:</strong> {detalleActual.nombre_comercial}</div>
                        {detalleActual.tipo_proveedor === 'empresa' && <>
                            <div className="col-span-2 md:col-span-1"><strong>Razón Social:</strong> {detalleActual.razon_social}</div>
                            <div><strong>Contacto:</strong> {detalleActual.nombre_contacto || 'N/A'}</div>
                        </>}
                        <div><strong>Documento:</strong> {detalleActual.tipo_documento} {detalleActual.documento}</div>
                        <div className="col-span-2 md:col-span-1"><strong>Correo:</strong> {detalleActual.correo}</div>
                        <div><strong>Teléfono:</strong> {detalleActual.telefono}</div>
                        <div className="col-span-full"><strong>Dirección:</strong> {`${detalleActual.direccion}, ${detalleActual.barrio || ''}, ${detalleActual.municipio}, ${detalleActual.departamento}`}</div>
                        <div><strong>Estado:</strong> {detalleActual.estado === 1 ? "Activo" : "Inactivo"}</div>
                    </div>
                }
                <div className="mt-8 flex justify-end">
                    <Button onClick={cerrarDetalle} variant="contained">Cerrar</Button>
                </div>
            </Modal>

            {/* --- DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN --- */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de eliminar al proveedor <strong>{proveedorAEliminar?.nombre_comercial || proveedorAEliminar?.razon_social}</strong>? Esta acción no se puede deshacer.
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