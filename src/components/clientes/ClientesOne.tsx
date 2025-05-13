import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton";
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CancellIcon from '@mui/icons-material/Cancel'
import AddIcon from '@mui/icons-material/Add'
import Tooltip from '@mui/material/Tooltip'
import Modal from "../ui/modal/Modal";
import { useState } from "react";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface Cliente {
  id: number;
  nombre: string;
  correo: string;
  direccion: string;
  telefono: string;
  celular?: string;  // nuevo campo
  ciudad?: string;   // nuevo campo
  departamento?: string;  // nuevo campo
  fechaNacimiento?: string; 
  tipoDocumento?: string;
  documento?: string; // nuevo campo
  rh?: string;  // nuevo campo
  genero?: string;  // nuevo campo
  activo: boolean;
}

export default function ClientesTable() {
  const [clientes, setClientes] = useState<Cliente[]>([
    {
      id: 1,
      nombre: "Ana López",
      correo: "ana@example.com",
      direccion: "Calle Falsa 123",
      telefono: "123456789",
      celular: "3001234567",
      ciudad: "Bogotá",
      departamento: "Cundinamarca",
      fechaNacimiento: "1990-05-12",
      rh: "O+",
      genero: "Femenino",
      tipoDocumento: "CC",
      documento: "1020304050",
      activo: true,
    },
    {
      id: 2,
      nombre: "Carlos Pérez",
      correo: "carlos@example.com",
      direccion: "Av. Siempre Viva 742",
      telefono: "987654321",
      celular: "3109876543",
      ciudad: "Medellín",
      departamento: "Antioquia",
      fechaNacimiento: "1985-08-25",
      rh: "A-",
      genero: "Masculino",
      tipoDocumento: "TI",
      documento: "9876543210",
      activo: false,
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    correo: "",
    direccion: "",
    telefono: "",
    celular: "",  // nuevo campo
    ciudad: "",   // nuevo campo
    departamento: "",  // nuevo campo
    fechaNacimiento: "",
    tipoDocumento: "",
    documento: "",  // nuevo campo
    rh: "",  // nuevo campo
    genero: "",
  });
  const [modoEdicion, setModoEdicion] = useState(false);
  const [clienteEditandoId, setClienteEditandoId] = useState<number | null>(null);
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);


  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
      const [detalleActual, setDetalleActual] = useState<Cliente | null>(null);

  const toggleEstado = (id: number) => {
    setClientes((prev) =>
      prev.map((cliente) =>
        cliente.id === id ? { ...cliente, activo: !cliente.activo } : cliente
      )
    );
  };

  const abrirModal = () => {
    setNuevoCliente({
      nombre: "",
      correo: "",
      direccion: "",
      telefono: "",
      celular: "",       // nuevo campo
      ciudad: "",        // nuevo campo
      departamento: "",  // nuevo campo
      fechaNacimiento: "",
      tipoDocumento: "",
      documento: "", // nuevo campo
      rh: "",            // nuevo campo
      genero: "", });
    setModoEdicion(false);
    setClienteEditandoId(null);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (cliente: Cliente) => {
    setNuevoCliente({
      nombre: cliente.nombre,
      correo: cliente.correo,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
      celular: cliente.celular || "",         // nuevo campo
      ciudad: cliente.ciudad || "",          // nuevo campo
      departamento: cliente.departamento || "", // nuevo campo
      fechaNacimiento: cliente.fechaNacimiento || "", // nuevo campo
      rh: cliente.rh || "",                 // nuevo campo
      genero: cliente.genero || "",         // nuevo campo
      tipoDocumento: cliente.tipoDocumento || "",  // nuevo campo
      documento: cliente.documento || "",
    });
    setModoEdicion(true);
    setClienteEditandoId(cliente.id);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setNuevoCliente({
      nombre: "",
      correo: "",
      direccion: "",
      telefono: "",
      celular: "",         // nuevo campo
      ciudad: "",          // nuevo campo
      departamento: "",    // nuevo campo
      fechaNacimiento: "", // nuevo campo
      rh: "",              // nuevo campo
      genero: "",          // nuevo campo
      tipoDocumento: "",   // nuevo campo
      documento: "",  
    });
    setModoEdicion(false);
    setClienteEditandoId(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNuevoCliente((prev) => ({ ...prev, [name]: value }));
  };

  const verDetalle = (cliente: Cliente) => {
    setDetalleActual(cliente);
    setModalDetalleOpen(true);
  };

  const cerrarDetalle = () => {
    setModalDetalleOpen(false);
    setDetalleActual(null);
  };

  const guardarCliente = () => {
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.correo.trim()) return;

    if (modoEdicion && clienteEditandoId !== null) {
      setClientes((prev) =>
        prev.map((cliente) =>
          cliente.id === clienteEditandoId ? { ...cliente, ...nuevoCliente } : cliente
        )
      );
      setMensajeAlerta("Cliente actualizado correctamente.");
    } else {
      const nuevo = {
        id: clientes.length + 1,
        ...nuevoCliente,
        activo: true,
      };
      setClientes((prev) => [...prev, nuevo]);
      setMensajeAlerta("Cliente creado correctamente.");
    }

    setTimeout(() => setMensajeAlerta(""), 3000);
    cerrarModal();
  };

  const solicitarConfirmacionEliminacion = (cliente: Cliente) => {
    setClienteAEliminar(cliente);
    setConfirmDialogOpen(true);
  };
  
  const confirmarEliminacion = () => {
    if (clienteAEliminar) {
      setClientes((prev) =>
        prev.filter((cliente) => cliente.id !== clienteAEliminar.id)
      );
      setMensajeAlerta("Cliente eliminado correctamente.");
      setTimeout(() => setMensajeAlerta(""), 3000);
    }
    setConfirmDialogOpen(false);
    setClienteAEliminar(null);
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
    Agregar Cliente
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
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Nombre
              </TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Correo
              </TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Dirección
              </TableCell>
              <TableCell isHeader className="text-theme-xs text-black dark:text-gray-100 px-5 py-3 text-start">
                Teléfono
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
            {clientes.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-white/90">
                  {cliente.nombre}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                  {cliente.correo}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                  {cliente.direccion}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                  {cliente.telefono}
                </TableCell>
                <TableCell className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleEstado(cliente.id)}
                      className={`w-10 h-5 rounded-full transition-all duration-300 ${
                        cliente.activo
                          ? "bg-green-500"
                          : "bg-gray-400 dark:bg-gray-600"
                      } relative`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                          cliente.activo
                            ? "translate-x-5 left-0"
                            : "translate-x-0 left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </TableCell>
                <TableCell className="px-5 py-4 space-x-2">
                <Tooltip title="Ver Detalle">
                        <IconButton
                        color="secondary"
                        onClick={() => verDetalle(cliente)}>
                          <VisibilityIcon/>
                        </IconButton>
                   </Tooltip>
                   <Tooltip title="Editar">
                        <IconButton
                        color="primary" onClick={() => abrirModalEditar(cliente)}>
                          <EditIcon />

                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                        color="error" onClick={() => solicitarConfirmacionEliminacion(cliente)}>
                          <DeleteIcon />

                        </IconButton>
                      </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={isModalOpen} onClose={cerrarModal}>
  <h2 className="text-lg font-bold mb-4">
    {modoEdicion ? "Editar cliente" : "Agregar nuevo cliente"}
  </h2>

  {mensajeAlerta && (
    <div className="mb-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded p-2 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600">
      {mensajeAlerta}
    </div>
  )}

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Nombre *</label>
      <input name="nombre" type="text" value={nuevoCliente.nombre} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Correo *</label>
      <input name="correo" type="email" value={nuevoCliente.correo} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Tipo de documento *</label>
      <select name="tipoDocumento" value={nuevoCliente.tipoDocumento} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white">
        <option value="">Seleccione</option>
        <option value="CC">Cédula de Ciudadanía</option>
        <option value="CE">Cédula de Extranjería</option>
        <option value="TI">Tarjeta de Identidad</option>
        <option value="PA">Pasaporte</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Documento *</label>
      <input name="documento" type="text" value={nuevoCliente.documento} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Dirección *</label>
      <input name="direccion" type="text" value={nuevoCliente.direccion} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Teléfono *</label>
      <input name="telefono" type="text" value={nuevoCliente.telefono} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Celular</label>
      <input name="celular" type="text" value={nuevoCliente.celular} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Ciudad</label>
      <input name="ciudad" type="text" value={nuevoCliente.ciudad} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Departamento</label>
      <input name="departamento" type="text" value={nuevoCliente.departamento} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Fecha de nacimiento</label>
      <input name="fechaNacimiento" type="date" value={nuevoCliente.fechaNacimiento} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 h-[42px] leading-[1.25rem] bg-gray-200 rounded text-sm appearance-none dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">RH</label>
      <input name="rh" type="text" value={nuevoCliente.rh} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white" />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1 h-[2.5rem]">Género</label>
      <select name="genero" value={nuevoCliente.genero} onChange={handleChange}
        className="w-full border border-gray-400 px-3 py-2 bg-gray-200 rounded dark:bg-gray-800 dark:text-white">
        <option value="">Seleccione</option>
        <option value="masculino">Masculino</option>
        <option value="femenino">Femenino</option>
        <option value="otro">Otro</option>
      </select>
    </div>
  </div>

  <div className="flex justify-end gap-2 mt-6">
    <button onClick={cerrarModal}
      className="px-4 py-2 bg-gray-500 text-white rounded dark:bg-gray-500 dark:text-white">
      Cancelar
    </button>
    <button onClick={guardarCliente}
      className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600">
      {modoEdicion ? "Actualizar" : "Guardar"}
    </button>
  </div>
</Modal>
      
<Modal isOpen={modalDetalleOpen} onClose={cerrarDetalle}>
  <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">
    Detalle del Cliente
  </h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[
      ["Nombre", detalleActual?.nombre],
      ["Correo", detalleActual?.correo],
      ["Tipo de Documento", detalleActual?.tipoDocumento],
      ["Documento", detalleActual?.documento],
      ["Dirección", detalleActual?.direccion],
      ["Teléfono", detalleActual?.telefono],
      ["Celular", detalleActual?.celular],
      ["Ciudad", detalleActual?.ciudad],
      ["Departamento", detalleActual?.departamento],
      ["Fecha de Nacimiento", detalleActual?.fechaNacimiento],
      ["RH", detalleActual?.rh],
      ["Género", detalleActual?.genero],
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
      ¿Estás seguro de que deseas eliminar al cliente{' '}
      <strong className="font-semibold text-red-600">{clienteAEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
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