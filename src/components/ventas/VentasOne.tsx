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
import InputAdornment from '@mui/material/InputAdornment';
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

// --- URL BASE DE LA API ---
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api';

// --- INTERFACES DE DATOS PARA VENTAS ---

interface Venta {
  id: number;
  fecha: string;
  total: number;
  estado: 'Completado' | 'Devuelto Parcialmente' | 'Devuelto Totalmente' | 'Anulado';
  tipo_pago: string;
  id_cliente: number;
  nombre: string;
  apellido: string;
  documento: string;
  monto_saldo_usado?: number;
}

interface VentaProductoDetalle {
  id_producto_talla: number;
  nombre_producto: string;
  nombre_talla: string;
  color?: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

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

interface ProductoParaVenta {
  id_producto_talla: number;
  nombre: string;
  talla: string;
  color: string;
  stock: number;
  precio_venta: number;
}

interface ClienteSeleccionable {
  id: number;
  nombre: string;
  apellido: string;
  documento: string;
}

// --- COMPONENTE PRINCIPAL ---

export default function VentasTable() {
  const { token, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Estados principales
  const [allVentas, setAllVentas] = useState<Venta[]>([]);
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
  const [detalleActual, setDetalleActual] = useState<Venta | null>(null);
  const [productosDetalle, setProductosDetalle] = useState<VentaProductoDetalle[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  
  const [ventaAAnular, setVentaAAnular] = useState<Venta | null>(null);

  // Estados para formulario de nueva venta
  const [nuevaVenta, setNuevaVenta] = useState({
    fecha: new Date().toISOString().split("T")[0],
    tipo_pago: "efectivo",
    id_cliente: null as number | null,
    saldo_a_favor_aplicado: 0,
    productos: [] as {
      id_producto_talla: number;
      cantidad: number;
      precio_unitario: number;
      nombre_producto: string;
      nombre_talla: string;
      color: string;
      stock_disponible: number;
    }[],
  });

  // Estados para selects y datos auxiliares
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoParaVenta[]>([]);
  const [clientesDisponibles, setClientesDisponibles] = useState<ClienteSeleccionable[]>([]);
  const [loadingSelects, setLoadingSelects] = useState(false);
  const [saldoCliente, setSaldoCliente] = useState<number>(0);


  /**
   * Obtiene todas las ventas desde la API.
   */
  const fetchVentas = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/ventas`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        toast.error("Sesión expirada o no autorizado.");
        logout();
        return;
      }
      if (!response.ok) throw new Error("Error al cargar las ventas.");
      
      const data: Venta[] = await response.json();
      console.log('Datos de ventas recibidos del backend:', data);
      
      // Obtener información completa del cliente para cada venta
      const ventasConCliente = await Promise.all(
        data.map(async (venta) => {
          try {
            const clienteResponse = await fetch(`${API_BASE_URL}/clientes/${venta.id_cliente}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (clienteResponse.ok) {
              const clienteData = await clienteResponse.json();
              return {
                ...venta,
                documento: clienteData.documento || '',
                total: parseFloat(String(venta.total))
              };
            }
          } catch (error) {
            console.error(`Error obteniendo cliente ${venta.id_cliente}:`, error);
          }
          return {
            ...venta,
            documento: '',
            total: parseFloat(String(venta.total))
          };
        })
      );
      
      setAllVentas(ventasConCliente);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido.";
      setError(`No se pudieron cargar las ventas: ${msg}`);
      toast.error(`Error al cargar ventas: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtiene productos y clientes para los selectores del modal de creación.
   */
  const fetchSelectOptions = async () => {
    if (!isAuthenticated || !token) return;
    setLoadingSelects(true);
    try {
      // Cargar Productos con Stock - Usando el endpoint /productos/activos como en ComprasOne
      const productsResponse = await fetch(`${API_BASE_URL}/productos/activos`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!productsResponse.ok) throw new Error('Error al cargar productos.');
      const productsData = await productsResponse.json();
      
      console.log('Datos de productos recibidos:', productsData);
      
      // Verificar que productsData es un array y tiene la estructura esperada
      if (Array.isArray(productsData)) {
        const productosTransformados: ProductoParaVenta[] = productsData.flatMap((producto: ProductoAPI) => {
          // Verificar que el producto tiene variantes
          if (producto.variantes && Array.isArray(producto.variantes)) {
            return producto.variantes.map((variante) => ({
              id_producto_talla: variante.id_producto_talla,
              nombre: producto.nombre,
              talla: variante.nombre_talla,
              color: variante.color,
              stock: variante.stock,
              precio_venta: parseFloat(producto.valor)
            }));
          }
          return [];
        });
        setProductosDisponibles(productosTransformados);
        console.log('Productos transformados:', productosTransformados);
      } else {
        console.error('productsData no es un array:', productsData);
        setProductosDisponibles([]);
      }

      // Cargar Clientes
      const clientsResponse = await fetch(`${API_BASE_URL}/clientes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!clientsResponse.ok) throw new Error('Error al cargar clientes.');
      const clientsData = await clientsResponse.json();
      console.log('Datos de clientes recibidos:', clientsData);
      setClientesDisponibles(clientsData);

    } catch (err) {
      console.error('Error en fetchSelectOptions:', err);
      toast.error(`Error cargando opciones: ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setLoadingSelects(false);
    }
  };

  useEffect(() => {
    fetchVentas();
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (isModalOpen) {
      fetchSelectOptions();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSelectOptions();
    }
  }, [isAuthenticated, token]);

  // --- LÓGICA DE BÚSQUEDA Y PAGINACIÓN ---
  const { currentTableData, totalPages, totalItems } = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredVentas = allVentas.filter(venta =>
      venta.id.toString().includes(lowercasedFilter) ||
      `${venta.nombre} ${venta.apellido}`.toLowerCase().includes(lowercasedFilter) ||
      venta.estado.toLowerCase().includes(lowercasedFilter) ||
      new Date(venta.fecha).toLocaleDateString('es-CO').includes(lowercasedFilter)
    );
    
    const total = filteredVentas.length;
    return {
      currentTableData: filteredVentas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
      totalPages: Math.ceil(total / itemsPerPage),
      totalItems: total,
    };
  }, [allVentas, searchTerm, currentPage, itemsPerPage]);

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

  const abrirDetalle = async (venta: Venta) => {
    if (!token) return;
    setModalDetalleOpen(true);
    setLoadingDetalle(true);
    try {
      // Primero aseguramos que tenemos los productos disponibles cargados
      if (productosDisponibles.length === 0) {
        await fetchSelectOptions();
      }
      
      const response = await fetch(`${API_BASE_URL}/ventas/${venta.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('No se pudo cargar el detalle.');
      const data = await response.json();
      setDetalleActual({ ...data, total: parseFloat(data.total) });
      
      console.log('Productos disponibles:', productosDisponibles);
      console.log('Productos vendidos recibidos:', data.productosVendidos);
      
      // Asegurarse de que los productos vendidos tengan el color correctamente
      const productosConColor = (data.productosVendidos || []).map((producto: any) => {
        console.log('Producto original:', producto);
        
        // Si el producto ya tiene color y no es null/undefined/empty, lo dejamos como está
        if (producto.color && producto.color.trim() !== '') {
          console.log(`Producto ${producto.id_producto_talla} ya tiene color: ${producto.color}`);
          return producto;
        }
        
        // Si no tiene color, buscamos el producto en productosDisponibles
        const productoEncontrado = productosDisponibles.find(p => p.id_producto_talla === producto.id_producto_talla);
        
        if (productoEncontrado && productoEncontrado.color) {
          console.log(`Producto ${producto.id_producto_talla} encontrado con color: ${productoEncontrado.color}`);
          return {
            ...producto,
            color: productoEncontrado.color
          };
        } else {
          console.log(`Producto ${producto.id_producto_talla} no encontrado en productosDisponibles o sin color`);
          return {
            ...producto,
            color: null
          };
        }
      });
      
      console.log('Productos con color asignado:', productosConColor);
      setProductosDetalle(productosConColor);
    } catch (err) {
      toast.error(`Error al ver detalle: ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const abrirModalAgregar = () => {
    setNuevaVenta({
      fecha: new Date().toISOString().split("T")[0],
      tipo_pago: "efectivo",
      id_cliente: null,
      saldo_a_favor_aplicado: 0,
      productos: [],
    });
    setSaldoCliente(0);
    setIsModalOpen(true);
  };

  const cerrarModal = () => setIsModalOpen(false);

  // --- LÓGICA DEL FORMULARIO DE NUEVA VENTA ---

  const handleClienteChange = async (e: SelectChangeEvent<any>) => {
    const id_cliente = Number(e.target.value);
    setNuevaVenta(prev => ({ ...prev, id_cliente }));

    if (id_cliente) {
      try {
        const response = await fetch(`${API_BASE_URL}/clientes/saldo/${id_cliente}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          console.log('Error al obtener saldo, usando saldo 0');
          setSaldoCliente(0);
          return;
        }
        
        const data = await response.json();
        console.log('Datos de saldo recibidos:', data);
        setSaldoCliente(data.saldo_actual || 0);
      } catch (err) {
        console.error('Error al obtener saldo:', err);
        toast.error(`Error al obtener saldo: ${err instanceof Error ? err.message : "Error"}`);
        setSaldoCliente(0);
      }
    } else {
      setSaldoCliente(0);
    }
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<any>) => {
    const { name, value } = e.target;

    if (name === "saldo_a_favor_aplicado") {
        const aplicado = Math.max(0, parseFloat(value) || 0);
        // Validar que no se aplique más del saldo disponible o del total de la venta
        const totalVenta = subtotal; // Usamos subtotal antes de aplicar saldo
        const maxAplicable = Math.min(saldoCliente, totalVenta);
        console.log('En handleFormChange - aplicado:', aplicado, 'maxAplicable:', maxAplicable);
        setNuevaVenta(prev => ({ ...prev, [name]: Math.min(aplicado, maxAplicable) }));
    } else {
        setNuevaVenta(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProductoChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<any>) => {
    const { name, value } = e.target;
    const productos = [...nuevaVenta.productos];

    if (name === "id_producto_talla") {
      const selected = productosDisponibles.find(p => p.id_producto_talla === Number(value));
      if (selected) {
        productos[index] = {
          ...productos[index],
          id_producto_talla: selected.id_producto_talla,
          nombre_producto: selected.nombre,
          nombre_talla: selected.talla,
          color: selected.color,
          precio_unitario: selected.precio_venta,
          stock_disponible: selected.stock,
          cantidad: 1,
        };
      }
    } else {
        const cantidad = Number(value);
        const stock = productos[index].stock_disponible;
        // Validar que la cantidad no exceda el stock
        productos[index] = { ...productos[index], [name]: Math.min(cantidad, stock) };
    }
    setNuevaVenta(prev => ({ ...prev, productos }));
  };

  const agregarProducto = () => {
    setNuevaVenta(prev => ({
      ...prev,
      productos: [...prev.productos, {
        id_producto_talla: 0, nombre_producto: '', nombre_talla: '', color: '',
        precio_unitario: 0, cantidad: 1, stock_disponible: 0
      }],
    }));
  };

  const eliminarProducto = (index: number) => {
    setNuevaVenta(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index),
    }));
  };

  const { subtotal, totalFinal } = useMemo(() => {
    const sub = nuevaVenta.productos.reduce((acc, p) => acc + (p.precio_unitario * p.cantidad), 0);
    const final = sub - (nuevaVenta.saldo_a_favor_aplicado || 0);
    return { subtotal: sub, totalFinal: final };
  }, [nuevaVenta.productos, nuevaVenta.saldo_a_favor_aplicado]);

  // Actualizar el saldo aplicado cuando cambie el subtotal o el saldo del cliente
  useEffect(() => {
    const maxAplicable = Math.min(saldoCliente, subtotal);
    console.log('Saldo del cliente:', saldoCliente);
    console.log('Subtotal:', subtotal);
    console.log('Máximo aplicable:', maxAplicable);
    console.log('Saldo actual aplicado:', nuevaVenta.saldo_a_favor_aplicado);
    
    if (nuevaVenta.saldo_a_favor_aplicado > maxAplicable) {
      console.log('Ajustando saldo aplicado a:', maxAplicable);
      setNuevaVenta(prev => ({ ...prev, saldo_a_favor_aplicado: maxAplicable }));
    }
  }, [subtotal, saldoCliente, nuevaVenta.saldo_a_favor_aplicado]);


  const guardarVenta = async () => {
    if (!nuevaVenta.id_cliente) return toast.warn("Debes seleccionar un cliente.");
    if (nuevaVenta.productos.length === 0) return toast.warn("Debes agregar al menos un producto.");
    if (!token) return toast.error("No estás autorizado.");
    
    const payload = {
      fecha: nuevaVenta.fecha,
      tipo_pago: nuevaVenta.tipo_pago,
      id_cliente: nuevaVenta.id_cliente,
      total: subtotal, // El total real de los productos, el backend recalcula
      saldo_a_favor_aplicado: nuevaVenta.saldo_a_favor_aplicado,
      productos: nuevaVenta.productos.map(p => ({
        id_producto_talla: p.id_producto_talla,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
      })),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Error al guardar la venta.');
      
      toast.success(`Venta #${resData.id_venta} creada correctamente.`);
      await fetchVentas();
      cerrarModal();

    } catch (err) {
      toast.error(`Error al guardar: ${err instanceof Error ? err.message : "Error"}`);
    }
  };

  // --- LÓGICA DE ANULACIÓN ---
  
  const solicitarConfirmacionAnulacion = (venta: Venta) => {
    setVentaAAnular(venta);
    setConfirmDialogOpen(true);
  };

  const confirmarAnulacion = async () => {
    if (!token || !ventaAAnular) return;
    try {
      const response = await fetch(`${API_BASE_URL}/ventas/${ventaAAnular.id}/anular`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al anular la venta.');
      toast.success("Venta anulada y stock restaurado.");
      await fetchVentas();
    } catch (err) {
      toast.error(`Error al anular: ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setConfirmDialogOpen(false);
      setVentaAAnular(null);
    }
  };

  // --- GENERACIÓN DE PDF ---

  const generarPDF = async (venta: Venta) => {
    toast.info("Generando PDF...", { autoClose: 1500 });
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/ventas/${venta.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('No se pudo obtener el detalle para el PDF.');
      const detalleVenta = await response.json();

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // === ENCABEZADO CON DISEÑO PROFESIONAL ===
      // Fondo del encabezado con gradiente simulado
      doc.setFillColor(59, 130, 246); // Azul moderno (blue-500)
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      // Segundo tono para simular gradiente
      doc.setFillColor(37, 99, 235); // Azul más oscuro (blue-600)
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
      doc.text('FACTURA DE VENTA', pageWidth / 2, 55, { align: 'center' });
      
      // Línea decorativa con colores modernos
      doc.setDrawColor(59, 130, 246); // Azul moderno
      doc.setLineWidth(3);
      doc.line(20, 60, pageWidth - 20, 60);
      
      // Línea secundaria más sutil
      doc.setDrawColor(147, 197, 253); // Azul claro
      doc.setLineWidth(1);
      doc.line(20, 63, pageWidth - 20, 63);
      
      // === INFORMACIÓN DE LA VENTA ===
      let yPosition = 75;
      
      // Información principal en dos columnas
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DE LA VENTA', 20, yPosition);
      yPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const cliente = clientesDisponibles.find(c => c.id === detalleVenta.id_cliente);
      const nombreCliente = cliente ? `${cliente.nombre} ${cliente.apellido}` : `ID: ${detalleVenta.id_cliente}`;

      // Columna izquierda
      doc.text(`Número de Venta: #${detalleVenta.id}`, 20, yPosition);
      doc.text(`Fecha: ${new Date(detalleVenta.fecha).toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 20, yPosition + 6);
      doc.text(`Tipo de Pago: ${detalleVenta.tipo_pago}`, 20, yPosition + 12);
      
      // Columna derecha
      doc.text(`Cliente: ${nombreCliente}`, pageWidth / 2, yPosition);
      
      // Estado con color (sin sobreescribir)
      doc.setFont('helvetica', 'bold');
      if (detalleVenta.estado === 'Completado') {
        doc.setTextColor(34, 197, 94); // Verde esmeralda
      } else if (detalleVenta.estado === 'Anulado') {
        doc.setTextColor(239, 68, 68); // Rojo coral
      } else {
        doc.setTextColor(234, 179, 8); // Amarillo
      }
      doc.text(`Estado: ${detalleVenta.estado}`, pageWidth / 2, yPosition + 6);
      
      // Restaurar color negro para el resto del texto
      doc.setTextColor(0, 0, 0);
      
      yPosition += 25;
      
      // === TABLA DE PRODUCTOS ===
      const productosParaPdf = detalleVenta.productosVendidos || [];
      if (productosParaPdf.length > 0) {
        // Calcular totales
        const subtotal = parseFloat(detalleVenta.total);
        const saldoUsado = parseFloat(detalleVenta.monto_saldo_usado || 0);
        const totalFinal = subtotal - saldoUsado;
        
        // Encabezado de la tabla
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALLE DE PRODUCTOS', 20, yPosition);
        yPosition += 8;
      
              autoTable(doc, {
          startY: yPosition,
          head: [["Producto", "Talla", "Color", "Cant.", "P. Unitario", "Subtotal"]],
          headStyles: {
            fillColor: [59, 130, 246], // Azul moderno
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
          },
          body: productosParaPdf.map((p: any) => {
            // Buscar el color en productosDisponibles si no existe
            let colorMostrar = 'Sin color';
            if (p.color && p.color.trim() !== '') {
              colorMostrar = p.color;
            } else {
              // Intentar encontrar el color en productosDisponibles
              const productoEncontrado = productosDisponibles.find(prod => prod.id_producto_talla === p.id_producto_talla);
              if (productoEncontrado?.color && productoEncontrado.color.trim() !== '') {
                colorMostrar = productoEncontrado.color;
              }
            }
            
            return [
              p.nombre_producto,
              p.nombre_talla,
              colorMostrar,
              p.cantidad.toString(),
              new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP', 
                maximumFractionDigits: 0 
              }).format(parseFloat(p.precio_unitario)),
              new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP', 
                maximumFractionDigits: 0 
              }).format(parseFloat(p.subtotal))
            ];
          }),
          styles: {
            fontSize: 9,
            cellPadding: 4
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252] // Gris muy claro moderno
          },
          margin: { left: 20, right: 20 }
        });
        
        // === RESUMEN FINANCIERO ===
        const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
        yPosition = finalY + 15;
        
        // Fondo para el resumen
        doc.setFillColor(249, 250, 251); // Gris muy claro
        doc.rect(20, yPosition - 5, pageWidth - 40, 50, 'F');
        
        // Borde superior con color
        doc.setDrawColor(59, 130, 246); // Azul moderno
        doc.setLineWidth(2);
        doc.line(20, yPosition - 5, pageWidth - 20, yPosition - 5);
        
        // Bordes del resumen
        doc.setDrawColor(209, 213, 219); // Gris suave
        doc.setLineWidth(0.5);
        doc.rect(20, yPosition - 5, pageWidth - 40, 50);
        
        // Texto del resumen
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN FINANCIERO', 25, yPosition + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Subtotal:`, pageWidth - 80, yPosition + 5);
        doc.text(new Intl.NumberFormat('es-CO', { 
          style: 'currency', 
          currency: 'COP', 
          maximumFractionDigits: 0 
        }).format(subtotal), pageWidth - 25, yPosition + 5, { align: 'right' });
        
        if (saldoUsado > 0) {
          doc.text(`Saldo Usado:`, pageWidth - 80, yPosition + 12);
          doc.text(`-${new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP', 
            maximumFractionDigits: 0 
          }).format(saldoUsado)}`, pageWidth - 25, yPosition + 12, { align: 'right' });
        }
        
        // Línea separadora
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(1);
        doc.line(pageWidth - 80, yPosition + 20, pageWidth - 25, yPosition + 20);
        
        // Total
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`TOTAL A PAGAR:`, pageWidth - 80, yPosition + 30);
        doc.text(new Intl.NumberFormat('es-CO', { 
          style: 'currency', 
          currency: 'COP', 
          maximumFractionDigits: 0 
        }).format(totalFinal), pageWidth - 25, yPosition + 30, { align: 'right' });
        
        yPosition += 60;
      }
      
      // === PIE DE PÁGINA ===
      const footerY = pageHeight - 30;
      
      // Línea superior del pie con color moderno
      doc.setDrawColor(59, 130, 246); // Azul moderno
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
      const fileName = `venta-${detalleVenta.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF generado exitosamente");
    } catch (err) {
      toast.error(`Error al generar PDF: ${err instanceof Error ? err.message : "Error"}`);
    }
  };

  // --- RENDERIZADO DEL COMPONENTE ---

  const getEstadoColor = (estado: Venta['estado']) => {
    switch (estado) {
        case 'Completado': return 'bg-green-200 text-green-800';
        case 'Anulado': return 'bg-red-200 text-red-800';
        case 'Devuelto Parcialmente': return 'bg-yellow-200 text-yellow-800';
        case 'Devuelto Totalmente': return 'bg-orange-200 text-orange-800';
        default: return 'bg-gray-200 text-gray-800';
    }
  };

  if (loading && allVentas.length === 0) return <div className="p-4 text-center">Cargando ventas...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200">
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={abrirModalAgregar}>
          Agregar Venta
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
              <TableCell isHeader>Documento</TableCell>
              <TableCell isHeader>Cliente</TableCell>
              <TableCell isHeader>Fecha</TableCell>
              <TableCell isHeader>Total</TableCell>
              <TableCell isHeader>Estado</TableCell>
              <TableCell isHeader>Acciones</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-400">
            {currentTableData.map((venta) => (
              <TableRow key={venta.id}>
                <TableCell className="font-medium">#{venta.id}</TableCell>
                <TableCell>{venta.documento}</TableCell>
                <TableCell>{`${venta.nombre} ${venta.apellido}`}</TableCell>
                <TableCell>{new Date(venta.fecha).toLocaleDateString('es-CO')}</TableCell>
                <TableCell>${venta.total.toLocaleString('es-CO')}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getEstadoColor(venta.estado)}`}>
                    {venta.estado}
                  </span>
                </TableCell>
                <TableCell className="space-x-1">
                  <Tooltip title="Ver Detalle"><IconButton color="secondary" onClick={() => abrirDetalle(venta)}><VisibilityIcon /></IconButton></Tooltip>
                  <Tooltip title="Descargar PDF"><IconButton color="default" onClick={() => generarPDF(venta)}><PictureAsPdfIcon /></IconButton></Tooltip>
                  <Tooltip title="Anular Venta">
                    <span>
                      <IconButton color="error" onClick={() => solicitarConfirmacionAnulacion(venta)} disabled={venta.estado === 'Anulado'}>
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
        <p className="text-sm">Mostrando {currentTableData.length} de {totalItems} ventas</p>
        {totalPages > 1 && <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />}
      </div>

      {/* MODAL DETALLE DE VENTA */}
      <Modal isOpen={modalDetalleOpen} handleClose={() => setModalDetalleOpen(false)}>
         <h2 className="text-2xl font-bold mb-6">Detalle de Venta #{detalleActual?.id}</h2>
         {loadingDetalle ? <p>Cargando...</p> : (
            <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div><strong>ID:</strong> #{detalleActual?.id}</div>
                    <div><strong>Fecha:</strong> {new Date(detalleActual?.fecha || '').toLocaleDateString('es-CO')}</div>
                    <div><strong>Estado:</strong> {detalleActual?.estado}</div>
                    <div><strong>Tipo Pago:</strong> {detalleActual?.tipo_pago}</div>
                    <div className="col-span-2"><strong>Cliente:</strong> {`${detalleActual?.nombre || ''} ${detalleActual?.apellido || ''}`}</div>
                    <div className="font-bold"><strong>Subtotal:</strong> ${detalleActual?.total?.toLocaleString('es-CO')}</div>
                    <div className="font-bold"><strong>Saldo Usado:</strong> -${(detalleActual?.monto_saldo_usado || 0).toLocaleString('es-CO')}</div>
                    <div className="font-bold text-lg"><strong>Total Pagado:</strong> ${( (detalleActual?.total || 0) - (detalleActual?.monto_saldo_usado || 0) ).toLocaleString('es-CO')}</div>
                </div>
                <h3 className="text-xl font-bold mt-8 mb-4">Productos Vendidos</h3>
                <div className="overflow-x-auto border rounded-lg">
                    <Table>
                        <TableHeader><TableRow><TableCell isHeader>Producto</TableCell><TableCell isHeader>Talla</TableCell><TableCell isHeader>Color</TableCell><TableCell isHeader>Cant.</TableCell><TableCell isHeader>P. Unitario</TableCell><TableCell isHeader>Subtotal</TableCell></TableRow></TableHeader>
                        <TableBody>{productosDetalle.map((p) => (<TableRow key={p.id_producto_talla}><TableCell>{p.nombre_producto}</TableCell><TableCell>{p.nombre_talla}</TableCell><TableCell>
  {p.color && p.color.trim() !== '' ? 
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded border" style={{backgroundColor: p.color}}></div>
      <span>{p.color}</span>
    </div> : 'Sin color'}
</TableCell><TableCell>{p.cantidad}</TableCell><TableCell>${p.precio_unitario.toLocaleString('es-CO')}</TableCell><TableCell>${p.subtotal.toLocaleString('es-CO')}</TableCell></TableRow>))}</TableBody>
                    </Table>
                </div>
            </>
         )}
      </Modal>

      {/* MODAL AGREGAR VENTA */}
      <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="md" fullWidth>
        <DialogTitle>Agregar Nueva Venta</DialogTitle>
        <DialogContent dividers>
          {loadingSelects ? <p>Cargando...</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormControl fullWidth><InputLabel>Tipo de Pago</InputLabel><Select name="tipo_pago" value={nuevaVenta.tipo_pago} label="Tipo de Pago" onChange={handleFormChange}><MenuItem value="efectivo">Efectivo</MenuItem><MenuItem value="tarjeta">Tarjeta</MenuItem><MenuItem value="transferencia">Transferencia</MenuItem><MenuItem value="cheque">Cheque</MenuItem><MenuItem value="saldo_a_favor">Saldo a Favor</MenuItem></Select></FormControl>
                <FormControl fullWidth><InputLabel>Cliente</InputLabel><Select name="id_cliente" value={nuevaVenta.id_cliente || ''} label="Cliente" onChange={handleClienteChange}><MenuItem value=""><em>Seleccionar</em></MenuItem>{clientesDisponibles.map((c) => (<MenuItem key={c.id} value={c.id}>{`${c.nombre} ${c.apellido} - ${c.documento}`}</MenuItem>))}</Select></FormControl>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Productos</h3>
                {nuevaVenta.productos.map((prod, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-lg">
                    <div className="col-span-12 sm:col-span-5"><FormControl fullWidth size="small"><InputLabel>Producto / Talla / Color (Stock)</InputLabel><Select name="id_producto_talla" value={prod.id_producto_talla || ''} label="Producto / Talla / Color (Stock)" onChange={(e) => handleProductoChange(i, e)}>{productosDisponibles.map((p) => (<MenuItem key={p.id_producto_talla} value={p.id_producto_talla}><div className="flex items-center gap-2"><div className="w-4 h-4 rounded border" style={{backgroundColor: p.color}}></div><span>{`${p.nombre} - ${p.talla} - ${p.color} (Stock: ${p.stock})`}</span></div></MenuItem>))}</Select></FormControl></div>
                    <div className="col-span-4 sm:col-span-2"><TextField label="Precio" type="number" name="precio_unitario" value={prod.precio_unitario} size="small" fullWidth InputProps={{ readOnly: true }} /></div>
                    <div className="col-span-4 sm:col-span-2"><TextField label="Cantidad" type="number" name="cantidad" value={prod.cantidad} onChange={(e) => handleProductoChange(i, e)} size="small" fullWidth InputProps={{ inputProps: { max: prod.stock_disponible, min: 1 } }} /></div>
                    <div className="col-span-4 sm:col-span-2"><TextField label="Subtotal" value={`$${(prod.precio_unitario * prod.cantidad).toLocaleString('es-CO')}`} size="small" fullWidth InputProps={{ readOnly: true }} /></div>
                    <div className="col-span-12 sm:col-span-1 text-right"><IconButton onClick={() => eliminarProducto(i)} color="error"><DeleteIcon /></IconButton></div>
                  </div>
                ))}
                <Button variant="outlined" startIcon={<AddIcon />} onClick={agregarProducto}>Agregar Producto</Button>
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                  <div>
                      <p className="font-bold">Saldo disponible del cliente:</p>
                      <p className="text-lg text-green-600">${saldoCliente.toLocaleString('es-CO')}</p>
                  </div>
                  <TextField
                        label="Usar saldo a favor"
                        type="number"
                        name="saldo_a_favor_aplicado"
                        value={nuevaVenta.saldo_a_favor_aplicado}
                        onChange={handleFormChange}
                        InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            inputProps: { max: Math.min(saldoCliente, subtotal), min: 0 }
                        }}
                        helperText={`Máximo aplicable: $${Math.min(saldoCliente, subtotal).toLocaleString('es-CO')}`}
                    />
              </div>

              <div className="mt-4 text-right">
                <p>Subtotal: ${subtotal.toLocaleString('es-CO')}</p>
                <p>Descuento por saldo: -${(nuevaVenta.saldo_a_favor_aplicado || 0).toLocaleString('es-CO')}</p>
                <p className="font-bold text-lg">Total a Pagar: ${totalFinal.toLocaleString('es-CO')}</p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarModal}>Cancelar</Button>
          <Button onClick={guardarVenta} variant="contained">Guardar Venta</Button>
        </DialogActions>
      </Dialog>
      
      {/* DIÁLOGO CONFIRMACIÓN ANULAR */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirmar Anulación</DialogTitle>
        <DialogContent><DialogContentText>¿Estás seguro de anular la venta <strong>#{ventaAAnular?.id}</strong>? Esta acción revertirá el stock y el saldo usado.</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button><Button onClick={confirmarAnulacion} color="error">Anular</Button></DialogActions>
      </Dialog>
    </div>
  );
}
