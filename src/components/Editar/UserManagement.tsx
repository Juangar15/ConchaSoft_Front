import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/authContext';

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
  Switch,
  FormControlLabel,
  Paper, // Para un contenedor más estético
  Box, // Para un layout flexible
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { SelectChangeEvent } from '@mui/material/Select';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon, // Icono para regresar
} from '@mui/icons-material';

// --- Importaciones de UI Personalizada ---
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table"; // Asegúrate que la ruta sea correcta

// --- CONFIGURACIÓN DE LA URL BASE DE TU API ---
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api';

// --- INTERFACES ---
interface Usuario {
  login: string;
  correo: string;
  id_rol: number;
  nombre_rol?: string;
  activo: boolean;
}

interface Rol {
  id: number;
  rol: string;
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { token } = useAuth();

  // --- ESTADOS LOCALES ---
  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditandoLogin, setUsuarioEditandoLogin] = useState<string | null>(null);

  const [nuevoUsuario, setNuevoUsuario] = useState({
    login: '',
    correo: '',
    id_rol: 0,
    contraseña: '',
    activo: true,
  });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [usuarioAInteractuar, setUsuarioAInteractuar] = useState<Usuario | null>(null);
  const [accionAConfirmar, setAccionAConfirmar] = useState<'toggle' | 'delete' | null>(null);
  
  // --- LÓGICA DE DATOS ---
  const fetchUsersAndRoles = useCallback(async () => {
    setLoading(true);
    if (!token) {
      setError("No autenticado.");
      setLoading(false);
      return;
    }

    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/usuarios`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/roles`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const rolesData: Rol[] = rolesResponse.data.roles || [];
      const usersData: Usuario[] = (usersResponse.data || []).map((u: Usuario) => ({
        ...u,
        nombre_rol: rolesData.find(r => r.id === u.id_rol)?.rol || 'Desconocido'
      }));


      setRoles(rolesData);
      setAllUsers(usersData);

      if (rolesData.length > 0 && nuevoUsuario.id_rol === 0) {
        setNuevoUsuario(prev => ({ ...prev, id_rol: rolesData[0].id }));
      }
    } catch (error) {
      const errorMsg = "Error al cargar datos. Intente de nuevo más tarde.";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error fetching users and roles:', error);
    } finally {
      setLoading(false);
    }
  }, [token, nuevoUsuario.id_rol]);

  useEffect(() => {
    fetchUsersAndRoles();
  }, [fetchUsersAndRoles]);

  const { currentTableData, totalPages, totalItems } = useMemo(() => {
    const sortedUsers = [...allUsers].sort((a, b) => a.login.localeCompare(b.login));
    const filtered = sortedUsers.filter(u =>
      u.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.correo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return {
      currentTableData: filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      totalItems: filtered.length,
    };
  }, [allUsers, searchTerm, currentPage, itemsPerPage]);

  const handlePageChange = (_e: React.ChangeEvent<unknown>, v: number) => setCurrentPage(v);
  const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCurrentPage(1); };
  const handleItemsPerPageChange = (e: SelectChangeEvent<number>) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); };

  const abrirModalAgregar = () => {
    setModoEdicion(false);
    setUsuarioEditandoLogin(null);
    setNuevoUsuario({
      login: '',
      correo: '',
      id_rol: roles.length > 0 ? roles[0].id : 0,
      contraseña: '',
      activo: true,
    });
    setIsModalOpen(true);
  };
  
  const abrirModalEditar = (usuario: Usuario) => {
    setModoEdicion(true);
    setUsuarioEditandoLogin(usuario.login);
    setNuevoUsuario({
      login: usuario.login,
      correo: usuario.correo,
      id_rol: usuario.id_rol,
      contraseña: '',
      activo: usuario.activo,
    });
    setIsModalOpen(true);
  };
  
  const cerrarModal = () => setIsModalOpen(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent<number>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    setNuevoUsuario(prev => ({
        ...prev,
        [name as string]: type === 'checkbox' ? checked : value,
    }));
  };

  const guardarUsuario = async () => {
    if (!token) {
      return toast.error("No autenticado.");
    }
    if (!nuevoUsuario.login || !nuevoUsuario.correo || !nuevoUsuario.id_rol) {
      return toast.warn("Los campos Login, Correo y Rol son obligatorios.");
    }
    if (!modoEdicion && !nuevoUsuario.contraseña) {
      return toast.warn("La contraseña es obligatoria para crear un nuevo usuario.");
    }

    try {
      if (modoEdicion) {
        const payload: { correo: string; id_rol: number; activo: boolean; newPassword?: string } = {
          correo: nuevoUsuario.correo,
          id_rol: nuevoUsuario.id_rol,
          activo: nuevoUsuario.activo,
        };
        if (nuevoUsuario.contraseña) {
          payload.newPassword = nuevoUsuario.contraseña;
        }
        await axios.put(`${API_BASE_URL}/auth/users/${usuarioEditandoLogin}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Usuario actualizado con éxito.");
      } else {
        await axios.post(`${API_BASE_URL}/auth/users/create`, nuevoUsuario, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("Usuario creado con éxito.");
      }
      await fetchUsersAndRoles();
      cerrarModal();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        toast.error(err.response.data.error || "Ocurrió un error.");
      } else {
        toast.error("Error de red o desconocido.");
      }
    }
  };

  const solicitarConfirmacion = (usuario: Usuario, accion: 'toggle' | 'delete') => {
    setUsuarioAInteractuar(usuario);
    setAccionAConfirmar(accion);
    setConfirmDialogOpen(true);
  };
  
  const confirmarAccion = async () => {
    if (!usuarioAInteractuar || !accionAConfirmar) return;
    if (!token) {
      toast.error("No autenticado.");
      return;
    }
    const login = usuarioAInteractuar.login;

    try {
        if (accionAConfirmar === 'toggle') {
            const newStatus = !usuarioAInteractuar.activo;
            await axios.put(`${API_BASE_URL}/auth/users/${login}/toggle-status`, { activo: newStatus ? 1 : 0 }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Estado del usuario ${login} cambiado con éxito.`);
        } else if (accionAConfirmar === 'delete') {
            await axios.delete(`${API_BASE_URL}/auth/users/${login}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Usuario ${login} eliminado con éxito.`);
        }
        await fetchUsersAndRoles();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        toast.error(err.response.data.error || "Ocurrió un error.");
      } else {
        toast.error("Error de red o desconocido.");
      }
    } finally {
        setConfirmDialogOpen(false);
        setUsuarioAInteractuar(null);
        setAccionAConfirmar(null);
    }
  };

  const getConfirmationText = () => {
    if (!usuarioAInteractuar || !accionAConfirmar) return { title: '', content: '', button: '' };
    if (accionAConfirmar === 'toggle') {
      return {
        title: `Confirmar ${usuarioAInteractuar.activo ? 'Desactivación' : 'Activación'}`,
        content: `¿Estás seguro de que quieres ${usuarioAInteractuar.activo ? 'desactivar' : 'activar'} al usuario ${usuarioAInteractuar.login}?`,
        button: usuarioAInteractuar.activo ? 'Desactivar' : 'Activar'
      }
    }
    return {
      title: 'Confirmar Eliminación',
      content: `¿Estás seguro de que quieres eliminar al usuario ${usuarioAInteractuar.login}? Esta acción es irreversible.`,
      button: 'Eliminar'
    }
  }

  if (loading && allUsers.length === 0) return <div className="p-4 text-center">Cargando usuarios...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: '12px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
                Regresar
            </Button>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={abrirModalAgregar}>
                Agregar Usuario
            </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
          <TextField label="Buscar por Login o Correo" variant="outlined" size="small" value={searchTerm} onChange={handleChangeSearch} sx={{ width: { xs: '100%', sm: 250 } }}/>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Items/pág</InputLabel>
            <Select value={itemsPerPage} label="Items/pág" onChange={handleItemsPerPageChange}>
              <MenuItem value={5}>5</MenuItem><MenuItem value={10}>10</MenuItem><MenuItem value={20}>20</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow><TableCell isHeader>Login</TableCell><TableCell isHeader>Correo</TableCell><TableCell isHeader>Rol</TableCell><TableCell isHeader>Estado</TableCell><TableCell isHeader>Acciones</TableCell></TableRow>
          </TableHeader>
          <TableBody>
            {currentTableData.map((usuario) => (
              <TableRow key={usuario.login} className="odd:bg-gray-50 dark:odd:bg-gray-800">
                <TableCell>{usuario.login}</TableCell>
                <TableCell>{usuario.correo}</TableCell>
                <TableCell>{usuario.nombre_rol}</TableCell>
                <TableCell>
                  <Tooltip title={`Clic para ${usuario.activo ? 'desactivar' : 'activar'}`}>
                    <span onClick={() => solicitarConfirmacion(usuario, 'toggle')}
                        className={`px-2 py-1 rounded-full text-xs font-semibold cursor-pointer ${usuario.activo ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Editar Usuario">
                      <span><IconButton color="secondary" onClick={() => abrirModalEditar(usuario)} disabled={!usuario.activo}><EditIcon /></IconButton></span>
                    </Tooltip>
                    <Tooltip title="Eliminar Usuario">
                      <span><IconButton color="error" onClick={() => solicitarConfirmacion(usuario, 'delete')} disabled={!usuario.activo}><DeleteIcon /></IconButton></span>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="text-sm text-gray-700">Mostrando {currentTableData.length} de {totalItems}</p>
        {totalPages > 1 && <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />}
      </Box>

      <Dialog open={isModalOpen} onClose={cerrarModal} maxWidth="sm" fullWidth>
        <DialogTitle>{modoEdicion ? `Editar Usuario: ${usuarioEditandoLogin}` : 'Crear Nuevo Usuario'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ pt: 1 }}>
            <Grid xs={12} sm={6}>
              <TextField label="Login" name="login" value={nuevoUsuario.login} onChange={handleInputChange} fullWidth required disabled={modoEdicion}/>
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField label="Correo Electrónico" name="correo" type="email" value={nuevoUsuario.correo} onChange={handleInputChange} fullWidth required/>
            </Grid>
            <Grid xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Rol</InputLabel>
                <Select name="id_rol" value={nuevoUsuario.id_rol} label="Rol" onChange={handleInputChange}>
                  {roles.map(r => <MenuItem key={r.id} value={r.id}>{r.rol}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField label={modoEdicion ? "Nueva Contraseña (opcional)" : "Contraseña"} name="contraseña" type="password" value={nuevoUsuario.contraseña} onChange={handleInputChange} fullWidth required={!modoEdicion}/>
            </Grid>
            <Grid xs={12}>
              <FormControlLabel control={<Switch name="activo" checked={nuevoUsuario.activo} onChange={handleInputChange}/>} label="Usuario Activo"/>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={cerrarModal}>Cancelar</Button>
          <Button onClick={guardarUsuario} variant="contained">{modoEdicion ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>{getConfirmationText().title}</DialogTitle>
        <DialogContent><DialogContentText>{getConfirmationText().content}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
          <Button onClick={confirmarAccion} color={accionAConfirmar === 'delete' ? 'error' : 'primary'}>{getConfirmationText().button}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}