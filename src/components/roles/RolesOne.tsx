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
import SecurityIcon from '@mui/icons-material/Security'
import AddIcon from '@mui/icons-material/Add'
import CancellIcon from '@mui/icons-material/Cancel'
import Tooltip from '@mui/material/Tooltip'
import Modal from "../ui/modal/Modal";
import { useState } from "react";
import { useNavigate } from "react-router";
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
}

export default function RolesTable() {
  const [roles, setRoles] = useState<Rol[]>([
    {
      id: 1,
      nombre: "Administrador",
      descripcion: "Acceso completo al sistema",
      estado: true,
    },
    {
      id: 2,
      nombre: "Vendedor",
      descripcion: "Accede a ventas y clientes",
      estado: false,
    },
  ]);

  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoRol, setNuevoRol] = useState({ nombre: "", descripcion: "" });
  const [modoEdicion, setModoEdicion] = useState(false);
  const [rolEditandoId, setRolEditandoId] = useState<number | null>(null);
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rolAEliminar, setRolAEliminar] = useState<Rol | null>(null);

  const toggleEstado = (id: number) => {
    setRoles((prev) =>
      prev.map((rol) =>
        rol.id === id ? { ...rol, estado: !rol.estado } : rol
      )
    );
  };

  const abrirModal = () => {
    setNuevoRol({ nombre: "", descripcion: "" });
    setModoEdicion(false);
    setRolEditandoId(null);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (rol: Rol) => {
    setNuevoRol({ nombre: rol.nombre, descripcion: rol.descripcion });
    setModoEdicion(true);
    setRolEditandoId(rol.id);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setNuevoRol({ nombre: "", descripcion: "" });
    setModoEdicion(false);
    setRolEditandoId(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNuevoRol((prev) => ({ ...prev, [name]: value }));
  };

  const guardarRol = () => {
    if (!nuevoRol.nombre.trim()) return;

    if (modoEdicion && rolEditandoId !== null) {
      setRoles((prev) =>
        prev.map((rol) =>
          rol.id === rolEditandoId ? { ...rol, ...nuevoRol } : rol
        )
      );
      setMensajeAlerta("Rol actualizado correctamente.");
    } else {
      const nuevo = {
        id: roles.length + 1,
        nombre: nuevoRol.nombre,
        descripcion: nuevoRol.descripcion,
        estado: true,
      };
      setRoles((prev) => [...prev, nuevo]);
      setMensajeAlerta("Rol creado correctamente.");
    }

    setTimeout(() => setMensajeAlerta(""), 3000);
    cerrarModal();
  };

  const solicitarConfirmacionEliminacion = (rol: Rol) => {
    setRolAEliminar(rol);
    setConfirmDialogOpen(true);
  };
  
  const confirmarEliminacion = () => {
    if (rolAEliminar) {
      setRoles((prev) =>
        prev.filter((rol) => rol.id !== rolAEliminar.id)
      );
      setMensajeAlerta("Rol eliminado correctamente.");
      setTimeout(() => setMensajeAlerta(""), 3000);
    }
    setConfirmDialogOpen(false);
    setRolAEliminar(null);
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
    Agregar Rol
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
                Descripción
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
            {roles.map((rol) => (
              <TableRow key={rol.id}>
                <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                  {rol.nombre}
                </TableCell>
                <TableCell className="px-5 py-4 text-gray-900 text-theme-sm dark:text-gray-100">
                  {rol.descripcion}
                </TableCell>
                <TableCell className="px-5 py-4">
                <div className="flex items-center gap-2">
                    <button
                      onClick={() => rol.nombre !== "Administrador" && toggleEstado(rol.id)}
                      disabled={rol.nombre === "Administrador"}
                      className={`w-10 h-5 rounded-full transition-all duration-300 relative ${
                        rol.estado || rol.nombre === "Administrador"
                          ? "bg-green-500"
                          : "bg-gray-400 dark:bg-gray-600"
                      } ${rol.nombre === "Administrador" ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                          rol.estado || rol.nombre === "Administrador"
                            ? "translate-x-5 left-0"
                            : "translate-x-0 left-0.5"
                        }`}
                      />
                    </button>
                </div>
                </TableCell>
                <TableCell className="px-5 py-4 space-x-2">
                  {rol.nombre !== "Administrador" && (
                    <>
                      <Tooltip title="Editar">
                        <IconButton
                        color="primary" onClick={() => abrirModalEditar(rol)}>
                          <EditIcon />

                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                        color="error" onClick={() => solicitarConfirmacionEliminacion(rol)}>
                          <DeleteIcon />

                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title="Permisos">
                        <IconButton
                        color="secondary" onClick={() => navigate("/permisos")}>
                          <SecurityIcon />

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
          {modoEdicion ? "Editar rol" : "Agregar nuevo rol"}
        </h2>

        {mensajeAlerta && (
          <div className="mb-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded p-2 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600">
            {mensajeAlerta}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre <span className="text-error-500">*</span>
            </label>
            <input
              name="nombre"
              type="text"
              value={nuevoRol.nombre}
              onChange={handleChange}
              className="w-full border border-gray-400 bg-gray-200 px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Descripción <span className="text-error-500">*</span>
            </label>
            <textarea
              name="descripcion"
              value={nuevoRol.descripcion}
              onChange={handleChange}
              className="w-full border border-gray-400 bg-gray-200 px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
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
              onClick={guardarRol}
              className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
            >
              {modoEdicion ? "Actualizar" : "Guardar"}
            </button>
          </div>
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
      ¿Estás seguro de que deseas eliminar el rol{' '}
      <strong className="font-semibold text-red-600">{rolAEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
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