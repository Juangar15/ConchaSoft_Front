import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';

// --- Importaciones de Material-UI (MUI) ---
import {
  Button,
  TextField,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete, // Importar Autocomplete
  Box,
} from "@mui/material";
import { SelectChangeEvent } from '@mui/material/Select';
import {
  PictureAsPdf as PictureAsPdfIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

// --- Importaciones de Terceros ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Importaciones de Contexto y UI Personalizada ---
import { useAuth } from '../../context/authContext';
import Modal from "../ui/modal/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";


// --- CONFIGURACIÓN DE LA URL BASE DE TU API ---
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api';

// --- INTERFACES ---
interface Compra {
  id: number;
  fecha: string;
  total: number;
  estado: 0 | 1;
  tipo_pago: string;
  id_proveedor: number;
  nombre_proveedor: string;
}

interface CompraProductoDetalle {
  id: number;
  id_producto: number;
  id_talla: number;
  id_producto_talla: number;
  nombre_producto: string;
  nombre_talla: string;
  color: string;
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

interface ProveedorSeleccionable {
  id: number;
  nombre_comercial: string;
  razon_social: string | null;
}

export default function ComprasTable() {
  // --- ESTADOS LOCALES ---
  const [allCompras, setAllCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { token, isAuthenticated, logout } = useAuth();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [detalleActual, setDetalleActual] = useState<Compra | null>(null);
  const [productosDetalle, setProductosDetalle] = useState<CompraProductoDetalle[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [compraEditandoId, setCompraEditandoId] = useState<number | null>(null);

  const [nuevaCompra, setNuevaCompra] = useState<{
    fecha: string;
    tipo_pago: string;
    id_proveedor: number | null;
    productos: (Partial<ProductoSeleccionable> & { cantidad?: number })[];
  }>({
    fecha: new Date().toISOString().split("T")[0],
    tipo_pago: "Efectivo",
    id_proveedor: null,
    productos: [],
  });

  const [productosDisponibles, setProductosDisponibles] = useState<ProductoSeleccionable[]>([]);
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState<ProveedorSeleccionable[]>([]);
  const [loadingSelects, setLoadingSelects] = useState(false);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [compraAAnular, setCompraAAnular] = useState<Compra | null>(null);

  // --- LÓGICA DE DATOS ---
  const fetchCompras = async () => {
    if (!isAuthenticated || !token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/compras`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.status === 401 || response.status === 403) { toast.error("Sesión expirada."); logout(); return; }
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const data = await response.json();
      setAllCompras(data.map((c: any) => ({ ...c, total: parseFloat(c.total) || 0 })));
    } catch (err) {
      setError(`No se pudieron cargar las compras: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectOptions = async () => {
    if (!isAuthenticated || !token) return;
    setLoadingSelects(true);
    try {
      const [productsResponse, suppliersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/productos/activos`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/proveedores/activos`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (!productsResponse.ok) throw new Error('Error al cargar productos.');
      if (!suppliersResponse.ok) throw new Error('Error al cargar proveedores.');

      const productsData: ProductoAPI[] = await productsResponse.json();
      const suppliersData: ProveedorSeleccionable[] = await suppliersResponse.json();

      setProductosDisponibles(productsData.flatMap(p => p.variantes.map(v => ({
        id_producto_talla: v.id_producto_talla, id_producto: p.id, nombre_producto: p.nombre,
        id_talla: v.id_talla, nombre_talla: v.nombre_talla, color: v.color,
        stock_disponible: v.stock, precio_unitario: parseFloat(p.valor) || 0
      }))));
      setProveedoresDisponibles(suppliersData);
    } catch (err) {
      toast.error(`Error al cargar opciones: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      setLoadingSelects(false);
    }
  };

  useEffect(() => { if(isAuthenticated) fetchCompras(); }, [isAuthenticated, token]);
  useEffect(() => { if (isModalOpen && isAuthenticated) fetchSelectOptions(); }, [isModalOpen, isAuthenticated]);

  const { currentTableData, totalPages, totalItems } = useMemo(() => {
    const sorted = [...allCompras].sort((a, b) => a.id - b.id)
    const filtered = sorted.filter(c =>
      c.id.toString().includes(searchTerm.toLowerCase()) ||
      c.nombre_proveedor.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return {
      currentTableData: filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      totalItems: filtered.length,
    };
  }, [allCompras, searchTerm, currentPage, itemsPerPage]);

  const handlePageChange = (e: React.ChangeEvent<unknown>, v: number) => setCurrentPage(v);
  const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCurrentPage(1); };
  const handleItemsPerPageChange = (e: SelectChangeEvent<number>) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); };

  const abrirDetalle = async (compra: Compra) => {
    setModalDetalleOpen(true);
    setLoadingDetalle(true);
    try {
      const response = await fetch(`${API_BASE_URL}/compras/${compra.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error("No se pudo cargar el detalle.");
      const data = await response.json();
      setDetalleActual({ ...data, total: parseFloat(data.total) || 0 });
      setProductosDetalle((data.items || []).map((p: any) => ({ ...p, id: p.id_compra_prod_item, precio_unitario: parseFloat(p.precio_unitario), subtotal: parseFloat(p.subtotal) })));
    } catch (err) {
      toast.error(`Error al ver detalle: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const abrirModalAgregar = () => {
    setModoEdicion(false);
    setCompraEditandoId(null);
    setNuevaCompra({ fecha: new Date().toISOString().split("T")[0], tipo_pago: "Efectivo", id_proveedor: null, productos: [] });
    setIsModalOpen(true);
  };

  const cerrarModal = () => setIsModalOpen(false);

  const handleProductoChange = (index: number, field: string, value: any) => {
    setNuevaCompra(prev => {
      const updatedProductos = [...prev.productos];
      if (field === 'producto') {
        updatedProductos[index] = value ? { ...(value as ProductoSeleccionable), cantidad: 1 } : {};
      } else if (field === 'cantidad') {
        const cantidad = Math.max(1, parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 1);
        updatedProductos[index] = { ...updatedProductos[index], cantidad };
      } else if (field === 'precio_unitario') {
        updatedProductos[index] = { ...updatedProductos[index], precio_unitario: parseFloat(value) || 0 };
      }
      return { ...prev, productos: updatedProductos };
    });
  };

  const agregarProducto = () => setNuevaCompra(prev => ({ ...prev, productos: [...prev.productos, {}] }));
  const eliminarProducto = (index: number) => setNuevaCompra(prev => ({ ...prev, productos: prev.productos.filter((_, i) => i !== index) }));

  const { subtotal, iva, total } = useMemo(() => {
    const sub = nuevaCompra.productos.reduce((acc, p) => acc + (p.precio_unitario || 0) * (p.cantidad || 0), 0);
    const tax = sub * 0.19;
    return { subtotal: sub, iva: tax, total: sub + tax };
  }, [nuevaCompra.productos]);

  const guardarCompra = async () => {
    if (!nuevaCompra.id_proveedor) return toast.warn("Debes seleccionar un proveedor.");
    if (nuevaCompra.productos.length === 0 || nuevaCompra.productos.some(p => !p.id_producto_talla)) return toast.warn("Todos los items deben tener un producto seleccionado y cantidad válida.");

    const payload = {
      fecha: nuevaCompra.fecha, 
      tipo_pago: nuevaCompra.tipo_pago, 
      estado: 1, // 1 = activa, 0 = anulada
      id_proveedor: nuevaCompra.id_proveedor,
      productosComprados: nuevaCompra.productos.map(p => ({
        id_producto: p.id_producto, 
        id_talla: p.id_talla, 
        color: p.color, 
        cantidad: p.cantidad, 
        precio_unitario: p.precio_unitario
      })),
    };

    console.log('=== CREANDO COMPRA ===');
    console.log('Payload enviado:', payload);
    console.log('Estado enviado:', payload.estado, '(1 = activa, 0 = anulada)');

    try {
      const response = await fetch(`${API_BASE_URL}/compras/completa`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify(payload)
      });
      
      console.log('Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) { 
        const err = await response.json(); 
        console.error('Error del servidor:', err);
        throw new Error(err.error || 'Error al guardar la compra'); 
      }
      
      const responseData = await response.json();
      console.log('Datos de respuesta:', responseData);
      
      toast.success("Compra creada con éxito.");
      await fetchCompras();
      cerrarModal();
    } catch (err) {
      console.error('Error completo:', err);
      toast.error(`Error al guardar: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  };

  const solicitarConfirmacionAnulacion = (compra: Compra) => { setCompraAAnular(compra); setConfirmDialogOpen(true); };
  
  const confirmarAnulacion = async () => {
    if (!compraAAnular) return;
    try {
        const response = await fetch(`${API_BASE_URL}/compras/completa/${compraAAnular.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ estado: 0 }),
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error || `Error al anular compra.`); }
        toast.success("Compra anulada y stock revertido.");
        await fetchCompras();
    } catch (err) {
        toast.error(`Error al anular: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
        setConfirmDialogOpen(false);
        setCompraAAnular(null);
    }
  };

  const generarPDF = async (compra: Compra) => {
    toast.info("Generando PDF...", { autoClose: 1500 });
    try {
      const response = await fetch(`${API_BASE_URL}/compras/${compra.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('No se pudo obtener el detalle para el PDF.');
      const compraDetalle = await response.json();

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
      doc.text('ORDEN DE COMPRA', pageWidth / 2, 55, { align: 'center' });
      
      // Línea decorativa con colores modernos
      doc.setDrawColor(59, 130, 246); // Azul moderno
      doc.setLineWidth(3);
      doc.line(20, 60, pageWidth - 20, 60);
      
      // Línea secundaria más sutil
      doc.setDrawColor(147, 197, 253); // Azul claro
      doc.setLineWidth(1);
      doc.line(20, 63, pageWidth - 20, 63);
      
      // === INFORMACIÓN DE LA COMPRA ===
      let yPosition = 75;
      
      // Información principal en dos columnas
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DE LA COMPRA', 20, yPosition);
      yPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      // Columna izquierda
      doc.text(`Número de Compra: #${compraDetalle.id}`, 20, yPosition);
      doc.text(`Fecha: ${new Date(compraDetalle.fecha).toLocaleDateString('es-CO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 20, yPosition + 6);
      doc.text(`Tipo de Pago: ${compraDetalle.tipo_pago}`, 20, yPosition + 12);
      
      // Columna derecha
      doc.text(`Proveedor: ${compraDetalle.nombre_proveedor}`, pageWidth / 2, yPosition);
      
      // Estado con color (sin sobreescribir)
      doc.setFont('helvetica', 'bold');
      if (compraDetalle.estado === 1) {
        doc.setTextColor(34, 197, 94); // Verde esmeralda más bonito
      } else {
        doc.setTextColor(239, 68, 68); // Rojo coral más bonito
      }
      doc.text(`Estado: ${compraDetalle.estado === 1 ? 'COMPLETADA' : 'ANULADA'}`, pageWidth / 2, yPosition + 6);
      
      // Restaurar color negro para el resto del texto
      doc.setTextColor(0, 0, 0);
      
      yPosition += 25;
      
      // === TABLA DE PRODUCTOS ===
      const productosParaPdf = compraDetalle.items || [];
      if (productosParaPdf.length > 0) {
        // Calcular totales
        const subtotal = productosParaPdf.reduce((sum: number, p: any) => sum + (p.precio_unitario * p.cantidad), 0);
        const iva = subtotal * 0.19;
        const total = subtotal + iva;
        
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
          body: productosParaPdf.map((p: any) => [
            p.nombre_producto,
            p.nombre_talla,
            p.color,
            p.cantidad.toString(),
            new Intl.NumberFormat('es-CO', { 
              style: 'currency', 
              currency: 'COP', 
              maximumFractionDigits: 0 
            }).format(p.precio_unitario),
            new Intl.NumberFormat('es-CO', { 
              style: 'currency', 
              currency: 'COP', 
              maximumFractionDigits: 0 
            }).format(p.precio_unitario * p.cantidad)
          ]),
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
        
        // Fondo para el resumen con gradiente sutil
        doc.setFillColor(249, 250, 251); // Gris muy claro
        doc.rect(20, yPosition - 5, pageWidth - 40, 40, 'F');
        
        // Borde superior con color
        doc.setDrawColor(59, 130, 246); // Azul moderno
        doc.setLineWidth(2);
        doc.line(20, yPosition - 5, pageWidth - 20, yPosition - 5);
        
        // Bordes del resumen
        doc.setDrawColor(209, 213, 219); // Gris suave
        doc.setLineWidth(0.5);
        doc.rect(20, yPosition - 5, pageWidth - 40, 40);
        
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
        
        doc.text(`IVA (19%):`, pageWidth - 80, yPosition + 12);
        doc.text(new Intl.NumberFormat('es-CO', { 
          style: 'currency', 
          currency: 'COP', 
          maximumFractionDigits: 0 
        }).format(iva), pageWidth - 25, yPosition + 12, { align: 'right' });
        
        // Línea separadora
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(1);
        doc.line(pageWidth - 80, yPosition + 16, pageWidth - 25, yPosition + 16);
        
        // Total
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`TOTAL:`, pageWidth - 80, yPosition + 25);
        doc.text(new Intl.NumberFormat('es-CO', { 
          style: 'currency', 
          currency: 'COP', 
          maximumFractionDigits: 0 
        }).format(total), pageWidth - 25, yPosition + 25, { align: 'right' });
        
        yPosition += 50;
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
      const fileName = `compra-${compraDetalle.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF generado exitosamente");
    } catch (err) {
      toast.error(`Error al generar PDF: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  };

  if (loading && allCompras.length === 0) return <div className="p-4 text-center">Cargando compras...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200">
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={abrirModalAgregar}>Agregar Compra</Button>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <TextField label="Buscar por ID o Proveedor" variant="outlined" size="small" value={searchTerm} onChange={handleChangeSearch} />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Items/pág</InputLabel>
            <Select value={itemsPerPage} label="Items/pág" onChange={handleItemsPerPageChange}><MenuItem value={5}>5</MenuItem><MenuItem value={10}>10</MenuItem><MenuItem value={20}>20</MenuItem></Select>
          </FormControl>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableCell isHeader>ID</TableCell><TableCell isHeader>Fecha</TableCell><TableCell isHeader>Proveedor</TableCell><TableCell isHeader>Total</TableCell><TableCell isHeader>Estado</TableCell><TableCell isHeader>Acciones</TableCell></TableRow></TableHeader>
          <TableBody>
            {currentTableData.map((compra) => (
              <TableRow key={compra.id}>
                <TableCell>#{compra.id}</TableCell>
                <TableCell>{new Date(compra.fecha).toLocaleDateString('es-CO')}</TableCell>
                <TableCell>{compra.nombre_proveedor}</TableCell>
                <TableCell>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(compra.total)}</TableCell>
                <TableCell><span className={`px-2 py-1 rounded-full text-xs font-semibold ${compra.estado === 1 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{compra.estado === 1 ? "Completada" : "Anulada"}</span></TableCell>
                <TableCell className="space-x-1">
                  <Tooltip title="Ver Detalle"><IconButton color="secondary" onClick={() => abrirDetalle(compra)}><VisibilityIcon /></IconButton></Tooltip>
                  <Tooltip title="Descargar PDF"><IconButton onClick={() => generarPDF(compra)}><PictureAsPdfIcon /></IconButton></Tooltip>
                  <Tooltip title={compra.estado === 0 ? 'La compra ya está anulada' : 'Anular Compra'}><span><IconButton color="error" onClick={() => solicitarConfirmacionAnulacion(compra)} disabled={compra.estado === 0}><CancelIcon /></IconButton></span></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 flex justify-between items-center"><p className="text-sm text-gray-700">Mostrando {currentTableData.length} de {totalItems}</p>{totalPages > 1 && <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />}</div>

      <Modal isOpen={modalDetalleOpen} handleClose={() => setModalDetalleOpen(false)}>
        <h2 className="text-2xl font-bold mb-4">Detalle de Compra #{detalleActual?.id}</h2>
        {loadingDetalle ? <p>Cargando...</p> : <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div><strong>ID:</strong> #{detalleActual?.id}</div>
                <div><strong>Fecha:</strong> {detalleActual?.fecha ? new Date(detalleActual.fecha).toLocaleDateString('es-CO') : ''}</div>
                <div><strong>Total:</strong> {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(detalleActual?.total || 0)}</div>
                <div><strong>Estado:</strong> {detalleActual?.estado === 1 ? "Completada" : "Anulada"}</div>
                <div className="col-span-2"><strong>Proveedor:</strong> {detalleActual?.nombre_proveedor}</div>
            </div>
            <h3 className="text-xl font-bold mt-6 mb-2">Productos</h3>
            <div className="space-y-2">
            {productosDetalle.map((prod) => (
                <div key={prod.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex items-center gap-2">
                        <Box component="span" sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: prod.color, border: '1px solid #ccc' }} />
                        <span>{prod.nombre_producto} ({prod.nombre_talla})</span>
                    </div>
                    <span>Cant: {prod.cantidad}</span>
                </div>
            ))}
            </div>
          <div className="mt-8 flex justify-end"><Button onClick={() => setModalDetalleOpen(false)} variant="contained">Cerrar</Button></div>
        </>}
      </Modal>

      <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="lg" fullWidth>
        <DialogTitle>Nueva Compra</DialogTitle>
        <DialogContent dividers>
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TextField label="Fecha" type="date" value={nuevaCompra.fecha} InputLabelProps={{ shrink: true }} disabled />
              <FormControl fullWidth><InputLabel>Tipo de Pago</InputLabel><Select name="tipo_pago" value={nuevaCompra.tipo_pago} label="Tipo de Pago" onChange={(e) => setNuevaCompra(p => ({ ...p, tipo_pago: e.target.value }))}><MenuItem value="Efectivo">Efectivo</MenuItem><MenuItem value="Tarjeta">Tarjeta</MenuItem><MenuItem value="Transferencia">Transferencia</MenuItem></Select></FormControl>
              <FormControl fullWidth><InputLabel>Proveedor*</InputLabel><Select required name="id_proveedor" value={nuevaCompra.id_proveedor || ''} label="Proveedor*" onChange={(e) => setNuevaCompra(p => ({ ...p, id_proveedor: Number(e.target.value) }))}>{proveedoresDisponibles.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre_comercial}</MenuItem>)}</Select></FormControl>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Productos</h3>
              {nuevaCompra.productos.map((prod, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg bg-gray-50">
                  <div className="col-span-12 md:col-span-5">
                    <Autocomplete
                      options={productosDisponibles}
                      getOptionLabel={(option) => `${option.nombre_producto} - ${option.nombre_talla} (${option.color})`}
                      value={productosDisponibles.find(p => p.id_producto_talla === prod.id_producto_talla) || null}
                      onChange={(event, newValue) => handleProductoChange(i, 'producto', newValue)}
                      isOptionEqualToValue={(option, value) => option.id_producto_talla === value.id_producto_talla}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: option.color, mr: 1.5, border: '1px solid #ccc', flexShrink: 0 }} />
                          {option.nombre_producto} - {option.nombre_talla} (Stock: {option.stock_disponible})
                        </Box>
                      )}
                      renderInput={(params) => <TextField {...params} label="Buscar Producto*" size="small" />}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <TextField label="Precio Unitario" type="number" value={prod.precio_unitario || ''} onChange={(e) => handleProductoChange(i, 'precio_unitario', e.target.value)} size="small" fullWidth />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <TextField label="Cantidad*" type="text" value={prod.cantidad || ''} onChange={(e) => handleProductoChange(i, 'cantidad', e.target.value)} inputProps={{ pattern: "[0-9]*" }} size="small" fullWidth />
                  </div>
                  <div className="col-span-2 md:col-span-2 text-right">
                    <Tooltip title="Eliminar Producto"><IconButton onClick={() => eliminarProducto(i)} color="error"><DeleteIcon /></IconButton></Tooltip>
                  </div>
                </div>
              ))}
              <Button variant="outlined" startIcon={<AddIcon />} onClick={agregarProducto}>Agregar Producto</Button>
            </div>
            <div className="mt-4 text-right space-y-1">
                <p>Subtotal: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(subtotal)}</p>
                <p>IVA (19%): {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(iva)}</p>
                <p className="font-bold text-lg">Total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total)}</p>
            </div>
          </div>
        </DialogContent>
        <DialogActions><Button onClick={cerrarModal}>Cancelar</Button><Button onClick={guardarCompra} variant="contained">Guardar Compra</Button></DialogActions>
      </Dialog>
      
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirmar Anulación</DialogTitle>
        <DialogContent>
          <DialogContentText>¿Estás seguro de anular la compra <strong>#{compraAAnular?.id}</strong>? Esta acción revertirá el stock de los productos y no se puede deshacer.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
          <Button onClick={confirmarAnulacion} color="error">Anular Compra</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}