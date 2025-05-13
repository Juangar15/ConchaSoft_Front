import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton";
import CancellIcon from '@mui/icons-material/Cancel'
import VisibilityIcon from '@mui/icons-material/Visibility'
import AddIcon from '@mui/icons-material/Add'
import Tooltip from '@mui/material/Tooltip'
import Modal from "../ui/modal/Modal";
import { useState } from "react";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import DeleteIcon from '@mui/icons-material/Delete'

interface Devolucion {
  id: number;
  nombre: string;
  fecha: string;
  monto: number;
  estado: string;
}

export default function DevolucionesTable() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([
    { id: 1, nombre: "Juan Pérez", fecha: "2025-04-05", monto: 120.5, estado: "pendiente" },
    { id: 2, nombre: "Ana López", fecha: "2025-04-06", monto: 75.0, estado: "completado" },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevaDevolucion, setNuevaDevolucion] = useState({ nombre: "", monto: "" });
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [devolucionAEliminar, setDevolucionAEliminar] = useState<Devolucion | null>(null);

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [detalleActual, setDetalleActual] = useState<Devolucion | null>(null);

  const abrirModal = () => {
    setNuevaDevolucion({ nombre: "", monto: "" });
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNuevaDevolucion(prev => ({ ...prev, [name]: value }));
  };

  const guardarDevolucion = () => {
    if (!nuevaDevolucion.nombre.trim() || isNaN(Number(nuevaDevolucion.monto))) return;

    const nueva = {
      id: devoluciones.length + 1,
      nombre: nuevaDevolucion.nombre,
      fecha: new Date().toISOString().split("T")[0],
      monto: parseFloat(nuevaDevolucion.monto),
      estado: "pendiente"
    };

    setDevoluciones(prev => [...prev, nueva]);
    setMensajeAlerta("Devolución registrada correctamente.");
    setTimeout(() => setMensajeAlerta(""), 3000);
    cerrarModal();
  };

  const verDetalle = (devolucion: Devolucion) => {
    setDetalleActual(devolucion);
    setModalDetalleOpen(true);
  };

  const cerrarDetalle = () => {
    setModalDetalleOpen(false);
    setDetalleActual(null);
  };

  const solicitarConfirmacionEliminacion = (devolucion: Devolucion) => {
    setDevolucionAEliminar(devolucion);
    setConfirmDialogOpen(true);
  };
  
  const confirmarAnulacion = () => {
    if (devolucionAEliminar) {
      setDevoluciones((prev) =>
        prev.map((devolucion) =>
          devolucion.id === devolucionAEliminar.id ? { ...devolucion, estado: "Anulado" } : devolucion
        )
      );
      setMensajeAlerta("Devolucion anulada correctamente.");
      setTimeout(() => setMensajeAlerta(""), 3000);
    }
    setConfirmDialogOpen(false);
    setDevolucionAEliminar(null);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-400 bg-gray-200 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4 flex items-center justify-between flex-wrap gap-4">
  <Button
    variant="contained"
    color="primary"
    startIcon={<AddIcon />}
    onClick={abrirModal}
    sx={{ textTransform: 'none' }}
  >
    Agregar Devolución
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
              <TableCell isHeader className="text-left text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                Cliente
              </TableCell>
              <TableCell isHeader className="text-left text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                Fecha
              </TableCell>
              <TableCell isHeader className="text-left text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                Monto
              </TableCell>
              <TableCell isHeader className="text-left text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                Estado
              </TableCell>
              <TableCell isHeader className="text-left text-theme-xs text-black dark:text-gray-100 px-5 py-3">
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-400 dark:divide-white/[0.05]">
            {devoluciones.map(devolucion => (
              <TableRow key={devolucion.id}>
                <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-gray-100">
                  {devolucion.nombre}
                </TableCell>
                <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-gray-100">
                  {devolucion.fecha}
                </TableCell>
                <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-gray-100">
                  ${devolucion.monto.toFixed(2)}
                </TableCell>
                <TableCell className="px-5 py-4 text-theme-sm text-gray-900 dark:text-gray-100">
                  {devolucion.estado}
                </TableCell>
                <TableCell className="px-5 py-4 space-x-2">
                <Tooltip title="Ver Detalle">
                        <IconButton
                        color="secondary"
                        onClick={() => verDetalle(devolucion)}>
                          <VisibilityIcon/>
                        </IconButton>
                   </Tooltip>
                   <Tooltip title="Anular Venta">
                    <IconButton
                    color="error"
                    onClick={() => solicitarConfirmacionEliminacion(devolucion)}
                    disabled={devolucion.estado === "Anulado"}>
                      <CancellIcon />
                    </IconButton>
                   </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal Registrar */}
      <Modal isOpen={isModalOpen} onClose={cerrarModal}>
        <h2 className="text-lg font-bold mb-4">Registrar Devolución</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del Cliente
            <span className="text-error-500">*</span>{" "}
            </label>
            <input
              name="nombre"
              type="text"
              value={nuevaDevolucion.nombre}
              onChange={handleChange}
              className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monto
            <span className="text-error-500">*</span>{" "}
            </label>
            <input
              name="monto"
              type="number"
              value={nuevaDevolucion.monto}
              onChange={handleChange}
              className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={cerrarModal}
              className="px-4 py-2 bg-gray-500 text-white rounded dark:bg-gray-500 dark:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={guardarDevolucion}
              className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
            >
              Guardar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Detalle */}
      <Modal isOpen={modalDetalleOpen} onClose={cerrarDetalle}>
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Detalle de Devolución</h2>
        <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
          <p><strong>Cliente:</strong> {detalleActual?.nombre}</p>
          <p><strong>Fecha:</strong> {detalleActual?.fecha}</p>
          <p><strong>Monto:</strong> ${detalleActual?.monto.toFixed(2)}</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={cerrarDetalle}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
          >
            Cerrar
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
      ¿Estás seguro de que deseas anular la devolucion del cliente{' '}
      <strong className="font-semibold text-red-600">{devolucionAEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
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
    </div>
  );
}