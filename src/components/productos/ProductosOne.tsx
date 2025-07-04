import { useState, useEffect, useMemo } from "react";
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
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

// --- Importaciones de Contexto y UI Personalizada ---
import { useAuth } from "../../context/authContext";
import Modal from "../ui/modal/Modal"; // Se mantiene si lo usas para el detalle, o se puede migrar a Dialog

// --- Interfaces ---
interface ProductoVariante {
  id_talla: number;
  nombre_talla: string;
  color: string;
  stock: number; // El stock se mostrará, pero no se edita desde aquí
}

interface Producto {
  id: number;
  nombre: string;
  valor: number;
  estado: boolean;
  nombre_marca: string;
  variantes: ProductoVariante[];
}

// Interfaz para el formulario de variantes (solo talla y color para creación/edición)
interface FormVariante {
  id_talla: number;
  nombre_talla: string; // Para mostrar en el select si es necesario, o buscar por id_talla
  color: string;
}

// --- URLs de API ---
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api';

export default function ProductosTable() {
  // --- ESTADOS ---
  const [allProductos, setAllProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showAgregarModal, setShowAgregarModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);

  const [nuevoProductoForm, setNuevoProductoForm] = useState({
    nombre: "",
    valor: "",
    id_marca: "",
    estado: true,
  });

  // Las variantes en el formulario ahora solo necesitan talla y color para crear
  const [variantesForm, setVariantesForm] = useState<FormVariante[]>([]);
  const [tallasDisponibles, setTallasDisponibles] = useState<{ id_talla: number, talla: string }[]>([]);
  const [marcasDisponibles, setMarcasDisponibles] = useState<{ id: number, marca: string }[]>([]);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [detalleActual, setDetalleActual] = useState<Producto | null>(null);

  const { token, logout } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- LÓGICA DE DATOS ---
  const fetchProductos = async () => {
    if (!token) {
      setError("No autenticado. Por favor, inicia sesión para ver los productos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/productos`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error("Sesión expirada o no autorizada. Por favor, inicia sesión de nuevo.");
          logout();
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }
      const data: Producto[] = await response.json();
      const parsedData: Producto[] = data.map(p => ({
        ...p,
        valor: typeof p.valor === 'string' ? parseFloat(p.valor) : (p.valor as number)
      }));
      setAllProductos(parsedData);
      setCurrentPage(1); // Reiniciar paginación al cargar nuevos datos
    } catch (err: any) {
      setError(`No se pudieron cargar los productos: ${err.message}`);
      toast.error(`Error al cargar productos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTallas = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/tallas`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data: { id_talla: number, talla: string }[] = await response.json();
      setTallasDisponibles(data);
    } catch (err: any) {
      toast.error(`Error al cargar tallas: ${err.message}`);
    }
  };

  const fetchMarcas = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/marcas`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data: { id: number, marca: string }[] = await response.json();
      setMarcasDisponibles(data);
    } catch (err: any) {
      toast.error(`Error al cargar marcas: ${err.message}`);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProductos();
      fetchTallas();
      fetchMarcas();
    }
  }, [token]);

  const { currentTableData, totalPages, totalItems } = useMemo(() => {
    let filteredData = allProductos;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filteredData = allProductos.filter(producto =>
        (producto.nombre && producto.nombre.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (producto.nombre_marca && producto.nombre_marca.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (producto.id.toString().includes(lowerCaseSearchTerm)) ||
        (producto.valor.toString().includes(lowerCaseSearchTerm)) ||
        (producto.variantes.some(v => v.color.toLowerCase().includes(lowerCaseSearchTerm))) ||
        (producto.variantes.some(v => v.nombre_talla.toLowerCase().includes(lowerCaseSearchTerm)))
      );
    }

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProductos = filteredData.slice(startIndex, endIndex);

    return { currentTableData: paginatedProductos, totalPages, totalItems };

  }, [allProductos, searchTerm, currentPage, itemsPerPage]);

  // --- MANEJADORES DE EVENTOS Y ACCIONES CRUD ---
  const handleAction = async (action: () => Promise<any>, successMessage: string, errorMessage: string) => {
    if (!token) return toast.error("No autenticado.");
    try {
      await action();
      toast.success(successMessage);
      await fetchProductos();
    } catch (err: any) {
      toast.error(`${errorMessage}: ${err.message}`);
      if (err.status === 401 || err.status === 403) logout();
    }
  };

  const handleAgregarProducto = async () => {
    const { nombre, valor, id_marca, estado } = nuevoProductoForm;

    // Validar que al menos haya una variante y que sus campos básicos estén llenos
    const isValidVariantes = variantesForm.every(v => v.id_talla !== 0 && v.color.trim() !== '');

    if (!nombre || !valor || !id_marca || variantesForm.length === 0 || !isValidVariantes) {
      toast.error("Por favor completa todos los campos principales y asegura que cada variante tenga Talla y Color válidos.");
      return;
    }

    const apiCall = async () => {
      const payload = {
        nombre,
        valor: parseFloat(valor),
        id_marca: parseInt(id_marca),
        estado,
        tallasYColores: variantesForm.map(v => ({
          id_talla: v.id_talla,
          color: v.color,
          cantidad: 0 // El stock inicial es 0 al crear un producto desde aquí
        })),
      };

      const response = await fetch(`${API_BASE_URL}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }
    };
    handleAction(apiCall, "Producto creado correctamente.", "Error al crear producto")
      .finally(() => handleCloseModal());
  };

  const handleEditarProducto = async () => {
    const { nombre, valor, id_marca, estado } = nuevoProductoForm;

    if (!detalleActual) return;

    const isValidVariantes = variantesForm.every(v => v.id_talla !== 0 && v.color.trim() !== '');

    if (!nombre || !valor || !id_marca || variantesForm.length === 0 || !isValidVariantes) {
      toast.error("Por favor completa todos los campos principales y asegura que cada variante tenga Talla y Color válidos.");
      return;
    }

    const apiCall = async () => {
      const payload = {
        nombre,
        valor: parseFloat(valor),
        id_marca: parseInt(id_marca),
        estado,
        // Al editar, si no se introduce stock, se envía el stock existente
        // Aquí no se está permitiendo editar el stock directamente
        tallasYColores: variantesForm.map(v => {
          const existingVariant = detalleActual.variantes.find(
            ev => ev.id_talla === v.id_talla && ev.color === v.color
          );
          return {
            id_talla: v.id_talla,
            color: v.color,
            cantidad: existingVariant ? existingVariant.stock : 0 // Si es una variante nueva al editar, su stock inicial es 0
          };
        }),
      };

      const response = await fetch(`${API_BASE_URL}/productos/${detalleActual.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }
    };
    handleAction(apiCall, "Producto actualizado correctamente.", "Error al actualizar producto")
      .finally(() => handleCloseModal());
  };

  const confirmarEliminacion = () => {
    if (!productoAEliminar) return;
    const apiCall = async () => {
      const response = await fetch(`${API_BASE_URL}/productos/${productoAEliminar.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }
    };
    handleAction(apiCall, "Producto eliminado.", "Error al eliminar.")
      .finally(() => {
        setConfirmDialogOpen(false);
        setProductoAEliminar(null);
      });
  };

  const toggleEstado = (producto: Producto) => {
    const apiCall = async () => {
      // Para cambiar el estado, necesitamos enviar todos los campos que el PUT requiere.
      // El stock de las variantes se mantiene como está.
      const payload = {
        nombre: producto.nombre,
        valor: producto.valor,
        id_marca: marcasDisponibles.find(m => m.marca === producto.nombre_marca)?.id || 0,
        estado: !producto.estado, // Cambiar el estado
        tallasYColores: producto.variantes.map(v => ({
          id_talla: v.id_talla,
          color: v.color,
          cantidad: v.stock // Mantener el stock existente
        }))
      };

      const response = await fetch(`${API_BASE_URL}/productos/${producto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }
    };
    handleAction(apiCall, "Estado actualizado.", "Error al cambiar estado.");
  };

  // --- MANEJADORES DE UI (MODALES, PAGINACIÓN, ETC.) ---
  const handleCloseModal = () => {
    setShowAgregarModal(false);
    setShowEditarModal(false);
    setNuevoProductoForm({
      nombre: "",
      valor: "",
      id_marca: "",
      estado: true,
    });
    setVariantesForm([]);
    setDetalleActual(null);
  };

  const abrirModalEditar = (producto: Producto) => {
    setDetalleActual(producto);
    setNuevoProductoForm({
      nombre: producto.nombre,
      valor: producto.valor.toString(),
      id_marca: marcasDisponibles.find(m => m.marca === producto.nombre_marca)?.id.toString() || '',
      estado: producto.estado,
    });
    // Al editar, solo necesitamos la talla y el color para el formulario
    setVariantesForm(
      producto.variantes.map((v) => ({
        id_talla: v.id_talla,
        nombre_talla: v.nombre_talla,
        color: v.color,
      }))
    );
    setShowEditarModal(true);
  };

  const verDetalle = (producto: Producto) => {
    setDetalleActual(producto);
    setModalDetalleOpen(true);
  };

  const cerrarDetalle = () => setModalDetalleOpen(false);

  const solicitarConfirmacionEliminacion = (producto: Producto) => {
    setProductoAEliminar(producto);
    setConfirmDialogOpen(true);
  };

  const handleProductoFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    setNuevoProductoForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVarianteChange = (
    index: number,
    field: keyof FormVariante,
    value: string | number
  ) => {
    const newVariantes = [...variantesForm];
    newVariantes[index] = { ...newVariantes[index], [field]: field === 'id_talla' ? (Number(value) || 0) : value };
    setVariantesForm(newVariantes);
  };

  const addEmptyVariante = () => {
    setVariantesForm((prev) => [
      ...prev,
      { id_talla: 0, nombre_talla: '', color: '' }, // No 'cantidad' aquí
    ]);
  };

  const removeVariante = (index: number) => {
    setVariantesForm((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => setCurrentPage(value);

  const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
    setItemsPerPage(parseInt(event.target.value as string, 10));
    setCurrentPage(1);
  };

  if (loading && allProductos.length === 0) return <div className="p-4 text-center">Cargando productos...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
      {/* --- BARRA SUPERIOR CON BOTÓN, BÚSQUEDA Y PAGINACIÓN --- */}
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between flex-wrap gap-4">
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setShowAgregarModal(true);
            setVariantesForm([{ id_talla: 0, nombre_talla: '', color: '' }]); // Inicia con una variante vacía sin cantidad
          }}
          sx={{ textTransform: 'none' }}
        >
          Agregar Producto
        </Button>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar por nombre, código, marca, color, talla..."
            className="border border-gray-400 bg-white rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel>Items/pág</InputLabel>
            <Select value={itemsPerPage} label="Items/pág" onChange={handleItemsPerPageChange}
              sx={{
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'gray !important' },
                '.MuiSelect-select': { paddingRight: '30px !important' },
                '.MuiSvgIcon-root': { color: 'gray !important' },
                color: 'black',
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--brand-500) !important',
                },
              }}
              className="bg-white dark:bg-gray-800 dark:text-white"
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      {/* --- TABLA DE PRODUCTOS --- */}
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-gray-400 dark:border-white/[0.05]">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider dark:text-gray-100">Código</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider dark:text-gray-100">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider dark:text-gray-100">Valor</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider dark:text-gray-100">Cantidad Total</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider dark:text-gray-100">Marca</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider dark:text-gray-100">Estado</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-black uppercase tracking-wider dark:text-gray-100">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
            {currentTableData.length > 0 ? (
              currentTableData.map((producto) => (
                <tr key={producto.id}>
                  <td className="px-5 py-4 whitespace-nowrap text-gray-800 text-theme-sm dark:text-white/90">{producto.id}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-gray-800 text-theme-sm dark:text-white/90">{producto.nombre}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-gray-800 text-theme-sm dark:text-white/90">
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0,
                    }).format(producto.valor)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-gray-800 text-theme-sm dark:text-white/90">
                    {producto.variantes.reduce((sum, variante) => sum + variante.stock, 0)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-gray-800 text-theme-sm dark:text-white/90">{producto.nombre_marca}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      onClick={() => toggleEstado(producto)}
                      className={`cursor-pointer px-2 py-1 rounded-full text-xs font-semibold ${producto.estado ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}
                    >
                      {producto.estado ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap space-x-1">
                    <Tooltip title="Ver Detalle">
                      <IconButton color="secondary" onClick={() => verDetalle(producto)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton color="primary" onClick={() => abrirModalEditar(producto)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton color="error" onClick={() => solicitarConfirmacionEliminacion(producto)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-600 dark:text-gray-400">
                  No hay productos registrados que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- BARRA INFERIOR CON INFO Y PAGINACIÓN --- */}
      <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-400 dark:border-white/[0.05]">
          <p className="text-sm text-gray-700 dark:text-gray-300">Mostrando {currentTableData.length} de {totalItems} productos</p>
          {totalPages > 1 && (
            <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
                className="mt-4 sm:mt-0"
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

      {/* --- MODAL DE AGREGAR/EDITAR PRODUCTO --- */}
      <Dialog open={showAgregarModal || showEditarModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
          {showAgregarModal ? "Agregar Nuevo Producto" : "Editar Producto"}
        </DialogTitle>

        <DialogContent dividers>
          {/* Campos principales: ahora en 2 columnas para un mejor ajuste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <TextField
              name="nombre"
              label="Nombre *"
              value={nuevoProductoForm.nombre}
              onChange={handleProductoFormChange}
              fullWidth
              variant="outlined"
              required
            />

            <TextField
              name="valor"
              label="Valor *"
              type="text"
              value={new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
              }).format(Number(nuevoProductoForm.valor) || 0)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, ""); // elimina $ . , etc
                const valorNumerico = parseInt(raw, 10) || 0;
                handleProductoFormChange({
                  target: { name: "valor", value: valorNumerico.toString() },
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              fullWidth
              variant="outlined"
              required
            />

            <FormControl fullWidth variant="outlined" className="sm:col-span-2">
              <InputLabel id="marca-select-label">Marca *</InputLabel>
              <Select
                labelId="marca-select-label"
                name="id_marca"
                value={nuevoProductoForm.id_marca}
                label="Marca *"
                onChange={handleProductoFormChange}
                required
              >
                <MenuItem value="">Seleccionar</MenuItem>
                {marcasDisponibles.map((marca) => (
                  <MenuItem key={marca.id} value={marca.id}>
                    {marca.marca}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* TALLAS Y COLORES (Dinámicos) */}
          <div className="mt-6">
            <label className="block text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Variantes <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700">
              {variantesForm.length === 0 && (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                  Haz clic en "Añadir Variante" para empezar.
                </p>
              )}
              {variantesForm.map((variante, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id={`talla-select-label-${index}`}>Talla</InputLabel>
                    <Select
                      labelId={`talla-select-label-${index}`}
                      name="id_talla"
                      value={variante.id_talla === 0 ? '' : variante.id_talla.toString()}
                      label="Talla"
                      onChange={(e) => handleVarianteChange(index, "id_talla", parseInt(e.target.value as string, 10))}
                      required
                    >
                      <MenuItem value="">Seleccione</MenuItem>
                      {tallasDisponibles.map((talla) => (
                        <MenuItem key={talla.id_talla} value={talla.id_talla}>
                          {talla.talla}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    name="color"
                    label="Color"
                    type="text"
                    value={variante.color}
                    onChange={(e) => handleVarianteChange(index, "color", e.target.value)}
                    fullWidth
                    variant="outlined"
                    required
                  />

                  <div className="flex justify-center items-center h-full">
                    <Tooltip title="Eliminar Variante">
                      <IconButton color="error" onClick={() => removeVariante(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addEmptyVariante}
              className="mt-4 px-4 py-2 rounded-full border border-brand-500 text-brand-500 hover:bg-brand-500/10 dark:hover:bg-brand-500/20 transition flex items-center gap-2 font-semibold"
            >
              <AddIcon fontSize="small" />
              Añadir Variante
            </button>
          </div>
        </DialogContent>

        <DialogActions className="pt-6">
          <Button onClick={handleCloseModal}>Cancelar</Button>
          <Button onClick={showAgregarModal ? handleAgregarProducto : handleEditarProducto} variant="contained">
            {showAgregarModal ? "Guardar Producto" : "Actualizar Producto"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- MODAL DE VER DETALLE --- */}
      <Dialog open={modalDetalleOpen} onClose={cerrarDetalle} maxWidth="md" fullWidth>
        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
          Detalle del Producto
        </DialogTitle>

        <DialogContent dividers>
          {detalleActual && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div className="col-span-1"><strong>Código:</strong> {detalleActual.id}</div>
              <div className="col-span-1"><strong>Nombre:</strong> {detalleActual.nombre}</div>
              <div className="col-span-1"><strong>Valor:</strong> {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(detalleActual.valor)}</div>
              <div className="col-span-1"><strong>Cantidad Total:</strong> {detalleActual.variantes.reduce((sum, v) => sum + v.stock, 0)}</div>
              <div className="col-span-1"><strong>Marca:</strong> {detalleActual.nombre_marca}</div>
              <div className="col-span-1"><strong>Estado:</strong> {detalleActual.estado ? "Activo" : "Inactivo"}</div>

              <div className="col-span-full mt-4">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Variantes del Producto</h3>
                <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 pr-1 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                  {detalleActual.variantes.length > 0 ? (
                    detalleActual.variantes.map((variante, index) => (
                      <div
                        key={`${variante.id_talla}-${variante.color}-${index}`}
                        className="p-3 border border-gray-300 bg-gray-100 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <p className="text-sm font-medium mb-1">
                          Talla: <span className="font-semibold">{variante.nombre_talla}</span>
                        </p>
                        <p className="text-sm font-medium mb-1">
                          Color: <span className="font-semibold">{variante.color}</span>
                        </p>
                        <p className="font-semibold">Cantidad: {variante.stock}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 col-span-full">
                      No hay variantes registradas para este producto.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={cerrarDetalle} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>


      {/* --- DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN --- */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
            <DialogContentText>
                ¿Estás seguro de que deseas eliminar el producto{' '}
                <strong className="font-semibold">{productoAEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
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
