import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

// --- Importaciones de Material-UI (MUI) ---
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import CancelIcon from '@mui/icons-material/Cancel'; // Importado para consistencia
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
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
import TextField from '@mui/material/TextField'; // Importado para los formularios

// --- Importaciones de Contexto y UI Personalizada ---
import { useAuth } from '../../context/authContext';
import Modal from "../ui/modal/Modal"; // Usado para el modal de detalle como en Proveedores

// --- Interfaces ---
interface Cliente {
  id: number;
  nombre: string;
  apellido:string;
  tipo_documento: string;
  documento: string;
  correo: string;
  telefono?: string;
  fecha_nacimiento: string;
  genero: string;
  direccion: string;
  departamento: string;
  municipio: string;
  barrio?: string;
  estado: boolean; // boolean es consistente con la implementación previa
}

interface DepartmentData {
  id: number;
  name: string;
}

interface CityData {
  id: number;
  name: string;
}

// --- URLs de API ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com';
const API_CLIENTES_URL = `${API_BASE_URL}/api/clientes`;
const API_COLOMBIA_DEPARTMENTS_URL = 'https://api-colombia.com/api/v1/Department';
const API_COLOMBIA_CITIES_BASE_URL = 'https://api-colombia.com/api/v1/Department';

export default function ClientesTable() {
    // --- ESTADOS ---
    const [allClientes, setAllClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [clienteEditandoId, setClienteEditandoId] = useState<number | null>(null);
    const [nuevoCliente, setNuevoCliente] = useState<Omit<Cliente, "id" | "estado">>({
        nombre: "",
        apellido: "",
        correo: "",
        direccion: "",
        departamento: "",
        municipio: "",
        barrio: "",
        telefono: "",
        tipo_documento: "CC",
        documento: "",
        fecha_nacimiento: "",
        genero: "Masculino",
    });

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);

    const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
    const [detalleActual, setDetalleActual] = useState<Cliente | null>(null);

    const { token, logout } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Homologado con proveedores

    const [departamentos, setDepartamentos] = useState<DepartmentData[]>([]);
    const [municipios, setMunicipios] = useState<CityData[]>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
    const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
    const [loadingMunicipios, setLoadingMunicipios] = useState(false);

    // Estado para la validación del correo electrónico
    const [emailError, setEmailError] = useState<string | null>(null);


    // --- LÓGICA DE DATOS ---
    const getAuthHeaders = useCallback(() => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }), [token]);

    const fetchClientes = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_CLIENTES_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    toast.error("Sesión expirada. Inicia sesión de nuevo.");
                    logout();
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const data: Cliente[] = await response.json();
            setAllClientes(data);
        } catch (err: any) {
            setError(`No se pudieron cargar los clientes: ${err.message}`);
            toast.error(`Error al cargar clientes: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [token, logout]);

    const fetchDepartamentos = useCallback(async () => {
        setLoadingDepartamentos(true);
        try {
            const response = await fetch(API_COLOMBIA_DEPARTMENTS_URL);
            if (!response.ok) throw new Error('Error al cargar departamentos');
            const data: DepartmentData[] = await response.json();
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
            const data: CityData[] = await response.json();
            setMunicipios(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error: any) {
            toast.error(`Error al cargar municipios: ${error.message}`);
        } finally {
            setLoadingMunicipios(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchClientes();
            fetchDepartamentos();
        }
    }, [token, fetchClientes, fetchDepartamentos]);

    useEffect(() => {
        if (selectedDepartmentId) {
            fetchMunicipios(selectedDepartmentId);
        } else {
            setMunicipios([]);
        }
    }, [selectedDepartmentId, fetchMunicipios]);

    const { currentTableData, totalPages, totalItems } = useMemo(() => {
        let filteredData = allClientes;
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredData = allClientes.filter(c =>
                c.nombre.toLowerCase().includes(lowercasedFilter) ||
                c.apellido.toLowerCase().includes(lowercasedFilter) ||
                c.documento.toLowerCase().includes(lowercasedFilter) ||
                c.correo.toLowerCase().includes(lowercasedFilter)
            );
        }
        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        return { currentTableData: paginatedData, totalPages, totalItems };
    }, [allClientes, searchTerm, currentPage, itemsPerPage]);

    // --- MANEJADOR DE ACCIONES CRUD GENÉRICO ---

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
            await fetchClientes(); // Refrescar datos
        } catch (err: any) {
            const apiError = err.message || 'Ocurrió un error desconocido.';
            toast.error(`${errorMessage}: ${apiError}`);
            if (err.status === 401 || err.status === 403) logout();
        }
    };
    
    const guardarCliente = () => {
        console.log('Guardando cliente...');
        console.log('Modo edición:', modoEdicion);
        console.log('ID cliente editando:', clienteEditandoId);
        console.log('Datos del cliente:', nuevoCliente);
        
        // Validaciones previas
        if (!nuevoCliente.nombre.trim() || !nuevoCliente.apellido.trim() || !nuevoCliente.correo.trim() || !nuevoCliente.documento.trim() || !nuevoCliente.fecha_nacimiento.trim() || !nuevoCliente.direccion.trim() || !nuevoCliente.departamento.trim() || !nuevoCliente.municipio.trim()) {
            return toast.error("Por favor, rellena todos los campos obligatorios.");
        }
        
        // Email validation
        if (!validateEmail(nuevoCliente.correo)) {
            setEmailError("El correo electrónico no es válido. Debe contener '@' y un dominio válido (ej: .com, .co).");
            return;
        } else {
            setEmailError(null);
        }

        const hoy = new Date();
        const fechaNacimiento = new Date(nuevoCliente.fecha_nacimiento);
        let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
        const mes = hoy.getMonth() - fechaNacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
            edad--;
        }
        if (edad < 18) {
            return toast.error("El cliente debe ser mayor de 18 años.");
        }

        const isEditing = modoEdicion && clienteEditandoId !== null;
        console.log('Es edición:', isEditing);
        
        if (isEditing && !clienteEditandoId) {
            console.error('Error: Modo edición activado pero no hay ID de cliente');
            return toast.error("Error: No se pudo identificar el cliente a editar.");
        }
        
        const apiCall = async () => {
            const url = isEditing ? `${API_CLIENTES_URL}/${clienteEditandoId}` : API_CLIENTES_URL;
            const method = isEditing ? 'PUT' : 'POST';
            
            console.log('URL de la API:', url);
            console.log('Método:', method);
            
            // Para edición, necesitamos incluir el estado actual del cliente
            // Para creación, se crea con estado 'true' (activo)
            let payload;
            if (isEditing) {
                // Buscar el cliente actual para obtener su estado
                const clienteActual = allClientes.find(c => c.id === clienteEditandoId);
                if (!clienteActual) {
                    throw new Error('No se pudo encontrar el cliente a editar');
                }
                payload = { ...nuevoCliente, estado: clienteActual.estado };
                console.log('Cliente actual encontrado:', clienteActual);
            } else {
                payload = { ...nuevoCliente, estado: true };
            }
            
            console.log('Payload a enviar:', payload);

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            console.log('Respuesta de la API:', response.status, response.statusText);

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error('Error de la API:', errorData);
              throw new Error(errorData.error || `Error ${response.status}`);
            }
        };

        handleAction(
            apiCall,
            `Cliente ${isEditing ? 'actualizado' : 'creado'} correctamente.`,
            `Error al ${isEditing ? 'actualizar' : 'crear'} cliente`
        ).finally(() => cerrarModal());
    };

    const confirmarEliminacion = () => {
        if (!clienteAEliminar) return;
        const apiCall = async () => {
            const response = await fetch(`${API_CLIENTES_URL}/${clienteAEliminar.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Error ${response.status}`);
            }
        };
        handleAction(apiCall, "Cliente eliminado.", "Error al eliminar.")
            .finally(() => {
                setConfirmDialogOpen(false);
                setClienteAEliminar(null);
            });
    };

    const toggleEstado = (cliente: Cliente) => {
        const apiCall = async () => {
            const response = await fetch(`${API_CLIENTES_URL}/${cliente.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                // Se envía el objeto completo para evitar borrar datos, solo se cambia el estado
                body: JSON.stringify({ ...cliente, estado: !cliente.estado })
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Error ${response.status}`);
            }
        };
        handleAction(apiCall, "Estado del cliente actualizado.", "Error al cambiar estado.");
    };

    // --- MANEJADORES DE UI ---
    const abrirModalAgregar = () => {
        setModoEdicion(false);
        setClienteEditandoId(null);
        setNuevoCliente({
            nombre: "", apellido: "", correo: "", direccion: "", departamento: "",
            municipio: "", barrio: "", telefono: "", tipo_documento: "CC",
            documento: "", fecha_nacimiento: "", genero: "Masculino",
        });
        setSelectedDepartmentId(null);
        setMunicipios([]);
        setEmailError(null); // Clear email error when opening for add
        setIsModalOpen(true);
    };

    const abrirModalEditar = (cliente: Cliente) => {
        console.log('Abriendo modal para editar cliente:', cliente);
        console.log('Departamentos disponibles:', departamentos);
        
        setModoEdicion(true);
        setClienteEditandoId(cliente.id);
        setNuevoCliente({
            nombre: cliente.nombre, apellido: cliente.apellido, correo: cliente.correo,
            direccion: cliente.direccion, departamento: cliente.departamento, municipio: cliente.municipio,
            barrio: cliente.barrio || '', telefono: cliente.telefono || '', tipo_documento: cliente.tipo_documento,
            documento: cliente.documento, fecha_nacimiento: cliente.fecha_nacimiento, genero: cliente.genero,
        });
        
        // Buscar el departamento por nombre
        const deptoEncontrado = departamentos.find(d => d.name === cliente.departamento);
        console.log('Departamento encontrado:', deptoEncontrado);
        
        if (deptoEncontrado) {
            setSelectedDepartmentId(deptoEncontrado.id);
            console.log('ID del departamento establecido:', deptoEncontrado.id);
        } else {
            console.warn('No se encontró el departamento:', cliente.departamento);
            setSelectedDepartmentId(null);
        }
        
        setEmailError(null); // Clear email error when opening for edit
        setIsModalOpen(true);
    };
    
    const cerrarModal = () => {
        console.log('Cerrando modal...');
        setIsModalOpen(false);
        setModoEdicion(false);
        setClienteEditandoId(null);
        setEmailError(null);
        setSelectedDepartmentId(null);
        setMunicipios([]);
    };
    
    const verDetalle = (cliente: Cliente) => {
      setDetalleActual(cliente);
      setModalDetalleOpen(true);
    };

    const cerrarDetalle = () => setModalDetalleOpen(false);

    const solicitarConfirmacionEliminacion = (cliente: Cliente) => {
        setClienteAEliminar(cliente);
        setConfirmDialogOpen(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNuevoCliente(prev => {
            const updated = { ...prev, [name]: value };
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
            setNuevoCliente(prev => ({ ...prev, departamento: value, municipio: "" }));
        } else {
            setNuevoCliente(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => setCurrentPage(value);
    const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };
    const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
        setItemsPerPage(Number(event.target.value));
        setCurrentPage(1);
    };
    
    if (loading && allClientes.length === 0) return <div className="p-4 text-center">Cargando clientes...</div>;
    if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
            {/* --- BARRA SUPERIOR CON BOTÓN, BÚSQUEDA Y PAGINACIÓN --- */}
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between flex-wrap gap-4">
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={abrirModalAgregar}>
                    Agregar Cliente
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

            {/* --- TABLA DE CLIENTES --- */}
            <div className="max-w-full overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-400 dark:border-white/[0.05]">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Documento</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Nombre Completo</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Contacto</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Estado</th>
                            <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
                        {currentTableData.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4">No se encontraron resultados.</td></tr>
                        ) : (
                            currentTableData.map((cliente) => (
                                <tr key={cliente.id}>
                                    <td className="px-5 py-4 whitespace-nowrap">{cliente.tipo_documento}: {cliente.documento}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">{cliente.nombre} {cliente.apellido}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">{cliente.correo}</td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span onClick={() => toggleEstado(cliente)} className={`cursor-pointer px-2 py-1 rounded-full text-xs font-semibold ${cliente.estado ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {cliente.estado ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap space-x-1">
                                        <Tooltip title="Ver Detalle">
                                            <IconButton color="secondary" onClick={() => verDetalle(cliente)}>
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={!cliente.estado ? "El cliente está inactivo" : "Editar"}>
                                            <span> {/* Wrap to allow disabled Tooltip */}
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => abrirModalEditar(cliente)}
                                                    disabled={!cliente.estado} // Disable if inactive
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={!cliente.estado ? "El cliente está inactivo" : "Eliminar"}>
                                           <span> {/* Wrap to allow disabled Tooltip */}
                                             <IconButton
                                               color="error"
                                               onClick={() => solicitarConfirmacionEliminacion(cliente)}
                                               disabled={!cliente.estado} // Disable if inactive
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
                <p className="text-sm text-gray-700">Mostrando {currentTableData.length} de {totalItems} clientes</p>
                {totalPages > 1 && <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />}
            </div>

            {/* --- MODAL DE AGREGAR/EDITAR CLIENTE --- */}
            <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="md" fullWidth>
                <DialogTitle>{modoEdicion ? "Editar Cliente" : "Agregar Nuevo Cliente"}</DialogTitle>
                <DialogContent dividers>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                        <TextField name="nombre" label="Nombre" value={nuevoCliente.nombre} onChange={handleChange} fullWidth />
                        <TextField name="apellido" label="Apellido" value={nuevoCliente.apellido} onChange={handleChange} fullWidth />
                         <FormControl fullWidth>
                            <InputLabel>Tipo Documento</InputLabel>
                            <Select name="tipo_documento" value={nuevoCliente.tipo_documento} label="Tipo Documento" onChange={handleSelectChange}>
                                <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
                                <MenuItem value="CE">Cédula de Extranjería</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField name="documento" label="Documento" value={nuevoCliente.documento} onChange={handleChange} fullWidth />
                        <TextField
                            name="correo"
                            label="Correo Electrónico"
                            type="email"
                            value={nuevoCliente.correo}
                            onChange={handleChange}
                            fullWidth
                            error={!!emailError} // Set error state for TextField
                            helperText={emailError} // Display error message
                        />
                        <TextField name="telefono" label="Teléfono (Opcional)" value={nuevoCliente.telefono} onChange={handleChange} fullWidth />
                        <TextField name="fecha_nacimiento" label="Fecha de Nacimiento" type="date" value={nuevoCliente.fecha_nacimiento} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }}/>
                        <FormControl fullWidth>
                            <InputLabel>Género</InputLabel>
                            <Select name="genero" value={nuevoCliente.genero} label="Género" onChange={handleSelectChange}>
                                <MenuItem value="Masculino">Masculino</MenuItem>
                                <MenuItem value="Femenino">Femenino</MenuItem>
                                <MenuItem value="Otro">Otro</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField name="direccion" label="Dirección" value={nuevoCliente.direccion} onChange={handleChange} fullWidth />
                        <FormControl fullWidth disabled={loadingDepartamentos}>
                            <InputLabel>Departamento</InputLabel>
                            <Select name="departamento" value={nuevoCliente.departamento} label="Departamento" onChange={handleSelectChange}>
                                <MenuItem value="">{loadingDepartamentos ? "Cargando..." : "Seleccionar"}</MenuItem>
                                {departamentos.map(d => <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth disabled={!selectedDepartmentId || loadingMunicipios}>
                            <InputLabel>Municipio</InputLabel>
                            <Select name="municipio" value={nuevoCliente.municipio} label="Municipio" onChange={handleSelectChange}>
                                <MenuItem value="">{loadingMunicipios ? "Cargando..." : "Seleccionar"}</MenuItem>
                                {municipios.map(m => <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField name="barrio" label="Barrio (Opcional)" value={nuevoCliente.barrio || ''} onChange={handleChange} fullWidth />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cerrarModal}>Cancelar</Button>
                    <Button onClick={guardarCliente} variant="contained" disabled={!!emailError}>
                        {modoEdicion ? "Actualizar" : "Guardar"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- MODAL DE VER DETALLE --- */}
            <Modal isOpen={modalDetalleOpen} handleClose={cerrarDetalle}>
                <h2 className="text-2xl font-bold mb-6">Detalle del Cliente</h2>
                {detalleActual &&
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div><strong>Nombre:</strong> {detalleActual.nombre} {detalleActual.apellido}</div>
                        <div><strong>Documento:</strong> {detalleActual.tipo_documento} {detalleActual.documento}</div>
                        <div><strong>Correo:</strong> {detalleActual.correo}</div>
                        <div><strong>Teléfono:</strong> {detalleActual.telefono || 'N/A'}</div>
                        <div><strong>Fecha de Nacimiento:</strong> {detalleActual.fecha_nacimiento}</div>
                        <div><strong>Género:</strong> {detalleActual.genero}</div>
                        <div className="col-span-full"><strong>Dirección:</strong> {`${detalleActual.direccion}, ${detalleActual.barrio || ''}, ${detalleActual.municipio}, ${detalleActual.departamento}`}</div>
                        <div><strong>Estado:</strong> {detalleActual.estado ? "Activo" : "Inactivo"}</div>
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
                        ¿Estás seguro de eliminar al cliente **{clienteAEliminar?.nombre} {clienteAEliminar?.apellido}**? Esta acción no se puede deshacer.
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