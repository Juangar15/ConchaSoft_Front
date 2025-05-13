import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
  } from "../ui/table";
  import Button from "../ui/button/Button";
  import Modal from "../ui/modal/Modal";
  import { useState } from "react";
  import { useParams, useNavigate } from "react-router";
  
  interface Permiso {
    id: number;
    nombre: string;
    descripcion: string;
    estado: boolean;
  }
  
  export default function PermisosTable() {
    const { idRol } = useParams();
    const navigate = useNavigate();
    const [permisos, setPermisos] = useState<Permiso[]>([
      { id: 1, nombre: "crear_venta", descripcion: "Permite crear ventas", estado: true },
      { id: 2, nombre: "ver_clientes", descripcion: "Permite ver clientes", estado: true },
      { id: 3, nombre: "editar_usuario", descripcion: "Permite editar usuarios", estado: true },
    ]);
  
    const [permisosAsignados, setPermisosAsignados] = useState<number[]>([1]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nuevoPermiso, setNuevoPermiso] = useState({ nombre: "", descripcion: "" });
    const [modoEdicion, setModoEdicion] = useState(false);
    const [permisoEditandoId, setPermisoEditandoId] = useState<number | null>(null);
    const [mensajeAlerta, setMensajeAlerta] = useState("");
  
    const toggleAsignacion = (permisoId: number) => {
      setPermisosAsignados(prev =>
        prev.includes(permisoId)
          ? prev.filter(id => id !== permisoId)
          : [...prev, permisoId]
      );
    };

    const cerrarModal = () => {
      setIsModalOpen(false);
      setNuevoPermiso({ nombre: "", descripcion: "" });
      setModoEdicion(false);
      setPermisoEditandoId(null);
    };
  
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setNuevoPermiso(prev => ({ ...prev, [name]: value }));
    };
  
    const guardarPermiso = () => {
      if (!nuevoPermiso.nombre.trim()) return;
  
      if (modoEdicion && permisoEditandoId !== null) {
        setPermisos(prev =>
          prev.map(p =>
            p.id === permisoEditandoId ? { ...p, ...nuevoPermiso } : p
          )
        );
        setMensajeAlerta("Permiso actualizado correctamente.");
      } else {
        const nuevo = {
          id: permisos.length + 1,
          nombre: nuevoPermiso.nombre,
          descripcion: nuevoPermiso.descripcion,
          estado: true,
        };
        setPermisos(prev => [...prev, nuevo]);
        setMensajeAlerta("Permiso creado correctamente.");
      }
  
      setTimeout(() => setMensajeAlerta(""), 3000);
      cerrarModal();
    };
    
    const guardarAsignacionPermisos = () => {
      console.log("Rol:", idRol);
      console.log("Permisos asignados:", permisosAsignados);
      // Aquí puedes hacer la petición a la API si lo deseas
  
      navigate("/roles");
    };
  
    const volverARoles = () => {
      navigate("/roles");
    };
  
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-white">Asignar Permisos al Rol</h2>
        </div>
  
        {mensajeAlerta && (
          <div className="mx-4 mb-4 text-sm text-green-700 bg-green-100 border border-green-300 rounded p-2 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600">
            {mensajeAlerta}
          </div>
        )}
  
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="text-theme-xs px-5 py-3 text-start text-black dark:text-gray-400">
                  Nombre
                </TableCell>
                <TableCell isHeader className="text-theme-xs px-5 py-3 text-start text-black dark:text-gray-400">
                  Descripción
                </TableCell>
                <TableCell isHeader className="text-theme-xs px-5 py-3 text-start text-black dark:text-gray-400">
                  Asignado
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {permisos.map(permiso => (
                <TableRow key={permiso.id}>
                  <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                    {permiso.nombre}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                    {permiso.descripcion}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={permisosAsignados.includes(permiso.id)}
                      onChange={() => toggleAsignacion(permiso.id)}
                      className="w-5 h-5 text-brand-500"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
  
        <div className="p-4 flex flex-col md:flex-row justify-between gap-4">
          <Button
            onClick={volverARoles}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Volver a Roles
          </Button>
          <Button
            onClick={guardarAsignacionPermisos}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Guardar Asignación
          </Button>
        </div>
  
        <Modal isOpen={isModalOpen} onClose={cerrarModal}>
          <h2 className="text-lg font-bold mb-4">
            {modoEdicion ? "Editar permiso" : "Agregar nuevo permiso"}
          </h2>
  
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                name="nombre"
                type="text"
                value={nuevoPermiso.nombre}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                name="descripcion"
                value={nuevoPermiso.descripcion}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 bg-gray-200 rounded dark:bg-gray-700 dark:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPermiso}
                className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
              >
                {modoEdicion ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }