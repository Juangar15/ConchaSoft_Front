import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Importar useMemo
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CancellIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import Tooltip from "@mui/material/Tooltip";
import Modal from "../ui/modal/Modal";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FloatingInput from "../common/FloatingInput";
import { useAuth } from '../../context/authContext';
import Pagination from '@mui/material/Pagination';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { toast } from 'react-toastify'; // Importar toast para notificaciones

// Interfaz para la estructura de un cliente
interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
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
  estado: boolean;
}

// Interfaz para la respuesta de la API (ya no es paginada aquí, se cargan todos)
// Esta interfaz ya no es estrictamente necesaria si siempre traemos todos los clientes,
// pero la mantendremos como referencia si en el futuro se quiere una paginación del lado del servidor.
// interface ClientesApiResponse {
// clientes: Cliente[];
// totalItems: number;
// currentPage: number;
// itemsPerPage: number;
// totalPages: number;
// }

interface DepartmentData {
  id: number;
  name: string;
}

// Interfaz para una ciudad (municipio) de la API-Colombia
interface CityData {
  id: number;
  name: string;
}

// URL base de tu API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com';
const API_COLOMBIA_DEPARTMENTS_URL = 'https://api-colombia.com/api/v1/Department';
const API_COLOMBIA_CITIES_BASE_URL = 'https://api-colombia.com/api/v1/Department';

