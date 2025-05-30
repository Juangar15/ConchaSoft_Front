import React, { useState, useEffect, useCallback, useRef } from 'react'; // Importar useRef
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

// Interfaz para la estructura de un cliente
interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  tipo_documento: string; // Nuevo campo
  documento: string;       // Nuevo campo
  correo: string;
  telefono?: string;
  fecha_nacimiento: string; // Nuevo campo (se recomienda manejar como string en el frontend para inputs de tipo 'date')
  genero: string;         // Nuevo campo
  direccion: string;
  departamento: string; // ¡Modifica esta línea para incluir el departamento!
  municipio: string;
  barrio?: string;
  estado: boolean;
}

// Interfaz para la respuesta de la API con paginación
interface ClientesApiResponse {
  clientes: Cliente[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

interface DepartmentData {
  id: number;
  name: string;
  // Otros campos que pueda traer la API, si los necesitas
}

// Interfaz para una ciudad (municipio) de la API-Colombia
interface CityData {
  id: number;
  name: string;
  // Otros campos que pueda traer la API, si los necesitas
}

// URL base de tu API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com';
const API_COLOMBIA_DEPARTMENTS_URL = 'https://api-colombia.com/api/v1/Department';
const API_COLOMBIA_CITIES_BASE_URL = 'https://api-colombia.com/api/v1/Department';

export default function ClientesTable() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<
  Omit<Cliente, "id" | "estado">
>({
  nombre: "", apellido: "", correo: "", direccion: "",
  // Asegúrate de agregar el campo 'departamento' aquí:
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
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(
    null
  );

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [detalleActual, setDetalleActual] = useState<Cliente | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { token, logout } = useAuth();

  // --- Estados para Búsqueda y Paginación ---
  const [searchInputValue, setSearchInputValue] = useState<string>(''); // Nuevo estado para el input
  const [searchTerm, setSearchTerm] = useState<string>(''); // Estado que se usa para la API, con debounce
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  const [departamentos, setDepartamentos] = useState<DepartmentData[]>([]);
  const [municipiosFiltrados, setMunicipiosFiltrados] = useState<CityData[]>([]);
  // Nuevo estado para guardar el ID del departamento seleccionado
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  // Referencia para el timeout del debounce
const searchDebounceTimeout = useRef<number | null>(null);

  const getAuthHeader = useCallback((): HeadersInit => {
    if (!token) {
      console.error("No hay token de autenticación disponible.");
      return {};
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [token]);

  // --- Operaciones CRUD con la API ---

  // Función para cargar los clientes desde la API con búsqueda y paginación
  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMensajeAlerta("");
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchTerm) { // Usamos searchTerm aquí
        queryParams.append('search', searchTerm);
      }

      const url = `${API_BASE_URL}/api/clientes?${queryParams.toString()}`;

      const response = await fetch(url, {
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          logout();
          throw new Error("Sesión expirada o no autorizado. Por favor, inicia sesión de nuevo.");
        }
        throw new Error(errorData.error || "Error al cargar los clientes.");
      }

      const data: ClientesApiResponse = await response.json();
      setClientes(data.clientes);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (err) {
      console.error("Error al obtener clientes:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al cargar clientes.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, getAuthHeader, logout]); 
  
  // ... (tus funciones fetchClientes y getAuthHeader existentes)

  // --- Funciones para API Externa de Departamentos y Municipios (API-Colombia) ---

  const fetchDepartamentos = useCallback(async () => {
    setLoadingDepartamentos(true);
    try {
        const response = await fetch(API_COLOMBIA_DEPARTMENTS_URL);
        if (!response.ok) {
            throw new Error('Error al cargar departamentos');
        }
        const data: DepartmentData[] = await response.json();
        // Ordenar por nombre para mejor UX
        setDepartamentos(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
        console.error("Error al obtener departamentos de API-Colombia:", err);
        // Opcional: podrías mostrar un error al usuario aquí
    } finally {
        setLoadingDepartamentos(false);
    }
  }, []);

  const fetchMunicipios = useCallback(async (departmentId: number) => {
    setLoadingMunicipios(true);
    setMunicipiosFiltrados([]); // Limpiar municipios anteriores al cargar nuevos
    if (!departmentId) {
      setLoadingMunicipios(false);
      return;
    }
    try {
        // Usamos el ID del departamento para obtener sus ciudades
        const url = `${API_COLOMBIA_CITIES_BASE_URL}/${departmentId}/cities`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error al cargar municipios para el departamento ID ${departmentId}`);
        }
        const data: CityData[] = await response.json();
        // Ordenar por nombre para mejor UX
        setMunicipiosFiltrados(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
        console.error("Error al obtener municipios de API-Colombia:", err);
        // Opcional: podrías mostrar un error al usuario aquí
    } finally {
        setLoadingMunicipios(false);
    }
  }, []);// Dependencias de fetchClientes

  // 1. useEffect para la carga inicial de clientes y departamentos (depende del token)
useEffect(() => {
  if (token) {
    fetchClientes();
    fetchDepartamentos(); // Cargar departamentos al iniciar
  } else {
    setLoading(false);
    setError("No autenticado. Por favor, inicia sesión para ver los clientes.");
  }
}, [token, fetchClientes, fetchDepartamentos]); // Dependencias: token, fetchClientes, fetchDepartamentos

// 2. useEffect para cargar municipios basado en el departamento seleccionado
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
}, [selectedDepartmentId, fetchMunicipios, nuevoCliente.departamento]); // <--- ¡QUITAR municipiosFiltrados de aquí! // Dependencias: selectedDepartmentId, fetchMunicipios, nuevoCliente.departamento, municipiosFiltrados

// 3. useEffect para el debounce de la búsqueda (depende del input de búsqueda)
useEffect(() => {
  if (searchDebounceTimeout.current) {
    clearTimeout(searchDebounceTimeout.current);
  }

  searchDebounceTimeout.current = setTimeout(() => {
    setSearchTerm(searchInputValue);
    setCurrentPage(1);
  }, 500);

  return () => {
    if (searchDebounceTimeout.current) {
      clearTimeout(searchDebounceTimeout.current);
    }
  };
}, [searchInputValue]); // Dependencias: searchInputValue 
  
  // Asegúrate de incluir fetchMunicipios // Este useEffect se ejecuta cada vez que searchInputValue cambia

  // --- Manejadores de Eventos para Búsqueda y Paginación ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value); // Actualizar el valor del input inmediatamente
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => { 
  setItemsPerPage(event.target.value);
  setCurrentPage(1);
};

  // ... (el resto de tu código para toggleEstado, abrirModal, etc., es el mismo)
  const toggleEstado = async (id: number) => {
  const clienteToUpdate = clientes.find((cliente) => cliente.id === id);

  if (!clienteToUpdate) {
    setMensajeAlerta("Cliente no encontrado para actualizar estado.");
    setTimeout(() => setMensajeAlerta(""), 3000);
    return;
  }

  const nuevoEstado = !clienteToUpdate.estado;

  setMensajeAlerta("");
  setError(null);

  try {
    const response = await fetch(`${API_BASE_URL}/api/clientes/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({
        nombre: clienteToUpdate.nombre,
        apellido: clienteToUpdate.apellido,
        correo: clienteToUpdate.correo,
        direccion: clienteToUpdate.direccion,
        departamento: clienteToUpdate.departamento, // <--- ¡Añadido!
        municipio: clienteToUpdate.municipio,
        barrio: clienteToUpdate.barrio,
        telefono: clienteToUpdate.telefono,
        tipo_documento: clienteToUpdate.tipo_documento, // <--- ¡Añadido!
        documento: clienteToUpdate.documento,       // <--- ¡Añadido!
        fecha_nacimiento: clienteToUpdate.fecha_nacimiento, // <--- ¡Añadido!
        genero: clienteToUpdate.genero,             // <--- ¡Añadido!
        estado: nuevoEstado,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Acceso denegado: Sesión expirada o no autorizado. Por favor, inicia sesión de nuevo.");
      }
      throw new Error(errorData.error || `Error al cambiar el estado del cliente.`);
    }

    await fetchClientes();
    setMensajeAlerta("Estado del cliente actualizado correctamente.");
    setTimeout(() => setMensajeAlerta(""), 3000);

  } catch (err) {
    console.error("Error al cambiar estado del cliente:", err);
    setError(err instanceof Error ? err.message : "Error desconocido al cambiar el estado.");
    setMensajeAlerta(error || "No se pudo cambiar el estado del cliente.");
    setTimeout(() => setMensajeAlerta(""), 3000);
  }
};

  const abrirModal = () => {
  setNuevoCliente({
    nombre: "",
    apellido: "",
    correo: "",
    direccion: "",
    // ¡Asegúrate de agregar 'departamento' aquí también!
    departamento: "", // <--- ¡Esta es la línea que falta añadir o modificar!
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
  setMensajeAlerta("");
  setError(null);
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
      tipo_documento: cliente.tipo_documento, // Nuevo
      documento: cliente.documento,       // Nuevo
      fecha_nacimiento: cliente.fecha_nacimiento, // Nuevo
      genero: cliente.genero,          // Nuevo
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
    setMensajeAlerta("");
    setError(null);
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
      tipo_documento: "", // ¡AGREGADO!
      documento: "",       // ¡AGREGADO!
      fecha_nacimiento: "", // ¡AGREGADO!
      genero: "",          // ¡AGREGADO!
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


  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    if (name === "departamento") {
        // Al seleccionar un departamento, actualiza el ID del departamento y el nombre
        const selectedDepto = departamentos.find(d => d.name === value);
        setSelectedDepartmentId(selectedDepto ? selectedDepto.id : null);
        setNuevoCliente((prev) => ({ ...prev, [name]: value, municipio: "" })); // También resetear municipio
    } else {
        setNuevoCliente((prev) => ({ ...prev, [name]: value }));
    }
  };

  const verDetalle = async (cliente: Cliente) => {
    setError(null);
    setMensajeAlerta("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/clientes/${cliente.id}`, {
        headers: getAuthHeader(),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          logout();
          throw new Error("Acceso denegado para ver detalle. Inicia sesión.");
        }
        throw new Error(errorData.error || `Error al obtener el detalle del cliente: ${response.statusText}`);
      }
      const data: Cliente = await response.json();
      setDetalleActual(data);
      setModalDetalleOpen(true);
    } catch (err) {
      console.error("Error al obtener detalle del cliente:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al obtener detalle.");
      setMensajeAlerta(error || "No se pudo cargar el detalle del cliente.");
      setTimeout(() => setMensajeAlerta(""), 3000);
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
      !nuevoCliente.municipio.trim()
    ) {
      setMensajeAlerta("Por favor, rellena todos los campos obligatorios (*).");
      setTimeout(() => setMensajeAlerta(""), 3000);
      return;
    }

    setMensajeAlerta("");
    setError(null);

    const method = modoEdicion ? "PUT" : "POST";
    const url = modoEdicion ? `${API_BASE_URL}/api/clientes/${clienteEditandoId}` : `${API_BASE_URL}/api/clientes`;

    const estadoClienteExistente = modoEdicion
      ? clientes.find(c => c.id === clienteEditandoId)?.estado
      : true;

    try {
      const response = await fetch(url, {
        method: method,
        headers: getAuthHeader(),
        body: JSON.stringify({
          ...nuevoCliente,
          // Asegúrate de que los nuevos campos se envíen
          tipo_documento: nuevoCliente.tipo_documento,
          documento: nuevoCliente.documento,
          fecha_nacimiento: nuevoCliente.fecha_nacimiento,
          genero: nuevoCliente.genero,
          estado: estadoClienteExistente,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          logout();
          throw new Error(`Acceso denegado: ${errorData.error || 'No autorizado.'}`);
        }
        throw new Error(errorData.error || `Error al ${modoEdicion ? "actualizar" : "crear"} el cliente.`);
      }

      await fetchClientes();
      setMensajeAlerta(
        `Cliente ${modoEdicion ? "actualizado" : "creado"} correctamente.`
      );
      setTimeout(() => setMensajeAlerta(""), 3000);
      cerrarModal();
    } catch (err) {
      console.error(`Error al ${modoEdicion ? "actualizar" : "crear"} el cliente:`, err);
      setError(err instanceof Error ? err.message : "Error desconocido al guardar cliente.");
      setMensajeAlerta(error || `No se pudo ${modoEdicion ? "actualizar" : "crear"} el cliente.`);
      setTimeout(() => setMensajeAlerta(""), 3000);
    }
  };

  const solicitarConfirmacionEliminacion = (cliente: Cliente) => {
    setClienteAEliminar(cliente);
    setConfirmDialogOpen(true);
  };

  const confirmarEliminacion = async () => {
    if (!clienteAEliminar) return;

    setMensajeAlerta("");
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clientes/${clienteAEliminar.id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          logout();
          throw new Error(`Acceso denegado: ${errorData.error || 'No autorizado.'}`);
        }
        throw new Error(errorData.error || "Error al eliminar el cliente.");
      }

      await fetchClientes();
      setMensajeAlerta("Cliente eliminado correctamente.");
      setTimeout(() => setMensajeAlerta(""), 3000);
    } catch (err) {
      console.error("Error al eliminar cliente:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al eliminar cliente.");
      setMensajeAlerta(error || "No se pudo eliminar el cliente.");
      setTimeout(() => setMensajeAlerta(""), 3000);
    } finally {
      setConfirmDialogOpen(false);
      setClienteAEliminar(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-700 dark:text-gray-300">Cargando clientes...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-700 bg-red-100 border border-red-300 rounded mx-4 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600">
        Error: {error}. Por favor, recarga la página o verifica tu conexión/token.
      </div>
    );
  }

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
            placeholder="Buscar..."
            value={searchInputValue} // Usar el nuevo estado para el input
            onChange={handleSearchChange}
            className="border border-gray-400 bg-white rounded px-4 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="items-per-page-label" className="dark:text-gray-300">Elementos</InputLabel>
            <Select
              labelId="items-per-page-label"
              id="items-per-page-select"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              label="Elementos"
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

      {mensajeAlerta && (
        <div className="mx-4 mb-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded p-2 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600">
          {mensajeAlerta}
        </div>
      )}

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
                  No hay clientes disponibles.
                </td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 flex flex-col sm:flex-row items-center justify-between mt-4">
        {totalItems > 0 && (
          <div className="text-gray-700 dark:text-gray-300 mb-4 sm:mb-0">
            Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} clientes.
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
              // Estilos por defecto para el modo claro (o cuando no hay clase 'dark' activa)
              // Estos serán los estilos base.
              '& .MuiPaginationItem-root': {
                color: 'rgba(0, 0, 0, 0.87)', // Texto oscuro para el modo claro
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)', // Ligero hover para modo claro
                },
              },
              '& .MuiPaginationItem-ellipsis': {
                color: 'rgba(0, 0, 0, 0.6)', // Puntos suspensivos en modo claro
              },
              '& .MuiPaginationItem-icon': {
                color: 'rgba(0, 0, 0, 0.87)', // Íconos de flecha en modo claro
              },

              // Estilos para el botón activo (seleccionado) - se mantiene consistente en ambos modos
              '& .MuiPaginationItem-root.Mui-selected': {
                backgroundColor: '#3f51b5', // Tu color primario
                color: 'white',             // Texto blanco en el botón activo
                opacity: 1,
                '&:hover': {
                  backgroundColor: '#303f9f', // Tono más oscuro para hover
                },
              },

              // Estilos específicos para el modo oscuro (si el html tiene la clase 'dark')
              // Esto sobrescribirá los estilos por defecto cuando el tema oscuro esté activo.
              // Asume que tu modo oscuro agrega la clase 'dark' a <html> o <body>
              '.dark & .MuiPaginationItem-root': {
                color: 'white', // Texto blanco para todos los ítems en modo oscuro
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)', // Ligero hover para modo oscuro
                },
              },
              '.dark & .MuiPaginationItem-ellipsis': {
                color: 'rgba(255, 255, 255, 0.7)', // Puntos suspensivos más claros en modo oscuro
              },
              '.dark & .MuiPaginationItem-icon': {
                color: 'white', // Íconos de flecha blancos en modo oscuro
              },
            }}
          />
        )}
      </div>

      <Modal isOpen={isModalOpen} handleClose={cerrarModal} maxWidthClass="max-w-4xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          {modoEdicion ? "Editar Cliente" : "Agregar Nuevo Cliente"}
        </h2>

        {mensajeAlerta && (
          <div className="mb-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded p-3 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600">
            {mensajeAlerta}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          <FloatingInput
            id="nombre"
            name="nombre"
            label="Nombre *"
            type="text"
            value={nuevoCliente.nombre}
            onChange={handleChange}
            required
          />

          <FloatingInput
            id="apellido"
            name="apellido"
            label="Apellido *"
            type="text"
            value={nuevoCliente.apellido}
            onChange={handleChange}
            required
          />

          {/* Nuevos campos: Tipo de Documento, Documento */}
          <FormControl sx={{ minWidth: 120 }} className="w-full">
            <InputLabel id="tipo-documento-label" className="dark:text-gray-300">Tipo Documento *</InputLabel>
            <Select
              labelId="tipo-documento-label"
              id="tipo_documento"
              name="tipo_documento"
              value={nuevoCliente.tipo_documento}
              onChange={handleSelectChange} // Usamos handleChange porque SelectChangeEvent es compatible
              label="Tipo Documento *"
              className="bg-white dark:bg-gray-800 dark:text-white"
              required
              MenuProps={{
  disablePortal: true,
  sx: {
    '& .MuiPaper-root': {
      zIndex: 1500
    },
  },
}}

            >
              <MenuItem value=""><em>Seleccionar</em></MenuItem>
              <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
              <MenuItem value="CE">Cédula de Extranjería</MenuItem>
            </Select>
          </FormControl>

          <FloatingInput
            id="documento"
            name="documento"
            label="Documento *"
            type="text"
            value={nuevoCliente.documento}
            onChange={handleChange}
            required
          />

          <FloatingInput
            id="correo"
            name="correo"
            label="Correo *"
            type="email"
            value={nuevoCliente.correo}
            onChange={handleChange}
            required
          />

          <FloatingInput
            id="telefono"
            name="telefono"
            label="Teléfono"
            type="text"
            value={nuevoCliente.telefono}
            onChange={handleChange}
          />
          
          {/* Nuevo campo: Fecha de Nacimiento */}
          <FloatingInput
            id="fecha_nacimiento"
            name="fecha_nacimiento"
            label="Fecha de Nacimiento *"
            type="date" // Importante: usar type="date" para el selector de fecha
            value={nuevoCliente.fecha_nacimiento}
            onChange={handleChange}
            required
          />

          {/* Nuevo campo: Género */}
          <FormControl sx={{ minWidth: 120 }} className="w-full">
            <InputLabel id="genero-label" className="dark:text-gray-300">Género *</InputLabel>
            <Select
              labelId="genero-label"
              id="genero"
              name="genero"
              value={nuevoCliente.genero}
              onChange={handleSelectChange}
              label="Género *"
              className="bg-white dark:bg-gray-800 dark:text-white"
              required
              MenuProps={{
  disablePortal: true,
  sx: {
    '& .MuiPaper-root': {
      zIndex: 1500
    },
  },
}}
            >
              <MenuItem value=""><em>Seleccionar</em></MenuItem>
              <MenuItem value="Masculino">Masculino</MenuItem>
              <MenuItem value="Femenino">Femenino</MenuItem>
              <MenuItem value="Otro">Otro</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }} className="w-full">
            <InputLabel id="departamento-label" className="dark:text-gray-300">Departamento *</InputLabel>
            <Select
              labelId="departamento-label"
              id="departamento"
              name="departamento"
              value={nuevoCliente.departamento}
              onChange={handleSelectChange}
              label="Departamento *"
              className="bg-white dark:bg-gray-800 dark:text-white"
              required
              disabled={loadingDepartamentos} // Deshabilitar mientras carga
              MenuProps={{
                disablePortal: true,
                sx: {
                  '& .MuiPaper-root': {
                    zIndex: 1500
                  },
                },
              }}
            >
              <MenuItem value="">
                <em>{loadingDepartamentos ? "Cargando..." : "Seleccionar"}</em>
              </MenuItem>
              {departamentos.map((depto) => (
                <MenuItem key={depto.id} value={depto.name}>
                  {depto.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>


          <FormControl sx={{ minWidth: 120 }} className="w-full">
            <InputLabel id="municipio-label" className="dark:text-gray-300">Municipio *</InputLabel>
            <Select
              labelId="municipio-label"
              id="municipio"
              name="municipio"
              value={nuevoCliente.municipio}
              onChange={handleSelectChange}
              label="Municipio *"
              className="bg-white dark:bg-gray-800 dark:text-white"
              required
              disabled={!selectedDepartmentId || loadingMunicipios} // Deshabilitado si no hay depto o cargando
              MenuProps={{
                disablePortal: true,
                sx: {
                  '& .MuiPaper-root': {
                    zIndex: 1500
                  },
                },
              }}
            >
              <MenuItem value="">
                <em>{loadingMunicipios ? "Cargando..." : "Seleccionar"}</em>
              </MenuItem>
              {municipiosFiltrados.map((mun) => (
                <MenuItem key={mun.id} value={mun.name}>
                  {mun.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <div className="md:col-span-2 lg:col-span-2"> {/* Ajuste para ocupar el espacio */}
          <FloatingInput
            id="barrio"
            name="barrio"
            label="Barrio"
            type="text"
            value={nuevoCliente.barrio}
            onChange={handleChange}
          />
        </div>

          <div className="md:col-span-2 lg:col-span-3"> {/* Ajustar el span si es necesario */}
            <FloatingInput
              id="direccion"
              name="direccion"
              label="Dirección *"
              type="text"
              value={nuevoCliente.direccion}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button
            variant="outlined"
            onClick={cerrarModal}
            startIcon={<CancellIcon />}
            sx={{
              textTransform: "none",
              borderRadius: "9999px",
              padding: "8px 20px",
              fontWeight: 600,
            }}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={guardarCliente}
            sx={{
              textTransform: "none",
              borderRadius: "9999px",
              padding: "8px 20px",
              fontWeight: 600,
            }}
          >
            {modoEdicion ? "Actualizar Cliente" : "Guardar Cliente"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={modalDetalleOpen} handleClose={cerrarDetalle} maxWidthClass="max-w-4xl">
  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
    Detalle del Cliente
  </h2>

  {detalleActual && (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
      <FloatingInput
        id="detalle-nombre"
        name="nombre"
        label="Nombre"
        type="text"
        value={detalleActual.nombre}
        readOnly
      />
      <FloatingInput
        id="detalle-apellido"
        name="apellido"
        label="Apellido"
        type="text"
        value={detalleActual.apellido}
        readOnly
      />
      <FloatingInput
        id="detalle-tipo-documento"
        name="tipo_documento"
        label="Tipo Documento"
        type="text"
        value={detalleActual.tipo_documento}
        readOnly
      />
      <FloatingInput
        id="detalle-documento"
        name="documento"
        label="Documento"
        type="text"
        value={detalleActual.documento}
        readOnly
      />
      <FloatingInput
        id="detalle-fecha-nacimiento"
        name="fecha_nacimiento"
        label="Fecha de Nacimiento"
        type="text" // Puedes mantener como 'text' para mostrar la fecha formateada
        value={detalleActual.fecha_nacimiento}
        readOnly
      />
      <FloatingInput
        id="detalle-genero"
        name="genero"
        label="Género"
        type="text"
        value={detalleActual.genero}
        readOnly
      />
      <FloatingInput
        id="detalle-correo"
        name="correo"
        label="Correo"
        type="email"
        value={detalleActual.correo}
        readOnly
      />
      <FloatingInput
        id="detalle-telefono"
        name="telefono"
        label="Teléfono"
        type="text"
        value={detalleActual.telefono || "N/A"}
        readOnly
      />
      {/* ¡Añadir el campo de Departamento aquí! */}
      <FloatingInput
        id="detalle-departamento"
        name="departamento"
        label="Departamento"
        type="text"
        value={detalleActual.departamento}
        readOnly
      />
      <FloatingInput
        id="detalle-municipio"
        name="municipio"
        label="Municipio"
        type="text"
        value={detalleActual.municipio}
        readOnly
      />
      <div className="md:col-span-2 lg:col-span-2">
        <FloatingInput
          id="detalle-barrio"
          name="barrio"
          label="Barrio"
          type="text"
          value={detalleActual.barrio}
          readOnly
        />
      </div>
      <div className="md:col-span-2 lg:col-span-2">
        <FloatingInput
          id="detalle-direccion"
          name="direccion"
          label="Dirección"
          type="text"
          value={detalleActual.direccion}
          readOnly
        />
      </div>
      <FloatingInput
        id="detalle-estado"
        name="estado"
        label="Estado"
        type="text"
        value={detalleActual.estado ? "Activo" : "Inactivo"}
        readOnly
      />
    </div>
  )}

  <div className="mt-8 flex justify-end">
    <Button
      variant="contained"
      color="primary"
      onClick={cerrarDetalle}
      sx={{
        textTransform: 'none',
        borderRadius: "9999px",
        padding: "8px 20px",
        fontWeight: 600,
      }}
    >
      Cerrar
    </Button>
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