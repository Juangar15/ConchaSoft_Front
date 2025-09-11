import { useState, useEffect, useMemo } from "react";

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
import IconButton from "@mui/material/IconButton";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
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
import TextareaAutosize from '@mui/material/TextareaAutosize';

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useAuth } from '../../context/authContext';

// --- URL BASE DE LA API ---
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com'}/api`;

// Extend jsPDF interface to include autoTable plugin properties
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

// --- INTERFACES DE DATOS PARA DEVOLUCIONES ---

interface Devolucion {
  id: number;
  id_venta: number;
  id_cliente: number;
  fecha: string;
  razon: string;
  estado: 'Aceptada' | 'Anulada';
  monto_total_devuelto: number;
  created_at: string;
  cliente_nombre?: string;
  cliente_apellido?: string;
  venta_numero?: number;
}

interface DevolucionProductoDetalle {
  id: number;
  id_devolucion: number;
  id_producto_talla: number;
  cantidad: number;
  precio_unitario_devuelto: number;
  subtotal_devuelto: number;
  nombre_producto?: string;
  nombre_talla?: string;
  color?: string;
}

interface VentaCompletada {
  id: number;
  fecha: string;
  total: number;
  id_cliente: number;
  cliente_nombre?: string;
  cliente_apellido?: string;
}