export default function ClientesTable() {
  const [allClientes, setAllClientes] = useState<Cliente[]>([]); // Almacena TODOS los clientes
  const [clientes, setClientes] = useState<Cliente[]>([]); // Clientes a mostrar (filtrados/paginados)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<
    Omit<Cliente, "id" | "estado">
  >({
    nombre: "", apellido: "", correo: "", direccion: "",
    departamento: "",
    municipio: "", barrio: "", telefono: "",
    tipo_documento: "",
    documento: "",
    fecha_nacimiento: "",
    genero: "",
  });
  const [modoEdicion, setModoEdicion] = useState(false);
  const [clienteEditandoId, setClienteEditandoId] = useState<number | null>(
    null
  );
  // Eliminamos mensajeAlerta y error, usaremos toast
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(
    null
  );

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [detalleActual, setDetalleActual] = useState<Cliente | null>(null);

  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null); // Ya no es necesario con toast

  const { token, logout } = useAuth();

  // --- Estados para Búsqueda y Paginación en el Frontend ---
  const [searchTerm, setSearchTerm] = useState<string>(''); // Término de búsqueda (directamente desde el input)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10); // Renombrado de itemsPerPage a rowsPerPage para consistencia con ProductosTable

  const [departamentos, setDepartamentos] = useState<DepartmentData[]>([]);
  const [municipiosFiltrados, setMunicipiosFiltrados] = useState<CityData[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  // Ya no es necesario el useRef para debounce porque el filtro es instantáneo en el frontend
  // const searchDebounceTimeout = useRef<number | null>(null);

  const getAuthHeader = useCallback((): HeadersInit => {
    if (!token) {
      return {};
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  // Parte 2: Funciones de Interacción con la API y Lógica de Filtrado/Paginación

  // Función para cargar *todos* los clientes desde la API
  const fetchAllClientes = useCallback(async () => {
    setLoading(true);
    // setError(null); // Ya no es necesario con toast
    // setMensajeAlerta(""); // Ya no es necesario con toast
    try {
      // No se envían parámetros de paginación ni búsqueda a la API, se traen todos
      const url = `${API_BASE_URL}/api/clientes`;

      const response = await fetch(url, {
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          logout();
          toast.error("Sesión expirada o no autorizado. Por favor, inicia sesión de nuevo.");
        }
        throw new Error(errorData.error || "Error al cargar los clientes.");
      }

      const data: Cliente[] = await response.json(); // La API devuelve directamente el array de clientes
      setAllClientes(data); // Guardar TODOS los clientes
      setCurrentPage(1); // Resetear a la primera página cada vez que se recargan los datos
    } catch (err: any) { // Usamos 'any' para capturar cualquier tipo de error
      toast.error(err.message || "Error desconocido al cargar clientes.");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader, logout]);

  // --- Funciones para API Externa de Departamentos y Municipios (API-Colombia) ---

  const fetchDepartamentos = useCallback(async () => {
    setLoadingDepartamentos(true);
    try {
        const response = await fetch(API_COLOMBIA_DEPARTMENTS_URL);
        if (!response.ok) {
            throw new Error('Error al cargar departamentos');
        }
        const data: DepartmentData[] = await response.json();
        setDepartamentos(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
        toast.error(`Error al cargar departamentos: ${err.message || 'Desconocido'}`);
    } finally {
        setLoadingDepartamentos(false);
    }
  }, []);

  const fetchMunicipios = useCallback(async (departmentId: number) => {
    setLoadingMunicipios(true);
    setMunicipiosFiltrados([]);
    if (!departmentId) {
      setLoadingMunicipios(false);
      return;
    }
    try {
        const url = `${API_COLOMBIA_CITIES_BASE_URL}/${departmentId}/cities`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error al cargar municipios para el departamento ID ${departmentId}`);
        }
        const data: CityData[] = await response.json();
        setMunicipiosFiltrados(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
        toast.error(`Error al cargar municipios: ${err.message || 'Desconocido'}`);
    } finally {
        setLoadingMunicipios(false);
    }
  }, []);

  // 1. useEffect para la carga inicial de clientes y departamentos (depende del token)
  useEffect(() => {
    if (token) {
      fetchAllClientes(); // Usar la nueva función para cargar TODOS los clientes
      fetchDepartamentos();
    } else {
      setLoading(false);
      toast.error("No autenticado. Por favor, inicia sesión para ver los clientes.");
    }
  }, [token, fetchAllClientes, fetchDepartamentos]);

  // 2. useEffect para cargar municipios basado en el departamento seleccionado
  useEffect(() => {
    if (selectedDepartmentId) {
      fetchMunicipios(selectedDepartmentId);
    } else {
      setMunicipiosFiltrados([]);
    }
    // Esta parte solo se ejecuta cuando 'nuevoCliente.departamento' cambia, no cuando 'municipiosFiltrados' lo hace.
    if (nuevoCliente.departamento && !municipiosFiltrados.some(m => m.name === nuevoCliente.municipio)) {
      setNuevoCliente(prev => ({ ...prev, municipio: "" }));
    }
  }, [selectedDepartmentId, fetchMunicipios, nuevoCliente.departamento]);

  // Lógica de filtrado y paginación en el frontend con useMemo para optimización
  // Lógica de filtrado y paginación en el frontend con useMemo para optimización
  const filteredAndPaginatedClientes = useMemo(() => {
    // Asegurarse de que allClientes sea un array antes de procesar
    let currentFilteredClientes = Array.isArray(allClientes) ? allClientes : [];

    // 1. Filtrar por término de búsqueda
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentFilteredClientes = currentFilteredClientes.filter(cliente =>
        (cliente.nombre && cliente.nombre.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cliente.apellido && cliente.apellido.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cliente.correo && cliente.correo.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cliente.documento && cliente.documento.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cliente.telefono && cliente.telefono.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cliente.departamento && cliente.departamento.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cliente.municipio && cliente.municipio.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cliente.barrio && cliente.barrio.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (cliente.direccion && cliente.direccion.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    // 2. Paginación
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedClientes = currentFilteredClientes.slice(startIndex, endIndex); // Esta es la línea 255

    // Actualizar el estado 'clientes' que se renderiza en la tabla
    setClientes(paginatedClientes);

    // Devolver el array filtrado ANTES de la paginación para calcular el total de páginas
    return currentFilteredClientes;

  }, [allClientes, searchTerm, currentPage, rowsPerPage]); // Dependencias para recalcular // Dependencias para recalcular

  // El número total de clientes después de filtrar, para la paginación (count de Pagination)
  const totalFilteredItems = filteredAndPaginatedClientes.length;
  const totalPages = Math.ceil(totalFilteredItems / rowsPerPage); // Calcular totalPages aquí

  // --- Manejadores de Eventos para Búsqueda y Paginación ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value); // Actualizar el término de búsqueda directamente
    setCurrentPage(1); // Reiniciar a la primera página cuando se busca
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const handleRowsPerPageChange = (event: SelectChangeEvent<number>) => {
    setRowsPerPage(parseInt(event.target.value as string, 10));
    setCurrentPage(1); // Reiniciar a la primera página
  };

  const toggleEstado = async (id: number) => {
    const clienteToUpdate = allClientes.find((cliente) => cliente.id === id); // Usar allClientes

    if (!clienteToUpdate) {
      toast.error("Cliente no encontrado para actualizar estado.");
      return;
    }

    const nuevoEstado = !clienteToUpdate.estado;

    try {
      const response = await fetch(`${API_BASE_URL}/api/clientes/${id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({
          nombre: clienteToUpdate.nombre,
          apellido: clienteToUpdate.apellido,
          correo: clienteToUpdate.correo,
          direccion: clienteToUpdate.direccion,
          departamento: clienteToUpdate.departamento,
          municipio: clienteToUpdate.municipio,
          barrio: clienteToUpdate.barrio,
          telefono: clienteToUpdate.telefono,
          tipo_documento: clienteToUpdate.tipo_documento,
          documento: clienteToUpdate.documento,
          fecha_nacimiento: clienteToUpdate.fecha_nacimiento,
          genero: clienteToUpdate.genero,
          estado: nuevoEstado,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          logout();
          toast.error("Sesión expirada o no autorizado. Por favor, inicia sesión de nuevo.");
        }
        throw new Error(errorData.error || `Error al cambiar el estado del cliente.`);
      }

      await fetchAllClientes(); // Recargar todos los clientes para mantener el estado actualizado
      toast.success("Estado del cliente actualizado correctamente.");

    } catch (err: any) {
      toast.error(err.message || "Error desconocido al cambiar el estado.");
    }
  };

  const abrirModal = () => {
    setNuevoCliente({
      nombre: "",
      apellido: "",
      correo: "",
      direccion: "",
      departamento: "",
      municipio: "",
      barrio: "",
      telefono: "",
      tipo_documento: "",
      documento: "",
      fecha_nacimiento: "",
      genero: "",
    });
    setSelectedDepartmentId(null); // Resetear ID al abrir modal, para que se carguen depto. y mpios. correctamente
    setModoEdicion(false);
    setClienteEditandoId(null);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (cliente: Cliente) => {
    setNuevoCliente({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      correo: cliente.correo,
      direccion: cliente.direccion,
      departamento: cliente.departamento,
      municipio: cliente.municipio,
      barrio: cliente.barrio || "",
      telefono: cliente.telefono || "",
      tipo_documento: cliente.tipo_documento,
      documento: cliente.documento,
      fecha_nacimiento: cliente.fecha_nacimiento,
      genero: cliente.genero,
    });
    const deptoEncontrado = departamentos.find(d => d.name === cliente.departamento);
    if (deptoEncontrado) {
      setSelectedDepartmentId(deptoEncontrado.id);
    } else {
      setSelectedDepartmentId(null);
    }
    setModoEdicion(true);
    setClienteEditandoId(cliente.id);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setNuevoCliente({
      nombre: "",
      apellido: "",
      correo: "",
      direccion: "",
      departamento: "",
      municipio: "",
      barrio: "",
      telefono: "",
      tipo_documento: "",
      documento: "",
      fecha_nacimiento: "",
      genero: "",
    });
    setSelectedDepartmentId(null);
    setModoEdicion(false);
    setClienteEditandoId(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNuevoCliente((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  const { name, value } = event.target;
  if (name === "departamento") {
    const selectedDepto = departamentos.find(d => d.name === value);
    setSelectedDepartmentId(selectedDepto ? selectedDepto.id : null);
    setNuevoCliente(prev => ({ ...prev, [name]: value, municipio: "" }));
  } else {
    setNuevoCliente(prev => ({ ...prev, [name]: value }));
  }
};


  const verDetalle = async (cliente: Cliente) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/clientes/${cliente.id}`, {
        headers: getAuthHeader(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          logout();
          toast.error("Acceso denegado para ver detalle. Inicia sesión.");
        }
        throw new Error(errorData.error || `Error al obtener el detalle del cliente: ${response.statusText}`);
      }
      const data: Cliente = await response.json();
      setDetalleActual(data);
      setModalDetalleOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Error desconocido al obtener detalle.");
    }
  };

  const cerrarDetalle = () => {
    setModalDetalleOpen(false);
    setDetalleActual(null);
  };

  const guardarCliente = async () => {
    if (
      !nuevoCliente.nombre.trim() ||
      !nuevoCliente.apellido.trim() ||
      !nuevoCliente.correo.trim() ||
      !nuevoCliente.direccion.trim() ||
      !nuevoCliente.departamento.trim() || // Validar departamento
      !nuevoCliente.municipio.trim() ||
      !nuevoCliente.tipo_documento.trim() || // Validar nuevos campos
      !nuevoCliente.documento.trim() ||
      !nuevoCliente.fecha_nacimiento.trim() ||
      !nuevoCliente.genero.trim()
    ) {
      toast.error("Por favor, rellena todos los campos obligatorios (*).");
      return;
    }

    const method = modoEdicion ? "PUT" : "POST";
    const url = modoEdicion ? `${API_BASE_URL}/api/clientes/${clienteEditandoId}` : `${API_BASE_URL}/api/clientes`;

    const estadoClienteExistente = modoEdicion
      ? allClientes.find(c => c.id === clienteEditandoId)?.estado // Usar allClientes
      : true;

    try {
      const response = await fetch(url, {
        method: method,
        headers: getAuthHeader(),
        body: JSON.stringify({
          ...nuevoCliente,
          estado: estadoClienteExistente,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          logout();
          toast.error(`Acceso denegado: ${errorData.error || 'No autorizado.'}`);
        }
        throw new Error(errorData.error || `Error al ${modoEdicion ? "actualizar" : "crear"} el cliente.`);
      }

      await fetchAllClientes(); // Recargar todos los clientes
      toast.success(`Cliente ${modoEdicion ? "actualizado" : "creado"} correctamente.`);
      cerrarModal();
    } catch (err: any) {
      toast.error(err.message || `No se pudo ${modoEdicion ? "actualizar" : "crear"} el cliente.`);
    }
  };

  const solicitarConfirmacionEliminacion = (cliente: Cliente) => {
    setClienteAEliminar(cliente);
    setConfirmDialogOpen(true);
  };

  const confirmarEliminacion = async () => {
    if (!clienteAEliminar) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/clientes/${clienteAEliminar.id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          logout();
          toast.error(`Acceso denegado: ${errorData.error || 'No autorizado.'}`);
        }
        throw new Error(errorData.error || "Error al eliminar el cliente.");
      }

      await fetchAllClientes(); // Recargar todos los clientes
      toast.success("Cliente eliminado correctamente.");
    } catch (err: any) {
      toast.error(err.message || "No se pudo eliminar el cliente.");
    } finally {
      setConfirmDialogOpen(false);
      setClienteAEliminar(null);
    }
  };

   if (loading) {
    return <div className="text-center py-8 text-gray-700 dark:text-gray-300">Cargando clientes...</div>;
  }

  // Ya no necesitamos un bloque 'if (error)' aquí porque toast se encarga de mostrar los errores.

  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4 flex items-center justify-between flex-wrap gap-4">
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={abrirModal}
          sx={{ textTransform: "none" }}
        >
          Agregar Cliente
        </Button>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar por nombre, documento, correo, dirección..."
            value={searchTerm} // Usar searchTerm directamente
            onChange={handleSearchChange}
            className="border border-gray-400 bg-white rounded px-4 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="rows-per-page-label" className="dark:text-gray-300">Filas</InputLabel>
            <Select
              labelId="rows-per-page-label"
              id="rows-per-page-select"
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              label="Filas"
              size="small"
              className="bg-white dark:bg-gray-800 dark:text-white"
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      {/* Ya no necesitamos el div de mensajeAlerta aquí, toast lo maneja */}

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-400 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start"
              >
                Nombre Completo
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start"
              >
                Correo
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start"
              >
                Dirección
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start"
              >
                Teléfono
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start"
              >
                Estado
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start"
              >
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
            {clientes.length > 0 ? (
              clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-white/90">
                    {cliente.nombre} {cliente.apellido}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    {cliente.correo}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    {cliente.direccion},{" "}
                    {cliente.barrio ? cliente.barrio + ", " : ""}
                    {cliente.municipio}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    {cliente.telefono || "N/A"}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleEstado(cliente.id)}
                        className={`w-10 h-5 rounded-full transition-all duration-300 ${
                          cliente.estado
                            ? "bg-green-500"
                            : "bg-gray-400 dark:bg-gray-600"
                        } relative`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                            cliente.estado
                              ? "translate-x-5 left-0"
                              : "translate-x-0 left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 space-x-2">
                    <Tooltip title="Ver Detalle">
                      <IconButton color="secondary" onClick={() => verDetalle(cliente)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton color="primary" onClick={() => abrirModalEditar(cliente)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton color="error" onClick={() => solicitarConfirmacionEliminacion(cliente)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <td colSpan={6} className="text-center py-4 text-gray-600 dark:text-gray-400">
                  No hay clientes registrados que coincidan con la búsqueda.
                </td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 flex flex-col sm:flex-row items-center justify-between mt-4">
        {totalFilteredItems > 0 && ( // Usar totalFilteredItems
          <div className="text-gray-700 dark:text-gray-300 mb-4 sm:mb-0">
            Mostrando {Math.min((currentPage - 1) * rowsPerPage + 1, totalFilteredItems)} - {Math.min(currentPage * rowsPerPage, totalFilteredItems)} de {totalFilteredItems} clientes.
          </div>
        )}
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
                      backgroundColor: 'var(--brand-500) !important',
                      color: 'white !important',
                  },
                  '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
              },
              '& .MuiPaginationItem-icon': {
                  color: 'black',
              },
              '.dark & .MuiPaginationItem-root': {
                  color: 'white',
                  '&.Mui-selected': {
                      backgroundColor: 'var(--brand-500) !important',
                      color: 'white !important',
                  },
                  '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
              },
              '.dark & .MuiPaginationItem-icon': {
                  color: 'white',
              },
            }}
          />
        )}
      </div>

      <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="md" fullWidth>
  <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
    {modoEdicion ? "Editar Cliente" : "Agregar Nuevo Cliente"}
  </DialogTitle>

  <DialogContent className="pt-2">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { name: "nombre", label: "Nombre *" },
        { name: "apellido", label: "Apellido *" },
        {
          name: "tipo_documento",
          label: "Tipo Documento *",
          isSelect: true,
          options: ["Cédula de Ciudadanía", "Cédula de Extranjería"],
          values: ["CC", "CE"],
        },
        { name: "documento", label: "Documento *" },
        { name: "correo", label: "Correo *", type: "email" },
        { name: "telefono", label: "Teléfono" },
        { name: "fecha_nacimiento", label: "Fecha de Nacimiento *", type: "date" },
        {
          name: "genero",
          label: "Género *",
          isSelect: true,
          options: ["Masculino", "Femenino", "Otro"],
          values: ["Masculino", "Femenino", "Otro"],
        },
      ].map(({ name, label, type = "text", isSelect = false, options = [], values = [] }) => (
        <div key={name} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
          {isSelect ? (
            <select
              name={name}
              value={nuevoCliente[name]}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Seleccionar</option>
              {options.map((opt, idx) => (
                <option key={opt} value={values[idx]}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              name={name}
              type={type}
              value={nuevoCliente[name] || ""}
              onChange={handleChange}
              required={label.includes("*")}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
        </div>
      ))}

      {/* Departamento */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Departamento *</label>
        <select
          name="departamento"
          value={nuevoCliente.departamento}
          onChange={handleSelectChange}
          required
          disabled={loadingDepartamentos}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">{loadingDepartamentos ? "Cargando..." : "Seleccionar"}</option>
          {departamentos.map((depto) => (
            <option key={depto.id} value={depto.name}>
              {depto.name}
            </option>
          ))}
        </select>
      </div>

      {/* Municipio */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Municipio *</label>
        <select
          name="municipio"
          value={nuevoCliente.municipio}
          onChange={handleSelectChange}
          required
          disabled={!selectedDepartmentId || loadingMunicipios}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">{loadingMunicipios ? "Cargando..." : "Seleccionar"}</option>
          {municipiosFiltrados.map((mun) => (
            <option key={mun.id} value={mun.name}>
              {mun.name}
            </option>
          ))}
        </select>
      </div>

      {/* Barrio */}
      <div className="md:col-span-2 lg:col-span-2 flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Barrio</label>
        <input
          name="barrio"
          type="text"
          value={nuevoCliente.barrio || ""}
          onChange={handleChange}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Dirección */}
      <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dirección *</label>
        <input
          name="direccion"
          type="text"
          value={nuevoCliente.direccion || ""}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </div>
  </DialogContent>

  <DialogActions className="flex justify-end gap-3 px-6 pb-4">
    <button
      onClick={cerrarModal}
      className="px-5 py-2 rounded-full bg-gray-400 text-white hover:bg-gray-500 transition dark:bg-gray-600"
    >
      Cancelar
    </button>
    <button
      onClick={guardarCliente}
      className="px-5 py-2 rounded-full bg-brand-500 text-white hover:bg-brand-600 transition"
    >
      {modoEdicion ? "Actualizar" : "Guardar"}
    </button>
  </DialogActions>
</Dialog>


      <Dialog open={modalDetalleOpen} onClose={cerrarDetalle} maxWidth="md" fullWidth>
  <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
    Detalle del Cliente
  </DialogTitle>

  <DialogContent className="mt-2">
    {detalleActual && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          ["Nombre", detalleActual.nombre],
          ["Apellido", detalleActual.apellido],
          ["Tipo Documento", detalleActual.tipo_documento],
          ["Documento", detalleActual.documento],
          ["Fecha de Nacimiento", detalleActual.fecha_nacimiento],
          ["Género", detalleActual.genero],
          ["Correo", detalleActual.correo],
          ["Teléfono", detalleActual.telefono || "N/A"],
          ["Departamento", detalleActual.departamento],
          ["Municipio", detalleActual.municipio],
          ["Barrio", detalleActual.barrio],
          ["Dirección", detalleActual.direccion],
          ["Estado", detalleActual.estado ? "Activo" : "Inactivo"],
        ].map(([label, value], idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl border border-gray-300 bg-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700"
          >
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              {label}
            </p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {value || "—"}
            </p>
          </div>
        ))}
      </div>
    )}
  </DialogContent>

  <DialogActions className="mt-4 px-6 pb-4">
    <button
      onClick={cerrarDetalle}
      className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600 transition-all dark:bg-brand-600 dark:hover:bg-brand-500"
    >
      Cerrar
    </button>
  </DialogActions>
</Dialog>



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
        <DialogContent className="bg-gray-100 dark:bg-gray-700">
          <DialogContentText className="text-lg text-gray-700 dark:text-gray-300">
            ¿Estás seguro de que deseas eliminar al cliente{" "}
            <strong className="font-semibold text-red-600">
              {clienteAEliminar?.nombre}
            </strong>
            ? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions className="bg-gray-50 p-4 dark:bg-gray-800">
          <Tooltip title="Cancelar">
            <IconButton
              onClick={() => setConfirmDialogOpen(false)}
              color="default"
              className="hover:bg-gray-200 rounded-full dark:hover:bg-gray-600"
              sx={{
                color: 'text.secondary',
                '@media (prefers-color-scheme: dark)': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            >
              <CancellIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              onClick={confirmarEliminacion}
              color="error"
              variant="contained"
              startIcon={<DeleteIcon />}
              sx={{
                textTransform: 'none',
                borderRadius: "9999px",
                padding: "8px 20px",
                fontWeight: 600,
              }}
            >
              Eliminar
            </Button>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </div>
  );
}


