import { useState, useEffect, useMemo } from "react";
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
import TextField from '@mui/material/TextField';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from "@mui/material/IconButton";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Tooltip from '@mui/material/Tooltip';
import Modal from "../ui/modal/Modal";
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


import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useAuth } from '../../context/authContext';

// --- CONFIGURACIÓN DE LA URL BASE DE TU API ---
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api';

/**
 * @interface Compra
 * @description Define la estructura de una Compra para la lista principal.
 */
interface Compra {
  id: number;
  fecha: string;
  total: number;
  estado: 0 | 1;
  tipo_pago: string;
  id_proveedor: number;
  nombre_proveedor: string;
}

/**
 * @interface CompraProductoDetalle
 * @description Estructura de un producto dentro del detalle de una compra.
 */
interface CompraProductoDetalle {
  id: number; // Mapeado desde id_compra_prod_item para la key de React
  id_producto: number;
  id_talla: number;
  id_producto_talla: number;
  nombre_producto: string;
  nombre_talla: string;
  color: string;
  cantidad: number;
  precio_unitario: number; // Parseado a number
  subtotal: number; // Parseado a number
}

/**
 * @interface ProductoAPI
 * @description Estructura de un producto como lo devuelve /api/productos.
 */
interface ProductoAPI {
  id: number;
  nombre: string;
  valor: string;
  estado: 0 | 1;
  nombre_marca: string;
  variantes: {
    id_producto_talla: number;
    id_talla: number;
    nombre_talla: string;
    color: string;
    stock: number;
  }[];
}

/**
 * @interface ProductoSeleccionable
 * @description Estructura aplanada de una variante de producto para los selectores.
 */
interface ProductoSeleccionable {
  id_producto_talla: number;
  id_producto: number;
  nombre_producto: string;
  id_talla: number;
  nombre_talla: string;
  color: string;
  stock_disponible: number;
  precio_unitario: number;
}


/**
 * @interface ProveedorSeleccionable
 * @description Estructura de un proveedor para los selectores.
 */
interface ProveedorSeleccionable {
  id: number;
  nombre_comercial: string;
  razon_social: string | null;
}