interface ProductoVenta {
  id_producto_talla: number;
  nombre_producto: string;
  nombre_talla: string;
  color: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface Venta {
  id: number;
  fecha: string;
  total: string | number;
  id_cliente: number;
  estado: string;
  nombre?: string;
  apellido?: string;
  cliente_nombre?: string;
  cliente_apellido?: string;
}

// --- COMPONENTE PRINCIPAL ---

export default function DevolucionesTable() {
  const { token, isAuthenticated, logout } = useAuth();

  // Estados principales
  const [allDevoluciones, setAllDevoluciones] = useState<Devolucion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de paginación y búsqueda
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para modales
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Estados para datos de modales
  const [detalleActual, setDetalleActual] = useState<Devolucion | null>(null);
  const [productosDetalle, setProductosDetalle] = useState<DevolucionProductoDetalle[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  
  const [devolucionAAnular, setDevolucionAAnular] = useState<Devolucion | null>(null);

  // Estados para formulario de nueva devolución
  const [nuevaDevolucion, setNuevaDevolucion] = useState({
    id_venta: null as number | null,
    id_cliente: null as number | null,
    fecha: new Date().toISOString().split("T")[0],
    razon: '',
    productos: [] as {
      id_producto_talla: number;
      cantidad: number;
      precio_unitario_devuelto: number;
      nombre_producto: string;
      nombre_talla: string;
      color: string;
      cantidad_maxima: number;
    }[],
  });

  // Estados para selects y datos auxiliares
  const [ventasCompletadas, setVentasCompletadas] = useState<VentaCompletada[]>([]);
  const [productosVenta, setProductosVenta] = useState<ProductoVenta[]>([]);
  const [loadingSelects, setLoadingSelects] = useState(false);

  /**
   * Obtiene todas las devoluciones desde la API.
   */
  const fetchDevoluciones = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/devoluciones`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        toast.error("Sesión expirada o no autorizado.");
        logout();
        return;
      }
      if (!response.ok) throw new Error("Error al cargar las devoluciones.");
      
      const data: Devolucion[] = await response.json();
      console.log('Datos de devoluciones recibidos:', data);
      
      // Obtener información del cliente para cada devolución
      const devolucionesConCliente = await Promise.all(
        data.map(async (devolucion) => {
          try {
            const clienteResponse = await fetch(`${API_BASE_URL}/clientes/${devolucion.id_cliente}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (clienteResponse.ok) {
              const clienteData = await clienteResponse.json();
              return {
                ...devolucion,
                monto_total_devuelto: parseFloat(String(devolucion.monto_total_devuelto)),
                cliente_nombre: clienteData.nombre || '',
                cliente_apellido: clienteData.apellido || ''
              };
            } else {
              return {
                ...devolucion,
                monto_total_devuelto: parseFloat(String(devolucion.monto_total_devuelto)),
                cliente_nombre: '',
                cliente_apellido: ''
              };
            }
          } catch (error) {
            console.error(`Error obteniendo cliente ${devolucion.id_cliente}:`, error);
            return {
              ...devolucion,
              monto_total_devuelto: parseFloat(String(devolucion.monto_total_devuelto)),
              cliente_nombre: '',
              cliente_apellido: ''
            };
          }
        })
      );
      
      setAllDevoluciones(devolucionesConCliente);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido.";
      setError(`No se pudieron cargar las devoluciones: ${msg}`);
      toast.error(`Error al cargar devoluciones: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtiene ventas completadas para el selector del modal de creación.
   */
  const fetchVentasCompletadas = async () => {
    if (!isAuthenticated || !token) return;
    setLoadingSelects(true);
    try {
      // Usar el endpoint de ventas normales que incluye datos del cliente
      const response = await fetch(`${API_BASE_URL}/ventas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar ventas.');
      const data: Venta[] = await response.json();
      console.log('Datos de ventas recibidos:', data);
      
      // Filtrar solo las ventas completadas y transformar los datos
      const ventasCompletadas = data
        .filter(venta => venta.estado === 'Completado' || venta.estado === 'Devuelto Parcialmente')
        .map(venta => {
          console.log('Venta individual:', venta);
          console.log('Campos disponibles:', Object.keys(venta));
          return {
            id: venta.id,
            fecha: venta.fecha,
            total: typeof venta.total === 'string' ? parseFloat(venta.total) : venta.total,
            id_cliente: venta.id_cliente,
            cliente_nombre: venta.nombre || venta.cliente_nombre || 'Sin nombre',
            cliente_apellido: venta.apellido || venta.cliente_apellido || 'Sin apellido'
          };
        });
      
      console.log('Ventas completadas filtradas:', ventasCompletadas);
      setVentasCompletadas(ventasCompletadas);
    } catch (err) {
      console.error('Error en fetchVentasCompletadas:', err);
      toast.error(`Error cargando ventas: ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setLoadingSelects(false);
    }
  };

  /**
   * Obtiene productos de una venta específica.
   */
  const fetchProductosVenta = async (idVenta: number) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/ventas/${idVenta}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar productos de la venta.');
      const data = await response.json();
      console.log('Datos de productos de venta recibidos:', data);
      
      // Usar directamente los productos vendidos con sus colores originales
      const productosConColor = (data.productosVendidos || []).map((producto: ProductoVenta) => {
        console.log('Producto original:', producto);
        
        // Usar el color que viene en la respuesta de la venta, o null si no existe
        const colorFinal = producto.color && producto.color.trim() !== '' ? producto.color : null;
        console.log(`Producto ${producto.id_producto_talla} con color: ${colorFinal}`);
        
        return {
          ...producto,
          color: colorFinal
        };
      });
      
      setProductosVenta(productosConColor);
      console.log('Productos con color asignado:', productosConColor);
    } catch (err) {
      toast.error(`Error cargando productos: ${err instanceof Error ? err.message : "Error"}`);
      setProductosVenta([]);
    }
  };

  useEffect(() => {
    fetchDevoluciones();
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (isModalOpen) {
      fetchVentasCompletadas();
    }
  }, [isModalOpen]);

  // --- LÓGICA DE BÚSQUEDA Y PAGINACIÓN ---
  const { currentTableData, totalPages, totalItems } = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredDevoluciones = allDevoluciones.filter(devolucion =>
      devolucion.id.toString().includes(lowercasedFilter) ||
      `${devolucion.cliente_nombre || ''} ${devolucion.cliente_apellido || ''}`.toLowerCase().includes(lowercasedFilter) ||
      devolucion.estado.toLowerCase().includes(lowercasedFilter) ||
      new Date(devolucion.fecha).toLocaleDateString('es-CO').includes(lowercasedFilter)
    );
    
    const total = filteredDevoluciones.length;
    return {
      currentTableData: filteredDevoluciones.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
      totalPages: Math.ceil(total / itemsPerPage),
      totalItems: total,
    };
  }, [allDevoluciones, searchTerm, currentPage, itemsPerPage]);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => setCurrentPage(value);
  const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  const handleItemsPerPageChange = (e: SelectChangeEvent<number>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // --- MANEJO DE MODALES ---

  const abrirDetalle = async (devolucion: Devolucion) => {
    if (!token) return;
    setModalDetalleOpen(true);
    setLoadingDetalle(true);
    try {
      const response = await fetch(`${API_BASE_URL}/devoluciones/${devolucion.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('No se pudo cargar el detalle.');
      const data = await response.json();
      console.log('Detalle de devolución recibido:', data);
      
      // Obtener información del cliente
      let clienteInfo = { cliente_nombre: '', cliente_apellido: '' };
      if (data.id_cliente) {
        try {
          const clienteResponse = await fetch(`${API_BASE_URL}/clientes/${data.id_cliente}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (clienteResponse.ok) {
            const clienteData = await clienteResponse.json();
            clienteInfo = {
              cliente_nombre: clienteData.nombre || '',
              cliente_apellido: clienteData.apellido || ''
            };
            console.log('Información del cliente obtenida:', clienteInfo);
          }
        } catch (error) {
          console.error('Error obteniendo información del cliente:', error);
        }
      }
      
      // Usar directamente los productos devueltos con sus colores
      const productosConColor = (data.productosDevueltos || []).map((producto: DevolucionProductoDetalle) => {
        console.log('Producto devuelto original:', producto);
        
        // Usar el color que viene en la respuesta, o null si no existe
        const colorFinal = producto.color && producto.color.trim() !== '' ? producto.color : null;
        console.log(`Producto devuelto ${producto.id_producto_talla} con color: ${colorFinal}`);
        
        return {
          ...producto,
          color: colorFinal
        };
      });
      
      setDetalleActual({ 
        ...data, 
        monto_total_devuelto: parseFloat(data.monto_total_devuelto),
        ...clienteInfo
      });
      setProductosDetalle(productosConColor);
      console.log('Productos con color:', productosConColor);
    } catch (err) {
      toast.error(`Error al ver detalle: ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const abrirModalAgregar = () => {
    setNuevaDevolucion({
      id_venta: null,
      id_cliente: null,
      fecha: new Date().toISOString().split("T")[0],
      razon: '',
      productos: [],
    });
    setProductosVenta([]);
    setIsModalOpen(true);
  };

  const cerrarModal = () => setIsModalOpen(false);

  // --- LÓGICA DEL FORMULARIO DE NUEVA DEVOLUCIÓN ---

  const handleVentaChange = async (e: SelectChangeEvent<string>) => {
    const id_venta = Number(e.target.value);
    const ventaSeleccionada = ventasCompletadas.find(v => v.id === id_venta);
    
    setNuevaDevolucion(prev => ({ 
      ...prev, 
      id_venta,
      id_cliente: ventaSeleccionada?.id_cliente || null
    }));

    if (id_venta) {
      await fetchProductosVenta(id_venta);
    } else {
      setProductosVenta([]);
    }
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setNuevaDevolucion(prev => ({ ...prev, [name]: value }));
  };

  const handleProductoChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    const productos = [...nuevaDevolucion.productos];

    if (name === "id_producto_talla") {
      const selected = productosVenta.find(p => p.id_producto_talla === Number(value));
      if (selected) {
        productos[index] = {
          ...productos[index],
          id_producto_talla: selected.id_producto_talla,
          nombre_producto: selected.nombre_producto,
          nombre_talla: selected.nombre_talla,
          color: selected.color,
          precio_unitario_devuelto: selected.precio_unitario,
          cantidad_maxima: selected.cantidad,
          cantidad: 1,
        };
      }
    } else {
        const cantidad = Number(value);
        const maxCantidad = productos[index].cantidad_maxima;
        // Validar que la cantidad no exceda la cantidad vendida
        productos[index] = { ...productos[index], [name]: Math.min(cantidad, maxCantidad) };
    }
    setNuevaDevolucion(prev => ({ ...prev, productos }));
  };

  const agregarProducto = () => {
    setNuevaDevolucion(prev => ({
      ...prev,
      productos: [...prev.productos, {
        id_producto_talla: 0, 
        nombre_producto: '', 
        nombre_talla: '',
        color: '',
        precio_unitario_devuelto: 0, 
        cantidad: 1, 
        cantidad_maxima: 0
      }],
    }));
  };

  const eliminarProducto = (index: number) => {
    setNuevaDevolucion(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index),
    }));
  };

  const { totalDevolucion } = useMemo(() => {
    const total = nuevaDevolucion.productos.reduce((acc, p) => acc + (p.precio_unitario_devuelto * p.cantidad), 0);
    return { totalDevolucion: total };
  }, [nuevaDevolucion.productos]);

  const guardarDevolucion = async () => {
    if (!nuevaDevolucion.id_venta) return toast.warn("Debes seleccionar una venta.");
    if (nuevaDevolucion.productos.length === 0) return toast.warn("Debes agregar al menos un producto a devolver.");
    if (!nuevaDevolucion.razon.trim()) return toast.warn("Debes especificar la razón de la devolución.");
    if (!token) return toast.error("No estás autorizado.");
    
    const payload = {
      id_venta: nuevaDevolucion.id_venta,
      id_cliente: nuevaDevolucion.id_cliente,
      fecha: nuevaDevolucion.fecha,
      razon: nuevaDevolucion.razon,
      monto_total_devuelto: totalDevolucion,
      productos_devueltos: nuevaDevolucion.productos.map(p => ({
        id_producto_talla: p.id_producto_talla,
        cantidad: p.cantidad,
        precio_unitario_devuelto: p.precio_unitario_devuelto,
      })),
    };

    try {
      console.log('Payload a enviar:', payload);
      const response = await fetch(`${API_BASE_URL}/devoluciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      console.log('Respuesta del servidor:', resData);
      if (!response.ok) throw new Error(resData.error || 'Error al guardar la devolución.');
      
      toast.success(`Devolución #${resData.id_devolucion} creada correctamente.`);
      await fetchDevoluciones();
      cerrarModal();

    } catch (err) {
      console.error('Error completo:', err);
      toast.error(`Error al guardar: ${err instanceof Error ? err.message : "Error"}`);
    }
  };

  // --- LÓGICA DE ANULACIÓN ---
  
  const solicitarConfirmacionAnulacion = (devolucion: Devolucion) => {
    setDevolucionAAnular(devolucion);
    setConfirmDialogOpen(true);
  };
  
  const confirmarAnulacion = async () => {
    if (!token || !devolucionAAnular) return;
    try {
      const response = await fetch(`${API_BASE_URL}/devoluciones/${devolucionAAnular.id}/anular`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al anular la devolución.');
      toast.success("Devolución anulada correctamente.");
      await fetchDevoluciones();
    } catch (err) {
      toast.error(`Error al anular: ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setConfirmDialogOpen(false);
      setDevolucionAAnular(null);
    }
  };

  // --- GENERACIÓN DE PDF ---

  const generarPDF = async (devolucion: Devolucion) => {
    toast.info("Generando PDF...", { autoClose: 1500 });
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/devoluciones/${devolucion.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('No se pudo obtener el detalle para el PDF.');
      const detalleDevolucion = await response.json();

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // === ENCABEZADO CON DISEÑO PROFESIONAL ===
      // Fondo del encabezado con gradiente simulado
      doc.setFillColor(239, 68, 68); // Rojo moderno (red-500)
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      // Segundo tono para simular gradiente
      doc.setFillColor(220, 38, 38); // Rojo más oscuro (red-600)
      doc.rect(0, 0, pageWidth, 8, 'F');
      
      // Logo/Texto de la empresa
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('ConchaSoft', 20, 20);
      
      // Subtítulo
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistema de Gestión Comercial', 20, 28);
      
      // Fecha de generación
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, pageWidth - 60, 20);
      
      // === TÍTULO DEL DOCUMENTO ===
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTA DE DEVOLUCIÓN', pageWidth / 2, 55, { align: 'center' });
      
      // Línea decorativa con colores modernos
      doc.setDrawColor(239, 68, 68); // Rojo moderno
      doc.setLineWidth(3);
      doc.line(20, 60, pageWidth - 20, 60);
      
      // Línea secundaria más sutil
      doc.setDrawColor(252, 165, 165); // Rojo claro
      doc.setLineWidth(1);
      doc.line(20, 63, pageWidth - 20, 63);
      
      // === INFORMACIÓN DE LA DEVOLUCIÓN ===
      let yPosition = 75;
      
      // Información principal en dos columnas
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DE LA DEVOLUCIÓN', 20, yPosition);
      yPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const nombreCliente = `${detalleDevolucion.cliente_nombre || ''} ${detalleDevolucion.cliente_apellido || ''}`.trim();
      
      // Columna izquierda
      doc.text(`Número de Devolución: #${detalleDevolucion.id}`, 20, yPosition);
      doc.text(`Fecha: ${new Date(detalleDevolucion.fecha).toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 20, yPosition + 6);
      doc.text(`Venta Original: #${detalleDevolucion.id_venta}`, 20, yPosition + 12);
      
      // Columna derecha
      doc.text(`Cliente: ${nombreCliente}`, pageWidth / 2, yPosition);
      
      // Estado con color
      doc.setFont('helvetica', 'bold');
      if (detalleDevolucion.estado === 'Aceptada') {
        doc.setTextColor(34, 197, 94); // Verde esmeralda
      } else {
        doc.setTextColor(239, 68, 68); // Rojo coral
      }
      doc.text(`Estado: ${detalleDevolucion.estado}`, pageWidth / 2, yPosition + 6);
      
      // Restaurar color negro para el resto del texto
      doc.setTextColor(0, 0, 0);
      
      yPosition += 20;
      
      // Razón de la devolución
      doc.setFont('helvetica', 'bold');
      doc.text('RAZÓN DE LA DEVOLUCIÓN:', 20, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(detalleDevolucion.razon, 20, yPosition);
      yPosition += 15;
      
      // === TABLA DE PRODUCTOS ===
      const productosParaPdf = detalleDevolucion.productosDevueltos || [];
      if (productosParaPdf.length > 0) {
        // Encabezado de la tabla
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUCTOS DEVUELTOS', 20, yPosition);
        yPosition += 8;
        
        autoTable(doc, {
          startY: yPosition,
          head: [["Producto", "Talla", "Color", "Cant.", "P. Unitario", "Subtotal"]],
          headStyles: {
            fillColor: [239, 68, 68], // Rojo moderno
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          body: productosParaPdf.map((p: DevolucionProductoDetalle) => [
            p.nombre_producto,
            p.nombre_talla,
            p.color || 'N/A',
            p.cantidad.toString(),
            new Intl.NumberFormat('es-CO', { 
              style: 'currency', 
              currency: 'COP', 
              maximumFractionDigits: 0 
            }).format(p.precio_unitario_devuelto),
            new Intl.NumberFormat('es-CO', { 
              style: 'currency', 
              currency: 'COP', 
              maximumFractionDigits: 0 
            }).format(p.subtotal_devuelto)
          ]),
          styles: {
            fontSize: 9,
            cellPadding: 4
          },
          alternateRowStyles: {
            fillColor: [254, 242, 242] // Rojo muy claro
          },
          margin: { left: 20, right: 20 }
        });
        
        // === RESUMEN FINANCIERO ===
        const finalY = (doc as ExtendedJsPDF).lastAutoTable?.finalY || yPosition + 50;
        yPosition = finalY + 15;
        
        // Fondo para el resumen
        doc.setFillColor(254, 242, 242); // Rojo muy claro
        doc.rect(20, yPosition - 5, pageWidth - 40, 40, 'F');
        
        // Borde superior con color
        doc.setDrawColor(239, 68, 68); // Rojo moderno
        doc.setLineWidth(2);
        doc.line(20, yPosition - 5, pageWidth - 20, yPosition - 5);
        
        // Bordes del resumen
        doc.setDrawColor(252, 165, 165); // Rojo claro
        doc.setLineWidth(0.5);
        doc.rect(20, yPosition - 5, pageWidth - 40, 40);
        
        // Texto del resumen
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN DE DEVOLUCIÓN', 25, yPosition + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Total a Devolver:`, pageWidth - 80, yPosition + 5);
        doc.text(new Intl.NumberFormat('es-CO', { 
          style: 'currency', 
          currency: 'COP', 
          maximumFractionDigits: 0 
        }).format(parseFloat(detalleDevolucion.monto_total_devuelto)), pageWidth - 25, yPosition + 5, { align: 'right' });
        
        yPosition += 50;
      }
      
      // === PIE DE PÁGINA ===
      const footerY = pageHeight - 30;
      
      // Línea superior del pie con color moderno
      doc.setDrawColor(239, 68, 68); // Rojo moderno
      doc.setLineWidth(1);
      doc.line(20, footerY, pageWidth - 20, footerY);
      
      // Información del pie
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Este documento fue generado automáticamente por ConchaSoft', 20, footerY + 8);
      doc.text(`Página 1 de 1`, pageWidth - 30, footerY + 8, { align: 'right' });
      
      // Información de contacto
      doc.text('Sistema de Gestión Comercial - ConchaSoft', 20, footerY + 16);
      doc.text('www.conchasoft.com', pageWidth - 30, footerY + 16, { align: 'right' });
      
      // === GUARDAR EL PDF ===
      const fileName = `devolucion-${detalleDevolucion.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF generado exitosamente");
    } catch (err) {
      toast.error(`Error al generar PDF: ${err instanceof Error ? err.message : "Error"}`);
    }
  };

  // --- RENDERIZADO DEL COMPONENTE ---

  const getEstadoColor = (estado: Devolucion['estado']) => {
    switch (estado) {
        case 'Aceptada': return 'bg-green-200 text-green-800';
        case 'Anulada': return 'bg-red-200 text-red-800';
        default: return 'bg-gray-200 text-gray-800';
    }
  };

  if (loading && allDevoluciones.length === 0) return <div className="p-4 text-center">Cargando devoluciones...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200">
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={abrirModalAgregar}>
    Agregar Devolución
  </Button>
        <div className="flex items-center gap-4 w-full sm:w-auto">
  <input
    type="text"
            placeholder="Buscar por ID, cliente, estado..."
            value={searchTerm}
            onChange={handleChangeSearch}
            className="border border-gray-400 bg-white rounded px-4 py-2 w-full"
          />
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel>Items/pág</InputLabel>
            <Select value={itemsPerPage} label="Items/pág" onChange={handleItemsPerPageChange}>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-400">
            <TableRow>
              <TableCell isHeader>ID</TableCell>
              <TableCell isHeader>Fecha</TableCell>
              <TableCell isHeader>Cliente</TableCell>
              <TableCell isHeader>Venta Original</TableCell>
              <TableCell isHeader>Monto</TableCell>
              <TableCell isHeader>Estado</TableCell>
              <TableCell isHeader>Acciones</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-400">
            {currentTableData.map((devolucion) => (
              <TableRow key={devolucion.id}>
                <TableCell className="font-medium">#{devolucion.id}</TableCell>
                <TableCell>{new Date(devolucion.fecha).toLocaleDateString('es-CO')}</TableCell>
                <TableCell>{`${devolucion.cliente_nombre || ''} ${devolucion.cliente_apellido || ''}`}</TableCell>
                <TableCell>#{devolucion.id_venta}</TableCell>
                <TableCell>${devolucion.monto_total_devuelto.toLocaleString('es-CO')}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getEstadoColor(devolucion.estado)}`}>
                  {devolucion.estado}
                  </span>
                </TableCell>
                <TableCell className="space-x-1">
                  <Tooltip title="Ver Detalle"><IconButton color="secondary" onClick={() => abrirDetalle(devolucion)}><VisibilityIcon /></IconButton></Tooltip>
                  <Tooltip title="Descargar PDF"><IconButton color="default" onClick={() => generarPDF(devolucion)}><PictureAsPdfIcon /></IconButton></Tooltip>
                  <Tooltip title="Anular Devolución">
                    <span>
                      <IconButton color="error" onClick={() => solicitarConfirmacionAnulacion(devolucion)} disabled={devolucion.estado === 'Anulada'}>
                        <CancelIcon />
                        </IconButton>
                    </span>
                   </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 flex justify-between items-center">
        <p className="text-sm">Mostrando {currentTableData.length} de {totalItems} devoluciones</p>
        {totalPages > 1 && <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />}
          </div>

      {/* MODAL DETALLE DE DEVOLUCIÓN */}
      <Modal isOpen={modalDetalleOpen} handleClose={() => setModalDetalleOpen(false)}>
         <h2 className="text-2xl font-bold mb-6">Detalle de Devolución #{detalleActual?.id}</h2>
         {loadingDetalle ? <p>Cargando...</p> : (
            <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div><strong>ID:</strong> #{detalleActual?.id}</div>
                    <div><strong>Fecha:</strong> {new Date(detalleActual?.fecha || '').toLocaleDateString('es-CO')}</div>
                    <div><strong>Estado:</strong> {detalleActual?.estado}</div>
                    <div><strong>Venta Original:</strong> #{detalleActual?.id_venta}</div>
                    <div className="col-span-2"><strong>Cliente:</strong> {`${detalleActual?.cliente_nombre || ''} ${detalleActual?.cliente_apellido || ''}`}</div>
                    <div className="font-bold"><strong>Monto Total:</strong> ${detalleActual?.monto_total_devuelto?.toLocaleString('es-CO')}</div>
          </div>
                <div className="mb-4">
                    <strong>Razón:</strong> {detalleActual?.razon}
          </div>
                <h3 className="text-xl font-bold mt-8 mb-4">Productos Devueltos</h3>
                <div className="overflow-x-auto border rounded-lg">
                    <Table>
                        <TableHeader><TableRow><TableCell isHeader>Producto</TableCell><TableCell isHeader>Talla</TableCell><TableCell isHeader>Color</TableCell><TableCell isHeader>Cant.</TableCell><TableCell isHeader>P. Unitario</TableCell><TableCell isHeader>Subtotal</TableCell></TableRow></TableHeader>
                        <TableBody>{productosDetalle.map((p) => (<TableRow key={p.id}><TableCell>{p.nombre_producto}</TableCell><TableCell>{p.nombre_talla}</TableCell><TableCell><div className="flex items-center gap-2"><div className="w-4 h-4 rounded border" style={{backgroundColor: p.color || '#000000'}}></div><span>{p.color || 'N/A'}</span></div></TableCell><TableCell>{p.cantidad}</TableCell><TableCell>${p.precio_unitario_devuelto.toLocaleString('es-CO')}</TableCell><TableCell>${p.subtotal_devuelto.toLocaleString('es-CO')}</TableCell></TableRow>))}</TableBody>
                    </Table>
        </div>
            </>
         )}
      </Modal>

      {/* MODAL AGREGAR DEVOLUCIÓN */}
      <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="md" fullWidth>
        <DialogTitle>Agregar Nueva Devolución</DialogTitle>
        <DialogContent dividers>
          {loadingSelects ? <p>Cargando...</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Fecha" type="date" name="fecha" value={nuevaDevolucion.fecha} onChange={handleFormChange} InputLabelProps={{ shrink: true }} InputProps={{ readOnly: true }} />
                <FormControl fullWidth>
                  <InputLabel>Venta Original</InputLabel>
                  <Select name="id_venta" value={nuevaDevolucion.id_venta?.toString() || ''} label="Venta Original" onChange={handleVentaChange}>
                    <MenuItem value=""><em>Seleccionar</em></MenuItem>
                    {ventasCompletadas.map((v) => (
                      <MenuItem key={v.id} value={v.id.toString()}>
                        {`#${v.id} - ${v.cliente_nombre} ${v.cliente_apellido} - ${new Date(v.fecha).toLocaleDateString('es-CO')} - $${v.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Razón de la Devolución *</label>
                <TextareaAutosize
                  name="razon"
                  value={nuevaDevolucion.razon}
                  onChange={handleFormChange}
                  minRows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Describe la razón de la devolución..."
                />
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Productos a Devolver</h3>
                {nuevaDevolucion.productos.map((prod, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-lg">
                    <div className="col-span-12 sm:col-span-5">
                      <FormControl fullWidth size="small">
                        <InputLabel>Producto / Talla (Max: {prod.cantidad_maxima})</InputLabel>
                        <Select name="id_producto_talla" value={prod.id_producto_talla?.toString() || ''} label="Producto / Talla / Color" onChange={(e) => handleProductoChange(i, e)}>
                          {productosVenta.map((p) => (
                            <MenuItem key={p.id_producto_talla} value={p.id_producto_talla.toString()}>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border" style={{backgroundColor: p.color}}></div>
                                <span>{`${p.nombre_producto} - ${p.nombre_talla} - ${p.color} (Max: ${p.cantidad})`}</span>
                              </div>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
        </div>
                    <div className="col-span-6 sm:col-span-2">
                      <TextField label="Precio" type="number" name="precio_unitario_devuelto" value={prod.precio_unitario_devuelto} size="small" fullWidth InputProps={{ readOnly: true }} />
        </div>
                    <div className="col-span-6 sm:col-span-2">
                      <TextField label="Cantidad" type="number" name="cantidad" value={prod.cantidad} onChange={(e) => handleProductoChange(i, e)} size="small" fullWidth InputProps={{ inputProps: { max: prod.cantidad_maxima, min: 1 } }} />
    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <TextField 
                        label="Subtotal" 
                        value={`$${(prod.precio_unitario_devuelto * prod.cantidad).toLocaleString('es-CO')}`}
                        size="small" 
                        fullWidth 
                        InputProps={{ readOnly: true }} 
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-1 text-right">
                      <IconButton onClick={() => eliminarProducto(i)} color="error">
                        <CancelIcon />
      </IconButton>
                    </div>
                  </div>
                ))}
                <Button variant="outlined" startIcon={<AddIcon />} onClick={agregarProducto} disabled={productosVenta.length === 0}>
                  Agregar Producto
      </Button>
              </div>

              <div className="mt-4 text-right">
                <p className="font-bold text-lg">Total a Devolver: ${totalDevolucion.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarModal}>Cancelar</Button>
          <Button onClick={guardarDevolucion} variant="contained">Guardar Devolución</Button>
  </DialogActions>
</Dialog>
      
      {/* DIÁLOGO CONFIRMACIÓN ANULAR */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirmar Anulación</DialogTitle>
        <DialogContent><DialogContentText>¿Estás seguro de anular la devolución <strong>#{devolucionAAnular?.id}</strong>? Esta acción no se puede deshacer.</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button><Button onClick={confirmarAnulacion} color="error">Anular</Button></DialogActions>
      </Dialog>
    </div>
  );
}

