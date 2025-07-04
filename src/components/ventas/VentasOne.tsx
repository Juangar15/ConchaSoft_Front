import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel'; // Para el modal de eliminación
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

import { useAuth } from '../../context/authContext';

const API_BASE_URL = 'https://conchasoft-api.onrender.com/api'; 

/**
 * @interface Venta
 * @description Define la estructura de un objeto Venta.
 */
interface Venta {
  id: number;
  cliente: string;
  fecha: string; // O Date, dependiendo de cómo lo manejes
  total: number;
  estado: string; // Por ejemplo: "Pendiente", "Completada", "Cancelada"
  // Agrega aquí cualquier otro campo relevante que necesites para la edición o visualización
}

export default function VentasTable() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [ventaAEliminar, setVentaAEliminar] = useState<Venta | null>(null);

  /**
   * @state nuevaVenta
   * @description Almacena los datos de la venta que se está creando o editando.
   */
  const [nuevaVenta, setNuevaVenta] = useState<Venta>({
    id: 0,
    cliente: "",
    fecha: new Date().toISOString().split('T')[0], // Inicializa con la fecha actual en formato YYYY-MM-DD
    total: 0,
    estado: "Pendiente", // Estado inicial predeterminado
  });

  const [modoEdicion, setModoEdicion] = useState(false);
  const [ventaEditandoId, setVentaEditandoId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * @function fetchVentas
   * @description Obtiene las ventas desde la API, aplicando paginación y búsqueda.
   */
  const fetchVentas = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      setError("No autenticado. Por favor, inicia sesión para ver las ventas.");
      toast.info("Necesitas iniciar sesión para ver las ventas.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      const response = await fetch(`${API_BASE_URL}/ventas?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status}` }));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data.ventas)) {
        setVentas(data.ventas);
      } else {
        setVentas([]);
      }

      setTotalItems(data.totalItems || 0);
      setTotalPages(data.totalPages || 1);

    } catch (err) {
      setError(`No se pudieron cargar las ventas: ${err instanceof Error ? err.message : "Error desconocido"}`);
      toast.error(`Error al cargar las ventas: ${err instanceof Error ? err.message : "Error desconocido"}`);
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentas();
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isAuthenticated, token, currentPage, itemsPerPage]);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (currentPage !== 1 && searchTerm !== "") {
          setCurrentPage(1);
      } else {
          fetchVentas();
      }
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // --- PAGINATION AND SEARCH HANDLERS ---
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  /**
   * @function abrirModal
   * @description Abre el modal para agregar una nueva venta.
   * Reinicia el estado `nuevaVenta` a valores predeterminados.
   */
  const abrirModal = () => {
    setNuevaVenta({ 
      id: 0, 
      cliente: "", 
      fecha: new Date().toISOString().split('T')[0], 
      total: 0, 
      estado: "Pendiente" 
    });
    setModoEdicion(false);
    setVentaEditandoId(null);
    setIsModalOpen(true);
  };

  /**
   * @function abrirModalEditar
   * @description Abre el modal para editar una venta existente.
   * Carga los datos de la venta seleccionada en el estado `nuevaVenta`.
   */
  const abrirModalEditar = (ventaData: Venta) => {
    setNuevaVenta({
      id: ventaData.id,
      cliente: ventaData.cliente,
      fecha: ventaData.fecha.split('T')[0], // Asegura formato YYYY-MM-DD para input type="date"
      total: ventaData.total,
      estado: ventaData.estado,
    });
    setModoEdicion(true);
    setVentaEditandoId(ventaData.id);
    setIsModalOpen(true);
  };

  /**
   * @function cerrarModal
   * @description Cierra el modal y reinicia el estado `nuevaVenta`.
   */
  const cerrarModal = () => {
    setIsModalOpen(false);
    setNuevaVenta({ id: 0, cliente: "", fecha: new Date().toISOString().split('T')[0], total: 0, estado: "Pendiente" });
    setModoEdicion(false);
    setVentaEditandoId(null);
  };

  /**
   * @function handleChange
   * @description Maneja los cambios en los inputs del formulario del modal.
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    // Si es un input de tipo number, convierte el valor a número, si no es válido, usa 0
    const val = type === 'number' ? (parseFloat(value) || 0) : value;
    setNuevaVenta((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  /**
   * @function guardarVenta
   * @description Guarda (crea o actualiza) una venta en la API.
   */
  const guardarVenta = async () => {
    if (!nuevaVenta.cliente.trim() || !nuevaVenta.fecha || nuevaVenta.total <= 0) {
      toast.warn("Por favor, completa todos los campos requeridos (Cliente, Fecha, Total > 0).");
      return;
    }
    if (!isAuthenticated || !token) {
      toast.error("No estás autorizado para guardar ventas.");
      return;
    }

    try {
      let method: string;
      let url: string;
      let successMessage: string;

      const payload = {
        cliente: nuevaVenta.cliente,
        fecha: nuevaVenta.fecha,
        total: nuevaVenta.total,
        estado: nuevaVenta.estado,
      };

      if (modoEdicion && ventaEditandoId !== null) {
        method = 'PUT';
        url = `${API_BASE_URL}/ventas/${ventaEditandoId}`;
        successMessage = "Venta actualizada correctamente.";
      } else {
        method = 'POST';
        url = `${API_BASE_URL}/ventas`;
        successMessage = "Venta registrada correctamente.";
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
        throw new Error(errorData.error || `Error al guardar venta: ${response.status}`);
      }

      await fetchVentas();
      toast.success(successMessage);
      cerrarModal();
    } catch (err) {
      toast.error(`Error al guardar la venta: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  };

  /**
   * @function solicitarConfirmacionEliminacion
   * @description Abre el diálogo de confirmación antes de eliminar una venta.
   */
  const solicitarConfirmacionEliminacion = (venta: Venta) => {
    setVentaAEliminar(venta);
    setConfirmDialogOpen(true);
  };

  /**
   * @function confirmarEliminacion
   * @description Confirma y elimina una venta de la API.
   */
  const confirmarEliminacion = async () => {
    if (!isAuthenticated || !token) {
      toast.error("No estás autorizado para eliminar ventas.");
      setConfirmDialogOpen(false);
      return;
    }

    if (ventaAEliminar) {
      try {
        const response = await fetch(`${API_BASE_URL}/ventas/${ventaAEliminar.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Error HTTP: ${response.status}` }));
          throw new Error(errorData.error || `Error al eliminar venta: ${response.status}`);
        }

        await fetchVentas();
        toast.success("Venta eliminada correctamente.");
      } catch (err) {
        toast.error(`Error al eliminar la venta: ${err instanceof Error ? err.message : "Error desconocido"}`);
      } finally {
        setConfirmDialogOpen(false);
        setVentaAEliminar(null);
      }
    }
  };

  // --- Component Rendering ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-gray-600 dark:text-gray-300">Cargando ventas...</p>
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

  if (!Array.isArray(ventas)) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-red-600 dark:text-red-400">
          Error interno: Los datos de ventas no son válidos. Por favor, contacta a soporte.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4 flex flex-col sm:flex-row items-center justify-end flex-wrap gap-4">
        <div className="mr-auto">
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={abrirModal}
            sx={{ textTransform: 'none' }}
          >
            Registrar Nueva Venta
          </Button>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar venta por cliente, estado..."
            value={searchTerm}
            onChange={handleChangeSearch}
            className="border border-gray-400 bg-white rounded px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
          />

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
                ID Venta
              </TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Cliente
              </TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Fecha
              </TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Total
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
            {ventas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-gray-600 dark:text-gray-400">
                  No hay ventas disponibles.
                </TableCell>
              </TableRow>
            ) : (
              ventas.map((venta) => (
                <TableRow key={venta.id}>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    {venta.id}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    {venta.cliente}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    {new Date(venta.fecha).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    ${venta.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                    {venta.estado}
                  </TableCell>
                  <TableCell className="px-5 py-4 space-x-2">
                    <Tooltip title="Ver Detalles">
                      <IconButton
                        color="info"
                        onClick={() => navigate(`/ventas/${venta.id}`)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton
                        color="primary"
                        onClick={() => abrirModalEditar(venta)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        color="error"
                        onClick={() => solicitarConfirmacionEliminacion(venta)}
                      >
                        <DeleteIcon />
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
                Mostrando {ventas.length} de {totalItems} ventas
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

      {/* Modal para Agregar/Editar Venta */}
      <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="sm" fullWidth>
        <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
          {modoEdicion ? "Editar Venta" : "Registrar Nueva Venta"}
        </DialogTitle>

        <DialogContent className="pt-2 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cliente <span className="text-error-500">*</span>
            </label>
            <input
              name="cliente"
              type="text"
              value={nuevaVenta.cliente}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fecha <span className="text-error-500">*</span>
            </label>
            <input
              name="fecha"
              type="date"
              value={nuevaVenta.fecha}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total <span className="text-error-500">*</span>
            </label>
            <input
              name="total"
              type="number"
              step="0.01" // Permite decimales
              value={nuevaVenta.total}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Estado <span className="text-error-500">*</span>
            </label>
            <select
              name="estado"
              value={nuevaVenta.estado}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Completada">Completada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
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
            onClick={guardarVenta}
            className="px-5 py-2 rounded-full bg-brand-500 text-white hover:bg-brand-600 transition"
          >
            {modoEdicion ? "Actualizar" : "Guardar"}
          </button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmación de Eliminación */}
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
            ¿Estás seguro de que deseas eliminar la venta del cliente{' '}
            <strong className="font-semibold text-red-600">{ventaAEliminar?.cliente}</strong>
            {' '}con ID <strong className="font-semibold text-red-600">{ventaAEliminar?.id}</strong>? Esta acción no se puede deshacer.
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