export default function ComprasTable() {
  // --- ESTADOS LOCALES ---
  const [allCompras, setAllCompras] = useState<Compra[]>([]); // Almacena TODAS las compras
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { token, isAuthenticated, logout } = useAuth();

  // --- Estados para paginación y búsqueda (CLIENT-SIDE) ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // --- Estados para el modal de Ver Detalle ---
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [detalleActual, setDetalleActual] = useState<Compra | null>(null);
  const [productosDetalle, setProductosDetalle] = useState<CompraProductoDetalle[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // --- Estados para el modal de Agregar/Editar Compra ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [compraEditandoId, setCompraEditandoId] = useState<number | null>(null);

  // Estado para el formulario de nueva/edición compra
  const [nuevaCompra, setNuevaCompra] = useState({
    fecha: new Date().toISOString().split("T")[0],
    tipo_pago: "Efectivo",
    id_proveedor: null as number | null,
    productos: [] as {
      id_producto_talla: number;
      id_producto: number;
      id_talla: number;
      color: string;
      cantidad: number;
      precio_unitario: number;
      nombre_producto: string;
      nombre_talla: string;
      stock_disponible?: number;
    }[],
  });

  // --- Estados para datos de selección (dropdowns en el modal) ---
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoSeleccionable[]>([]);
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState<ProveedorSeleccionable[]>([]);
  const [loadingSelects, setLoadingSelects] = useState(false);
  const [errorSelects, setErrorSelects] = useState<string | null>(null);

  // --- Estados para confirmación de anulación ---
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [compraAAnular, setCompraAAnular] = useState<Compra | null>(null);

  /**
   * @function fetchCompras
   * @description Obtiene TODAS las compras de la API para manejarlas en el cliente.
   */
  const fetchCompras = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      setError("No autenticado. Por favor, inicia sesión.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/compras`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        toast.error("Sesión expirada o no autorizado.");
        logout();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        const processedCompras = data.map(compra => ({
          ...compra,
          total: parseFloat(compra.total) || 0
        }));
        setAllCompras(processedCompras);
      } else {
        throw new Error("Formato de datos de compras inválido de la API.");
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(`No se pudieron cargar las compras: ${errorMessage}`);
      toast.error(`Error al cargar compras: ${errorMessage}`);
      setAllCompras([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * @function fetchSelectOptions
   * @description Obtiene productos y proveedores para los selectores del modal.
   */
  const fetchSelectOptions = async () => {
    if (!isAuthenticated || !token) return;
    setLoadingSelects(true);
    setErrorSelects(null);
    try {
      // Fetch de Productos
      const productsResponse = await fetch(`${API_BASE_URL}/productos/activos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!productsResponse.ok) throw new Error('Error al cargar productos.');
      const productsData: ProductoAPI[] = await productsResponse.json();

      const flattenedProducts: ProductoSeleccionable[] = productsData.flatMap(product =>
        product.variantes.map(variant => ({
          id_producto_talla: variant.id_producto_talla,
          id_producto: product.id,
          nombre_producto: product.nombre,
          id_talla: variant.id_talla,
          nombre_talla: variant.nombre_talla,
          color: variant.color,
          stock_disponible: variant.stock,
          precio_unitario: parseFloat(product.valor) || 0
        }))
      );
      setProductosDisponibles(flattenedProducts);

      // Fetch de Proveedores
      const suppliersResponse = await fetch(`${API_BASE_URL}/proveedores/activos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!suppliersResponse.ok) throw new Error('Error al cargar proveedores.');
      const suppliersData: ProveedorSeleccionable[] = await suppliersResponse.json();
      setProveedoresDisponibles(suppliersData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setErrorSelects(`Error al cargar opciones: ${errorMessage}`);
      toast.error(`Error al cargar opciones: ${errorMessage}`);
    } finally {
      setLoadingSelects(false);
    }
  };

  // Efecto para la carga inicial de datos.
  useEffect(() => {
    fetchCompras();
  }, [isAuthenticated, token]);

  // Se asegura de que las opciones estén cargadas cuando el modal de agregar/editar abre.
  useEffect(() => {
    if (isModalOpen && (!productosDisponibles.length || !proveedoresDisponibles.length)) {
      fetchSelectOptions();
    }
  }, [isModalOpen]);


  // --- LÓGICA DE BÚSQUEDA Y PAGINACIÓN EN EL CLIENTE ---
  const { currentTableData, totalPages, totalItems } = useMemo(() => {
    let filteredCompras = allCompras;

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filteredCompras = allCompras.filter(compra =>
        compra.id.toString().includes(lowercasedFilter) ||
        compra.nombre_proveedor.toLowerCase().includes(lowercasedFilter) ||
        (compra.estado === 1 ? 'completada' : 'anulada').includes(lowercasedFilter) ||
        new Date(compra.fecha).toLocaleDateString('es-CO').includes(lowercasedFilter)
      );
    }

    const totalItems = filteredCompras.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const paginatedData = filteredCompras.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    return { currentTableData: paginatedData, totalPages, totalItems };
  }, [allCompras, searchTerm, currentPage, itemsPerPage]);


  // --- MANEJADORES DE PAGINACIÓN Y BÚSQUEDA ---
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Resetear a la página 1 en cada nueva búsqueda
  };

  const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  /**
   * @function abrirDetalle
   * @description Obtiene y muestra los detalles de una compra (CORREGIDO).
   */
  const abrirDetalle = async (compra: Compra) => {
    if (!isAuthenticated || !token) {
      toast.error("No estás autorizado para ver detalles.");
      return;
    }
    setLoadingDetalle(true);
    setErrorDetalle(null);
    setDetalleActual(null);
    setProductosDetalle([]);
    setModalDetalleOpen(true);

    try {
      const response = await fetch(`${API_BASE_URL}/compras/${compra.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error al cargar detalle: ${response.status}`);
      }

      const data = await response.json();

      // **CORRECCIÓN CLAVE**: Se procesa la respuesta directa de la API.
      const compraDetallada = { ...data, total: parseFloat(data.total) || 0 };
      setDetalleActual(compraDetallada);

      const productosParseados = (data.items || []).map((p: any) => ({
        id: p.id_compra_prod_item, // Usar un ID único para la key de React
        id_producto: p.id_producto,
        id_talla: p.id_talla,
        id_producto_talla: p.id_producto_talla,
        nombre_producto: p.nombre_producto,
        nombre_talla: p.nombre_talla,
        color: p.color,
        cantidad: p.cantidad,
        precio_unitario: parseFloat(p.precio_unitario) || 0,
        subtotal: parseFloat(p.subtotal) || 0,
      }));
      setProductosDetalle(productosParseados);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setErrorDetalle(`Error al cargar el detalle: ${errorMessage}`);
      toast.error(`Error al cargar detalle: ${errorMessage}`);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setModalDetalleOpen(false);
  };

  const abrirModalAgregar = () => {
    setModoEdicion(false);
    setCompraEditandoId(null);
    setNuevaCompra({
      fecha: new Date().toISOString().split("T")[0],
      tipo_pago: "Efectivo",
      id_proveedor: null,
      productos: [],
    });
    setIsModalOpen(true);
  };
  
  const abrirModalEditar = async (compraId: number) => {
    if (!isAuthenticated || !token) {
      toast.error("No estás autorizado para editar.");
      return;
    }
    setLoading(true);
    setIsModalOpen(true);
    setModoEdicion(true);
    setCompraEditandoId(compraId);

    try {
        if (!productosDisponibles.length || !proveedoresDisponibles.length) {
            await fetchSelectOptions();
        }

        const response = await fetch(`${API_BASE_URL}/compras/${compraId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("No se pudo cargar la compra para editar.");

        const data = await response.json();
        
        const productosParaEditar = (data.items || []).map((p: any) => ({
            id_producto_talla: p.id_producto_talla,
            id_producto: p.id_producto,
            id_talla: p.id_talla,
            color: p.color,
            nombre_producto: p.nombre_producto,
            nombre_talla: p.nombre_talla,
            precio_unitario: parseFloat(p.precio_unitario),
            cantidad: p.cantidad,
        }));

        setNuevaCompra({
            fecha: new Date(data.fecha).toISOString().split('T')[0],
            tipo_pago: data.tipo_pago,
            id_proveedor: data.id_proveedor,
            productos: productosParaEditar,
        });

    } catch (err) {
        toast.error(`Error al cargar para edición: ${err instanceof Error ? err.message : "Error"}`);
        cerrarModal();
    } finally {
        setLoading(false);
    }
  };


  const cerrarModal = () => {
    setIsModalOpen(false);
    setModoEdicion(false);
  };


  // --- MANEJADORES DE CAMBIOS EN EL FORMULARIO DEL MODAL ---
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<any>
  ) => {
    const { name, value } = e.target;
    setNuevaCompra((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductoChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<any>
  ) => {
    const { name, value } = e.target;
    setNuevaCompra((prev) => {
      const updatedProductos = [...prev.productos];
      if (name === "id_producto_talla") {
        const selected = productosDisponibles.find(p => p.id_producto_talla === Number(value));
        if (selected) {
          updatedProductos[index] = {
            ...updatedProductos[index],
            id_producto_talla: selected.id_producto_talla,
            id_producto: selected.id_producto,
            id_talla: selected.id_talla,
            color: selected.color,
            nombre_producto: selected.nombre_producto,
            nombre_talla: selected.nombre_talla,
            precio_unitario: selected.precio_unitario,
            cantidad: updatedProductos[index].cantidad || 1,
          };
        }
      } else {
        updatedProductos[index] = { ...updatedProductos[index], [name]: Number(value) };
      }
      return { ...prev, productos: updatedProductos };
    });
  };

  const agregarProducto = () => {
    setNuevaCompra((prev) => ({
      ...prev,
      productos: [...prev.productos, {
        id_producto_talla: 0, id_producto: 0, id_talla: 0, color: '',
        nombre_producto: '', nombre_talla: '', precio_unitario: 0, cantidad: 1,
      }],
    }));
  };

  const eliminarProducto = (index: number) => {
    setNuevaCompra((prev) => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index),
    }));
  };

  // --- Cálculo de totales ---
  const { subtotal, iva, total } = useMemo(() => {
    const subtotal = nuevaCompra.productos.reduce(
      (acc, p) => acc + (p.precio_unitario || 0) * (p.cantidad || 0), 0
    );
    const iva = subtotal * 0.19;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  }, [nuevaCompra.productos]);

  /**
   * @function guardarCompra
   * @description Envía los datos para crear o editar una compra.
   */
  const guardarCompra = async () => {
    if (!nuevaCompra.id_proveedor) return toast.warn("Debes seleccionar un proveedor.");
    if (nuevaCompra.productos.length === 0) return toast.warn("Debes agregar al menos un producto.");
    
    const productosValidos = nuevaCompra.productos.every(p => p.id_producto_talla > 0 && p.cantidad > 0);
    if (!productosValidos) return toast.warn("Verifica que todos los productos tengan variante seleccionada y cantidad válida.");
    
    if (!isAuthenticated || !token) return toast.error("No estás autorizado.");

    const payload = {
      fecha: nuevaCompra.fecha,
      tipo_pago: nuevaCompra.tipo_pago,
      estado: 1,
      id_proveedor: nuevaCompra.id_proveedor,
      productosComprados: nuevaCompra.productos.map(p => ({
        id_producto: p.id_producto,
        id_talla: p.id_talla,
        color: p.color,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
      })),
    };

    const isEditing = modoEdicion && compraEditandoId !== null;
    const url = isEditing ? `${API_BASE_URL}/compras/completa/${compraEditandoId}` : `${API_BASE_URL}/compras/completa`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Error al guardar la compra.');
      }

      toast.success(`Compra ${isEditing ? 'actualizada' : 'creada'} correctamente.`);
      await fetchCompras(); 
      await fetchSelectOptions();// Recargar toda la lista
      cerrarModal();

    } catch (err) {
      toast.error(`Error al guardar: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  };

  const solicitarConfirmacionAnulacion = (compra: Compra) => {
    setCompraAAnular(compra);
    setConfirmDialogOpen(true);
  };

  const confirmarAnulacion = async () => {
    if (!isAuthenticated || !token || !compraAAnular) return;

    try {
      const response = await fetch(`${API_BASE_URL}/compras/completa/${compraAAnular.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ estado: 0 }),
      });

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error al anular compra.`);
      }

      toast.success("Compra anulada y stock revertido.");
      await fetchCompras();
      await fetchSelectOptions(); // Recargar lista
    } catch (err) {
      toast.error(`Error al anular: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      setConfirmDialogOpen(false);
      setCompraAAnular(null);
    }
  };

  /**
   * @function generarPDF
   * @description Obtiene datos frescos y genera un PDF para una compra (CORREGIDO).
   */
  const generarPDF = async (compra: Compra) => {
    toast.info("Generando PDF...", { autoClose: 1500 });
    if (!isAuthenticated || !token) return toast.error("No autorizado.");

    try {
      // 1. Obtener los detalles actualizados de la compra
      const response = await fetch(`${API_BASE_URL}/compras/${compra.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('No se pudo obtener el detalle para el PDF.');
      const compraDetalle = await response.json();

      // 2. Crear el documento PDF
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Detalle de Compra", 14, 22);

      doc.setFontSize(12);
      doc.text(`ID: #${compraDetalle.id}`, 14, 32);
      doc.text(`Fecha: ${new Date(compraDetalle.fecha).toLocaleDateString('es-CO')}`, 14, 40);
      doc.text(`Proveedor: ${compraDetalle.nombre_proveedor}`, 14, 48);
      doc.text(`Total: $${(parseFloat(compraDetalle.total) || 0).toLocaleString('es-CO')}`, 14, 56);
      doc.text(`Estado: ${compraDetalle.estado === 1 ? 'Completada' : 'Anulada'}`, 14, 64);

      // 3. Crear la tabla de productos (usando los datos frescos)
      const productosParaPdf = compraDetalle.items || [];
      if (productosParaPdf.length > 0) {
        autoTable(doc, {
          startY: 75,
          head: [["Producto", "Talla", "Color", "Cant.", "P. Unitario", "Subtotal"]],
          body: productosParaPdf.map((p: any) => [
            p.nombre_producto, p.nombre_talla, p.color, p.cantidad,
            `$${(parseFloat(p.precio_unitario) || 0).toLocaleString('es-CO')}`,
            `$${(parseFloat(p.subtotal) || 0).toLocaleString('es-CO')}`
          ]),
        });
      } else {
        doc.text("Esta compra no tiene productos registrados.", 14, 85);
      }

      doc.save(`compra-${compra.id}.pdf`);
    } catch (err) {
      toast.error(`Error al generar PDF: ${err instanceof Error ? err.message : "Error"}`);
    }
  };

  if (loading && allCompras.length === 0) {
    return <div className="p-4 text-center">Cargando compras...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between flex-wrap gap-4">
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={abrirModalAgregar}
        >
          Agregar Compra
        </Button>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar por ID, proveedor..."
            value={searchTerm}
            onChange={handleChangeSearch}
            className="border border-gray-400 bg-white rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel>Items/pág</InputLabel>
            <Select
              value={itemsPerPage}
              label="Items/pág"
              onChange={handleItemsPerPageChange}
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
              <TableCell isHeader>ID</TableCell>
              <TableCell isHeader>Fecha</TableCell>
              <TableCell isHeader>Proveedor</TableCell>
              <TableCell isHeader>Total</TableCell>
              <TableCell isHeader>Estado</TableCell>
              <TableCell isHeader>Acciones</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
            {currentTableData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  {searchTerm ? "No se encontraron resultados." : "No hay compras registradas."}
                </TableCell>
              </TableRow>
            ) : (
              currentTableData.map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell className="font-medium">#{compra.id}</TableCell>
                  <TableCell>{new Date(compra.fecha).toLocaleDateString('es-CO')}</TableCell>
                  <TableCell>{compra.nombre_proveedor}</TableCell>
                  <TableCell>${compra.total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                     <span className={`px-2 py-1 rounded-full text-xs font-semibold ${compra.estado === 1 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {compra.estado === 1 ? "Completada" : "Anulada"}
                     </span>
                  </TableCell>
                  <TableCell className="space-x-1">
                    <Tooltip title="Ver Detalle">
                      <IconButton color="secondary" onClick={() => abrirDetalle(compra)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar Compra">
                      <span>
                        <IconButton
                          color="primary"
                          onClick={() => abrirModalEditar(compra.id)}
                          disabled={compra.estado === 0}
                        >
                          <EditIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Descargar PDF">
                      <IconButton color="default" onClick={() => generarPDF(compra)}>
                        <PictureAsPdfIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Anular Compra">
                       <span>
                          <IconButton
                            color="error"
                            onClick={() => solicitarConfirmacionAnulacion(compra)}
                            disabled={compra.estado === 0}
                          >
                            <CancelIcon />
                          </IconButton>
                       </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-700">
            Mostrando {currentTableData.length} de {totalItems} compras
          </p>
        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        )}
      </div>

      {/* Modal de Detalle de Compra */}
      <Modal isOpen={modalDetalleOpen} handleClose={cerrarDetalle}>
        <h2 className="text-2xl font-bold mb-6">Detalle de Compra #{detalleActual?.id}</h2>
        {loadingDetalle ? <p>Cargando detalles...</p> : errorDetalle ? <p className="text-red-500">{errorDetalle}</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div><strong>ID:</strong> #{detalleActual?.id}</div>
              <div><strong>Fecha:</strong> {detalleActual?.fecha ? new Date(detalleActual.fecha).toLocaleDateString('es-CO') : ''}</div>
              <div><strong>Total:</strong> ${detalleActual?.total?.toLocaleString('es-CO')}</div>
              <div><strong>Estado:</strong> {detalleActual?.estado === 1 ? "Completada" : "Anulada"}</div>
              <div><strong>Tipo Pago:</strong> {detalleActual?.tipo_pago}</div>
              <div className="col-span-2 md:col-span-1"><strong>Proveedor:</strong> {detalleActual?.nombre_proveedor}</div>
            </div>

            <h3 className="text-xl font-bold mt-8 mb-4">Productos de la Compra</h3>
            {productosDetalle.length === 0 ? <p>No hay productos en esta compra.</p> : (
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell isHeader>Producto</TableCell>
                      <TableCell isHeader>Talla</TableCell>
                      <TableCell isHeader>Color</TableCell>
                      <TableCell isHeader>Cantidad</TableCell>
                      <TableCell isHeader>P. Unitario</TableCell>
                      <TableCell isHeader>Subtotal</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosDetalle.map((prod) => (
                      <TableRow key={prod.id}>
                        <TableCell>{prod.nombre_producto}</TableCell>
                        <TableCell>{prod.nombre_talla}</TableCell>
                        <TableCell>{prod.color}</TableCell>
                        <TableCell>{prod.cantidad}</TableCell>
                        <TableCell>${prod.precio_unitario.toLocaleString('es-CO')}</TableCell>
                        <TableCell>${prod.subtotal.toLocaleString('es-CO')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-8 flex justify-end">
              <Button onClick={cerrarDetalle} variant="contained">Cerrar</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal de Agregar/Editar Compra */}
      <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="md" fullWidth>
        <DialogTitle>{modoEdicion ? "Editar Compra" : "Agregar Nueva Compra"}</DialogTitle>
        <DialogContent dividers>
          {loadingSelects ? <p>Cargando opciones...</p> : errorSelects ? <p className="text-red-500">{errorSelects}</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormControl>
                  <TextField label="Fecha" type="date" name="fecha" value={nuevaCompra.fecha} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Pago</InputLabel>
                  <Select name="tipo_pago" value={nuevaCompra.tipo_pago} label="Tipo de Pago" onChange={handleChange}>
                    <MenuItem value="Efectivo">Efectivo</MenuItem>
                    <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                    <MenuItem value="Transferencia">Transferencia</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Proveedor</InputLabel>
                  <Select name="id_proveedor" value={nuevaCompra.id_proveedor || ''} label="Proveedor" onChange={handleChange}>
                    <MenuItem value=""><em>Seleccionar Proveedor</em></MenuItem>
                    {proveedoresDisponibles.map((prov) => (
                      <MenuItem key={prov.id} value={prov.id}>{prov.nombre_comercial}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Productos</h3>
                {nuevaCompra.productos.map((prod, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-lg">
                    <div className="col-span-12 sm:col-span-5">
                      <FormControl fullWidth size="small">
                        <InputLabel>Producto / Talla / Color</InputLabel>
                        <Select name="id_producto_talla" value={prod.id_producto_talla || ''} label="Producto / Talla / Color" onChange={(e) => handleProductoChange(i, e)}>
                           {productosDisponibles.map((p) => (
                             <MenuItem key={p.id_producto_talla} value={p.id_producto_talla}>
                               {`${p.nombre_producto} - ${p.nombre_talla} - ${p.color} (Stock: ${p.stock_disponible})`}
                             </MenuItem>
                           ))}
                        </Select>
                      </FormControl>
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                       <TextField label="Precio Unitario" type="number" name="precio_unitario" value={prod.precio_unitario} onChange={(e) => handleProductoChange(i, e)} size="small" fullWidth/>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                       <TextField label="Cantidad" type="number" name="cantidad" value={prod.cantidad} onChange={(e) => handleProductoChange(i, e)} size="small" fullWidth/>
                    </div>
                    <div className="col-span-12 sm:col-span-2 text-right">
                      <Tooltip title="Eliminar Producto">
                        <IconButton onClick={() => eliminarProducto(i)} color="error"><DeleteIcon /></IconButton>
                      </Tooltip>
                    </div>
                  </div>
                ))}
                <Button variant="outlined" startIcon={<AddIcon />} onClick={agregarProducto}>Agregar Producto</Button>
              </div>

              <div className="mt-4 text-right">
                <p>Subtotal: ${subtotal.toLocaleString('es-CO')}</p>
                <p>IVA (19%): ${iva.toLocaleString('es-CO')}</p>
                <p className="font-bold text-lg">Total: ${total.toLocaleString('es-CO')}</p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarModal}>Cancelar</Button>
          <Button onClick={guardarCompra} variant="contained">{modoEdicion ? "Actualizar" : "Guardar"}</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmación de Anulación */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirmar Anulación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de anular la compra <strong>#{compraAAnular?.id}</strong>? Esta acción revertirá el stock de los productos.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
          <Button onClick={confirmarAnulacion} color="error">Anular</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
