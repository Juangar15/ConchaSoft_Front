import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "../ui/button/Button";
import Modal from "../ui/modal/Modal";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext"; // Asegúrate de que la ruta sea correcta

interface Permiso {
  id: number;
  nombre: string;
  descripcion: string;
}

export default function PermisosTable() {
  const { idRol } = useParams<{ idRol: string }>();
  const navigate = useNavigate();
  // === CAMBIO AQUÍ: Ahora desestructuramos 'token' directamente de useAuth() ===
  const { token } = useAuth();

  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [permisosAsignados, setPermisosAsignados] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevoPermiso, setNuevoPermiso] = useState({ nombre: "", descripcion: "" });
  const [modoEdicion, setModoEdicion] = useState(false);
  const [permisoEditandoId, setPermisoEditandoId] = useState<number | null>(null);
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = 'https://conchasoft-api.onrender.com/api';

  const fetchPermisosData = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // === CAMBIO AQUÍ: Usamos 'token' directamente ===
      if (!token) {
        throw new Error("No hay token de autenticación disponible.");
      }
      if (!idRol) {
        throw new Error("ID de Rol no proporcionado en la URL.");
      }

      // 1. Obtener TODOS los permisos disponibles en el sistema
      const resPermisos = await fetch(`${API_BASE_URL}/permisos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resPermisos.ok) {
        throw new Error(`Error al cargar todos los permisos: ${resPermisos.statusText}`);
      }
      const dataPermisos: { id: number; nombre: string }[] = await resPermisos.json();
      setPermisos(dataPermisos.map(p => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: `Permiso para: ${p.nombre.replace(/_/g, ' ')}`
      })));

      // 2. Obtener los permisos ASIGNADOS al rol actual
      const resPermisosAsignados = await fetch(`${API_BASE_URL}/roles/${idRol}/permisos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resPermisosAsignados.ok) {
        throw new Error(`Error al cargar permisos asignados al rol: ${resPermisosAsignados.statusText}`);
      }
      const dataPermisosAsignados: number[] = await resPermisosAsignados.json();
      setPermisosAsignados(dataPermisosAsignados);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error desconocido al cargar los permisos.");
      }
    } finally {
      setCargando(false);
    }
  }, [idRol, token]); // === CAMBIO AQUÍ: 'token' en lugar de 'getToken' ===

  useEffect(() => {
    fetchPermisosData();
  }, [fetchPermisosData]);

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

  const guardarPermiso = async () => {
    if (!nuevoPermiso.nombre.trim()) {
      setMensajeAlerta("El nombre del permiso es obligatorio.");
      setTimeout(() => setMensajeAlerta(""), 3000);
      return;
    }

    try {
      // === CAMBIO AQUÍ: Usamos 'token' directamente ===
      if (!token) throw new Error("No hay token de autenticación.");

      let response;
      if (modoEdicion && permisoEditandoId !== null) {
        response = await fetch(`${API_BASE_URL}/permisos/${permisoEditandoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ nombre: nuevoPermiso.nombre }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al actualizar permiso.");
        }
        setMensajeAlerta("Permiso actualizado correctamente.");
      } else {
        response = await fetch(`${API_BASE_URL}/permisos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ nombre: nuevoPermiso.nombre }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al crear permiso.");
        }
        const newPermisoData = await response.json();
        setPermisos(prev => [...prev, {
            id: newPermisoData.id,
            nombre: nuevoPermiso.nombre,
            descripcion: nuevoPermiso.descripcion
        }]);
        setMensajeAlerta("Permiso creado correctamente.");
      }
      await fetchPermisosData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeAlerta(err.message);
      } else {
        setMensajeAlerta("Ocurrió un error desconocido al guardar el permiso.");
      }
    } finally {
      setTimeout(() => setMensajeAlerta(""), 3000);
      cerrarModal();
    }
  };

  const guardarAsignacionPermisos = async () => {
    try {
      // === CAMBIO AQUÍ: Usamos 'token' directamente ===
      if (!token) throw new Error("No hay token de autenticación.");
      if (!idRol) throw new Error("ID de Rol no proporcionado para guardar asignación.");

      const response = await fetch(`${API_BASE_URL}/roles/${idRol}/permisos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ permisoIds: permisosAsignados }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al guardar la asignación de permisos: ${response.statusText}`);
      }

      setMensajeAlerta("Asignación de permisos guardada correctamente.");
      setTimeout(() => {
        setMensajeAlerta("");
        navigate("/roles");
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeAlerta(err.message);
      } else {
        setMensajeAlerta("Ocurrió un error desconocido al guardar la asignación.");
      }
      setTimeout(() => setMensajeAlerta(""), 3000);
    }
  };

  const volverARoles = () => {
    navigate("/roles");
  };

  if (cargando) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600 dark:text-gray-300">Cargando permisos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600 dark:text-red-400">
        <p>Error: {error}</p>
        <Button onClick={volverARoles} className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
          Volver a Roles
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-white">Asignar Permisos al Rol {idRol}</h2>
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
                ID
              </TableCell>
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
            {permisos.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center px-5 py-4 text-gray-500 dark:text-gray-400">
                        No hay permisos disponibles.
                    </TableCell>
                </TableRow>
            ) : (
              permisos.map(permiso => (
                <TableRow key={permiso.id}>
                  <TableCell className="px-5 py-4 text-gray-800 text-theme-sm dark:text-white/90">
                    {permiso.id}
                  </TableCell>
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
                      className="w-5 h-5 text-brand-500 accent-blue-500"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
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

      <Modal isOpen={isModalOpen} handleClose={cerrarModal}>
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