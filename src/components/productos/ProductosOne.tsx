import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancellIcon from '@mui/icons-material/Cancel'
import AddIcon from '@mui/icons-material/Add';
import Tooltip from '@mui/material/Tooltip';
import Modal from "../ui/modal/Modal";
import { useState } from "react";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  valor: number;
  estado: boolean;
  marca: string;
  color: string;
  tallas: Record<string, number>;
}

export default function ProductosTable() {
  const [productos, setProductos] = useState<Producto[]>([
    {
      id: 1,
      codigo: "P001",
      nombre: "Zapato Casual",
      valor: 120.99,
      estado: true,
      marca: "Nike",
      color: "Rojo",
      tallas: {},
    },
    {
      id: 2,
      codigo: "P002",
      nombre: "Tenis Deportivo",
      valor: 89.5,
      estado: false,
      marca: "Adidas",
      color: "Azul",
      tallas: {},
    },
  ]);

  const [showAgregarModal, setShowAgregarModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
      const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);

  // Formulario de producto nuevo
  const [nuevo, setNuevo] = useState({
    nombre: "",
    valor: "",
    marca: "",
    color: "",
    tallas: {} as Record<string, number>
  });

  const tallasDisponibles = ["36", "37", "38", "39", "40", "41", "42"];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNuevo((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setShowAgregarModal(false);
    setShowEditarModal(false);
  };

    const agregarProducto = () => {
      const cantidadTotal = Object.values(nuevo.tallas).reduce((sum, val) => sum + val, 0);
    
      if (!nuevo.nombre || !nuevo.valor || cantidadTotal === 0) {
        alert("Por favor completa todos los campos requeridos y asigna cantidad a al menos una talla.");
        return;
      }
    
      const nuevoProducto: Producto = {
        id: Date.now(),
        codigo: `P${(productos.length + 1).toString().padStart(3, "0")}`,
        nombre: nuevo.nombre,
        valor: parseFloat(nuevo.valor),
        estado: true,
        marca: nuevo.marca,
        color: nuevo.color,
        tallas: nuevo.tallas,
      };
    
      setProductos((prev) => [...prev, nuevoProducto]);

      setMensajeAlerta("Producto creado correctamente.");
      setTimeout(() => setMensajeAlerta(""),3000);
    
      // Limpiar formulario
      setNuevo({
        nombre: "",
        valor: "",
        marca: "",
        color: "",
        tallas: {},
      });
    
      setShowAgregarModal(false);
    };

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [detalleActual, setDetalleActual] = useState<Producto | null>(null);

  const toggleEstado = (id: number) => {
    setProductos((prev) =>
      prev.map((producto) =>
        producto.id === id ? { ...producto, estado: !producto.estado } : producto
      )
    );
  };

  const verDetalle = (producto: Producto) => {
    setDetalleActual(producto);
    setModalDetalleOpen(true);
  };

  const cerrarDetalle = () => {
    setModalDetalleOpen(false);
    setDetalleActual(null);
  };

  const abrirModalEditar = (producto: Producto) => {
    setNuevo({
      nombre: producto.nombre,
      valor: producto.valor.toString(),
      marca: producto.marca,
      color: producto.color,
      tallas: { ...producto.tallas }, // Copiamos las cantidades por talla
    });
    setDetalleActual(producto); // Guardamos producto original para mantener su ID y código
    setShowEditarModal(true);
  };

  const editarProducto = () => {
    const cantidadTotal = Object.values(nuevo.tallas).reduce((sum, val) => sum + val, 0);
  
    if (!nuevo.nombre || !nuevo.valor || cantidadTotal === 0 || !detalleActual) {
      alert("Por favor completa todos los campos requeridos y asigna cantidad a al menos una talla.");
      return;
    }
  
    const productoEditado: Producto = {
      ...detalleActual, // mantenemos id y código originales
      nombre: nuevo.nombre,
      valor: parseFloat(nuevo.valor),
      estado: detalleActual.estado, // mantenemos el estado actual
      marca: nuevo.marca,
      color: nuevo.color,
      tallas: nuevo.tallas,
    };
  
    setProductos((prev) =>
      prev.map((producto) =>
        producto.id === detalleActual.id ? productoEditado : producto
      )
    );

    setMensajeAlerta("Producto actualizado correctamente.");
    setTimeout(() => setMensajeAlerta(""),3000);
  
    setNuevo({
      nombre: "",
      valor: "",
      marca: "",
      color: "",
      tallas: {},
    });
  
    setDetalleActual(null);
    setShowEditarModal(false);
  };

  const solicitarConfirmacionEliminacion = (producto: Producto) => {
    setProductoAEliminar(producto);
    setConfirmDialogOpen(true);
  };
  
  const confirmarEliminacion = () => {
    if (productoAEliminar) {
      setProductos((prev) => prev.filter((p) => p.id !== productoAEliminar.id));
      setMensajeAlerta("Producto eliminado correctamente.");
      setTimeout(() => setMensajeAlerta(""), 3000);
    }
    setConfirmDialogOpen(false);
    setProductoAEliminar(null);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4 flex items-center justify-between flex-wrap gap-4">
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setShowAgregarModal(true)}
          sx={{ textTransform: 'none' }}
        >
          Agregar Producto
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
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">Código</TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">Nombre</TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">Valor</TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">Cantidad</TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">Estado</TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">Acciones</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
            {productos.map((producto) => (
              <TableRow key={producto.id}>
                <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">{producto.codigo}</TableCell>
                <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">{producto.nombre}</TableCell>
                <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">${producto.valor.toFixed(2)}</TableCell>
                <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
  {Object.values(producto.tallas).reduce((sum, val) => sum + val, 0)}
</TableCell>
                <TableCell className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleEstado(producto.id)}
                      className={`w-10 h-5 rounded-full transition-all duration-300 ${
                        producto.estado ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"
                      } relative`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                          producto.estado ? "translate-x-5 left-0" : "translate-x-0 left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-4 space-x-2">
                  <IconButton
                    color="primary" onClick={() => abrirModalEditar(producto)}>
                    <EditIcon />
                  </IconButton>
                  <Tooltip title="Ver Detalle">
                    <IconButton
                      color="secondary"
                      onClick={() => verDetalle(producto)}>
                      <VisibilityIcon/>
                    </IconButton>
                  </Tooltip>  
                  <Tooltip title="Eliminar">
                    <IconButton
                      color="error" onClick={() => solicitarConfirmacionEliminacion(producto)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Detalle */}
      
      <Modal isOpen={modalDetalleOpen} onClose={cerrarDetalle}>
  <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">
    Detalle del Producto
  </h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[
      ["Nombre", detalleActual?.nombre],
      ["Valor", `$${detalleActual?.valor?.toFixed(2)}`],
      ["Marca", detalleActual?.marca],
      ["Color", detalleActual?.color],
      ["Estado", detalleActual?.estado ? "Activo" : "Inactivo"],
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

  {/* Tallas y Cantidades con scroll */}
  <div className="mt-6">
    <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Tallas y Cantidades</h3>
    <div className="max-h-60 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {detalleActual &&
          Object.entries(detalleActual.tallas).map(([talla, cantidad]) => (
            <div
              key={talla}
              className="p-3 border border-gray-300 bg-gray-50 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <p className="text-sm font-medium mb-1">Talla {talla}</p>
              <p className="font-semibold">{cantidad}</p>
            </div>
          ))}
      </div>
    </div>
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


      {/* Modal Agregar y Editar Producto */}
      <Modal isOpen={showAgregarModal || showEditarModal} onClose={handleCloseModal}>
  <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
    {showAgregarModal ? "Agregar Producto" : "Editar Producto"}
  </h2>

  {/* FORMULARIO EN COLUMNA */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Nombre */}
    <div>
      <label className="block text-sm font-medium mb-1">
        Nombre <span className="text-error-500">*</span>
      </label>
      <input
        type="text"
        name="nombre"
        value={nuevo.nombre}
        onChange={handleInputChange}
        className="w-full border border-gray-400 bg-gray-200 px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
      />
    </div>

    {/* Valor */}
    <div>
      <label className="block text-sm font-medium mb-1">
        Valor <span className="text-error-500">*</span>
      </label>
      <input
        type="number"
        name="valor"
        value={nuevo.valor}
        onChange={handleInputChange}
        className="w-full border border-gray-400 bg-gray-200 px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
      />
    </div>

    {/* Marca */}
    <div>
      <label className="block text-sm font-medium mb-1">
        Marca <span className="text-error-500">*</span>
      </label>
      <select
        name="marca"
        value={nuevo.marca}
        onChange={handleInputChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
      >
        <option value="">Seleccione</option>
        <option value="Nike">Nike</option>
        <option value="Adidas">Adidas</option>
        <option value="Puma">Puma</option>
        <option value="Rebook">Rebook</option>
      </select>
    </div>

    {/* Color */}
    <div>
      <label className="block text-sm font-medium mb-1">
        Color <span className="text-error-500">*</span>
      </label>
      <input
        type="text"
        name="color"
        value={nuevo.color}
        onChange={handleInputChange}
        className="w-full border border-gray-400 bg-gray-200 px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
      />
    </div>
  </div>

  {/* TALLAS Y CANTIDADES */}
  <div className="mt-6">
    <label className="block text-sm font-medium mb-1">
      Tallas y Cantidades <span className="text-error-500">*</span>
    </label>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {tallasDisponibles.map((talla) => (
        <div key={talla} className="flex items-center gap-2">
          <span className="w-8">{talla}</span>
          <input
            type="number"
            min="0"
            value={nuevo.tallas[talla] || ""}
            onChange={(e) => {
              const cantidad = parseInt(e.target.value);
              setNuevo((prev) => ({
                ...prev,
                tallas: {
                  ...prev.tallas,
                  [talla]: isNaN(cantidad) ? 0 : cantidad,
                },
              }));
            }}
            className="w-20 border border-gray-400 rounded px-2 py-1 dark:bg-gray-800 dark:text-white"
          />
        </div>
      ))}
    </div>
  </div>

  {/* BOTONES */}
  <div className="flex justify-end gap-2 mt-6">
    <button
      onClick={handleCloseModal}
      className="px-4 py-2 bg-gray-500 rounded dark:bg-gray-500 text-white"
    >
      Cancelar
    </button>
    <button
      onClick={showAgregarModal ? agregarProducto : editarProducto}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      {showAgregarModal ? "Agregar" : "Editar"}
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
      Confirmar eliminación
    </div>
  </DialogTitle>
  <DialogContent className="bg-gray-100">
    <DialogContentText className="text-lg text-gray-700">
      ¿Estás seguro de que deseas eliminar el producto{' '}
      <strong className="font-semibold text-red-600">{productoAEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
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