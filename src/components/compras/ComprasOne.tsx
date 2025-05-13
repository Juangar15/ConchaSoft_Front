import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
  } from "../ui/table";
  import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import CancellIcon from '@mui/icons-material/Cancel'
import VisibilityIcon from '@mui/icons-material/Visibility'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import Tooltip from '@mui/material/Tooltip'
  import Modal from "../ui/modal/Modal";
    import Dialog from '@mui/material/Dialog';
  import DialogActions from '@mui/material/DialogActions';
  import DialogContent from '@mui/material/DialogContent';
  import DialogContentText from '@mui/material/DialogContentText';
  import DialogTitle from '@mui/material/DialogTitle';
  import { useState } from "react";
  import jsPDF from "jspdf";
  import autoTable from "jspdf-autotable";
  
  interface Compra {
    id: number;
    codigo: string;
    fecha: string;
    nombre: string;
    total: number;
    estado: string;
  }
  
  export default function ComprasTable() {
    const [compras, setCompras] = useState<Compra[]>([
      {
        id: 1,
        codigo: "C001",
        fecha: "2025-04-06",
        nombre: "Ana Pérez",
        total: 150.5,
        estado: "Completado",
      },
      {
        id: 2,
        codigo: "C002",
        fecha: "2025-04-05",
        nombre: "Carlos Gómez",
        total: 250.0,
        estado: "Pendiente",
      },
    ]);

    const productosDisponibles = [
      { nombre: "Producto 1", precio: 100, cantidad: 1 }, { nombre: "Producto 2", precio: 150, cantidad: 2 }
    ]

    const nombreProveedor = "Juanchotalarga"
  
    const generarPDF = (compra: Compra) => {
      const doc = new jsPDF();
    
      doc.setFontSize(18);
      doc.text("Detalle de Compra", 14, 22);
    
      doc.setFontSize(12);
      doc.text(`Código: ${compra.codigo}`, 14, 32);
      doc.text(`Fecha: ${compra.fecha}`, 14, 40);
      doc.text(`Total: $${compra.total.toFixed(2)}`, 14, 56);
      doc.text(`Estado: ${compra.estado}`, 14, 64);
    
      // Agregar una tabla ejemplo de productos (puedes modificarlo para usar los productos reales si los tienes guardados)
      autoTable(doc, {
        startY: 72,
        head: [["Producto", "Precio", "Cantidad", "Subtotal"]],
        body: [
          ["Zapato Deportivo", "$50.00", "1", "$50.00"],
          ["Botín Cuero", "$80.00", "1", "$80.00"],
        ],
      });
    
      doc.save(`compra-${compra.codigo}.pdf`);
    };

    const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
    const [detalleActual, setDetalleActual] = useState<Compra | null>(null);
       const [mensajeAlerta, setMensajeAlerta] = useState("");
         const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
          const [compraAEliminar, setCompraAEliminar] = useState<Compra | null>(null);

    const abrirDetalle = (compra: Compra) => {
      setDetalleActual(compra);
      setModalDetalleOpen(true);
    };
    
    const cerrarDetalle = () => {
      setModalDetalleOpen(false);
      setDetalleActual(null);
    };

    const [modalAgregarOpen, setModalAgregarOpen] = useState(false);
const [nuevaCompra, setNuevaCompra] = useState({
  fecha: new Date().toISOString().split("T")[0],
  tipoPago: "Efectivo",
  cliente: "",
  productos: [] as { nombre: string; precio: number; cantidad: number }[],
});

const guardarCompra = () => {
  if (!nuevaCompra.cliente.trim()) return;

  const nueva = {
    id: compras.length + 1,
    codigo: `V00${compras.length + 1}`,
    fecha: nuevaCompra.fecha,
    nombre: nuevaCompra.cliente,
    total: total,
    estado: "Completado",
  };

  setCompras((prev) => [...prev, nueva]);

  setMensajeAlerta("¡Compra creada correctamente.");

  setTimeout(() => setMensajeAlerta(""), 3000);

  setNuevaCompra({
    fecha: new Date().toISOString().split("T")[0],
    tipoPago: "Efectivo",
    cliente: "",
    productos: [],
  });

  setModalAgregarOpen(false);
};

const agregarProducto = () => {
  setNuevaCompra((prev) => ({
    ...prev,
    productos: [
      ...prev.productos,
      { nombre: "", precio: 0, cantidad: 1 },
    ],
  }));
};

const eliminarProducto = (index: number) => {
  setNuevaCompra((prev) => ({
    ...prev,
    productos: prev.productos.filter((_, i) => i !== index),
  }));
};

const subtotal = nuevaCompra.productos.reduce(
  (acc, p) => acc + p.precio * p.cantidad,
  0
);
const iva = subtotal * 0.19;
const total = subtotal + iva;


const solicitarConfirmacionEliminacion = (compra: Compra) => {
  setCompraAEliminar(compra);
  setConfirmDialogOpen(true);
};

const confirmarAnulacion = () => {
  if (compraAEliminar) {
    setCompras((prev) =>
      prev.map((compra) =>
        compra.id === compraAEliminar.id ? { ...compra, estado: "Anulado" } : compra
      )
    );
    setMensajeAlerta("Compra anulada correctamente.");
    setTimeout(() => setMensajeAlerta(""), 3000);
  }
  setConfirmDialogOpen(false);
  setCompraAEliminar(null);
};


    return (
      <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="p-4 flex items-center justify-between flex-wrap gap-4">
  <Button
    variant="contained"
    color="primary"
    startIcon={<AddIcon />}
    onClick={() => setModalAgregarOpen(true)}
    sx={{ textTransform: 'none' }}
  >
    Agregar Compra
  </Button>

  <input
    type="text"
    placeholder="Buscar"
    className="border border-gray-400 bg-white rounded px-4 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white dark:border-gray-600" // Suponiendo que tenés un filtro
  />
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
                <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                  Código
                </TableCell>
                <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                  Fecha
                </TableCell>
                <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                  Cliente
                </TableCell>
                <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                  Total
                </TableCell>
                <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                  Estado
                </TableCell>
                <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                  Acciones
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
              {compras.map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-white/90">
                    {compra.codigo}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-gray-100">
                    {compra.fecha}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-gray-100">
                    {compra.nombre}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-gray-100">
                    ${compra.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-gray-100">
                    {compra.estado}
                  </TableCell>
                  <TableCell className="px-5 py-4 space-x-2">
                  <Tooltip title="Ver Detalle">
                        <IconButton
                        color="secondary"
                        onClick={() => abrirDetalle(compra)}>
                          <VisibilityIcon/>
                        </IconButton>
                   </Tooltip>
                    <Tooltip title="Descargar PDF">
                      <IconButton
                      color="primary"
                      onClick={() => generarPDF(compra)}
                      >
                        <PictureAsPdfIcon />
                      </IconButton>
                    </Tooltip>
                      
                   <Tooltip title="Anular Compra">
                    <IconButton
                    color="error"
                    onClick={() => solicitarConfirmacionEliminacion(compra)}
                    disabled={compra.estado === "Anulado"}>
                      <CancellIcon />
                    </IconButton>
                   </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

<Modal isOpen={modalDetalleOpen} onClose={cerrarDetalle}>
  <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">
    Detalle del Cliente
  </h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[
      ["Código", detalleActual?.codigo],
      ["Fecha", detalleActual?.fecha],
      ["Cliente", detalleActual?.nombre],
      ["Total", detalleActual?.total],
      ["Estado", detalleActual?.estado],
      ["Proveedor", nombreProveedor],
    ].map(([label, value], idx) => (
      <div
        key={idx}
        className="p-4 border border-gray-300 bg-gray-50 rounded-lg shadow-sm text-black dark:bg-gray-800 dark:border-gray-700 dark:text-white"
      >
        <p className="text-sm font-medium mb-1">{label}</p>
        <p className="font-semibold">{value || "—"}</p>
      </div>
    ))}
  </div>

  <div className="mt-8 flex justify-end">
    <button
      onClick={cerrarDetalle}
      className="px-5 py-2 bg-brand-500 text-white rounded hover:bg-brand-600 transition-all dark:bg-brand-600 dark:hover:bg-brand-500"
    >
      Cerrar
    </button>
  </div>
</Modal>
<Modal isOpen={modalAgregarOpen} onClose={() => setModalAgregarOpen(false)}>
  <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Agregar Compra</h2>

  {/* Contenido con scroll si es necesario */}
  <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[60vh] pr-2">

    {/* Datos de la compra */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label>Fecha:</label>
        <input
          type="date"
          className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
          value={nuevaCompra.fecha}
          onChange={(e) =>
            setNuevaCompra({ ...nuevaCompra, fecha: e.target.value })
          }
        />
      </div>
      <div>
        <label>Tipo de Pago:</label>
        <select
          className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
          value={nuevaCompra.tipoPago}
          onChange={(e) =>
            setNuevaCompra({ ...nuevaCompra, tipoPago: e.target.value })
          }
        >
          <option>Efectivo</option>
          <option>Tarjeta</option>
          <option>Transferencia</option>
        </select>
      </div>
      <div className="col-span-2">
        <label>Cliente:</label>
        <input
          type="text"
          className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
          value={nuevaCompra.cliente}
          onChange={(e) =>
            setNuevaCompra({ ...nuevaCompra, cliente: e.target.value })
          }
        />
      </div>
      <div className="col-span-2">
        <label>Proveedor:</label>
        <input
          type="text"
          className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
          value={nombreProveedor}
          disabled
        />
      </div>
    </div>

    {/* Productos */}
    <div>
      <h3 className="font-semibold mb-2">Productos:</h3>
      {nuevaCompra.productos.map((prod, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <select
            className="w-full border border-gray-400 p-1 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
            value={prod.nombre}
            onChange={(e) => {
              const seleccionado = productosDisponibles.find(p => p.nombre === e.target.value);
              setNuevaCompra((prev) => {
                const productos = [...prev.productos];
                productos[i].nombre = seleccionado?.nombre || "";
                productos[i].precio = seleccionado?.precio || 0;
                return { ...prev, productos };
              });
            }}
          >
            <option value="">Seleccionar producto</option>
            {productosDisponibles.map((p, idx) => (
              <option key={idx} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
          <input
            type="number"
            className="w-full border border-gray-400 p-1 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
            placeholder="Precio"
            value={prod.precio}
            disabled
          />
          <input
            type="number"
            className="w-full border border-gray-400 p-1 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
            placeholder="Cantidad"
            value={prod.cantidad}
            onChange={(e) =>
              setNuevaCompra((prev) => {
                const productos = [...prev.productos];
                productos[i].cantidad = parseInt(e.target.value) || 0;
                return { ...prev, productos };
              })
            }
          />
          <button
            onClick={() => eliminarProducto(i)}
            className="text-red-500 font-bold"
          >
            X
          </button>
        </div>
      ))}
      <button
        onClick={agregarProducto}
        className="px-2 py-1 bg-blue-500 text-white rounded"
      >
        Agregar Producto
      </button>
    </div>

    {/* Totales */}
    <div className="mt-4">
      <p>Subtotal: ${subtotal.toFixed(2)}</p>
      <p>IVA (19%): ${iva.toFixed(2)}</p>
      <p className="font-bold">Total: ${total.toFixed(2)}</p>
    </div>
  </div>

  {/* Botones fijos afuera del scroll */}
  <div className="mt-6 flex justify-end gap-2 border-t pt-4">
    <button
      onClick={() => setModalAgregarOpen(false)}
      className="px-4 py-2 bg-gray-500 text-white rounded dark:bg-gray-500 dark:text-white"
    >
      Cancelar
    </button>
    <button
      onClick={guardarCompra}
      className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
    >
      Guardar Compra
    </button>
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
      Confirmar anulación
    </div>
  </DialogTitle>
  <DialogContent className="bg-gray-100">
    <DialogContentText className="text-lg text-gray-700">
      ¿Estás seguro de que deseas anular la compra{' '}
      <strong className="font-semibold text-red-600">{compraAEliminar?.codigo}</strong>? Esta acción no se puede deshacer.
    </DialogContentText>
  </DialogContent>
  <DialogActions className="bg-gray-50 p-4">
    <Tooltip title="Cancelar">
      <IconButton
        onClick={() => setConfirmDialogOpen(false)}
        color="default"
        className="hover:bg-gray-200 rounded-full"
      >
        <CancellIcon />
      </IconButton>
    </Tooltip>
    <Tooltip title="Eliminar">
      <Button
        onClick={confirmarAnulacion}
        color="error"
        variant="contained"
        startIcon={<DeleteIcon />}
        className="capitalize font-medium hover:bg-red-600"
      >
        Anular
      </Button>
    </Tooltip>
  </DialogActions>
</Dialog>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }