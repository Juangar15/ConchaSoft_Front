// App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import VerifyCodeForm from "./pages/AuthPages/SignUp";
import RecoverPassword from "./pages/AuthPages/RecoverPassword"
import NotFound from "./pages/OtherPage/NotFound";
import Roles from "./pages/Roles/Roles";
import Permisos from "./pages/Permisos/Permisos";
import Usuarios from "./pages/Usuarios/Usuarios";
import Devoluciones from "./pages/Devoluciones/Devoluciones";
import Proveedores from "./pages/Proveedores/Proveedores";
import Clientes from "./pages/Clientes/Clientes";
import Ventas from "./pages/Ventas/Ventas";
import Productos from "./pages/Productos/Productos";
import Compras from "./pages/Compras/Compras";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ChangePasswordForm from "./pages/AuthPages/ChangePassword";
import { AuthProvider, useAuth } from "./context/authContext"; // <--- Importa AuthProvider

// Importa AdminDashboard
import AdminDashboard from "./pages/Editar/AdminDashboard"; // Asegúrate de que esta ruta sea correcta

// Componente auxiliar para proteger rutas que requieren autenticación
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  // Si no está autenticado, redirige a la página de inicio (SignIn)
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

// Componente para proteger rutas que requieren ser ADMINISTRADOR
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();

  // 1. Si no está autenticado, redirige a la página de inicio (SignIn)
  if (!isAuthenticated) {
    return <Navigate to="/" replace />; // Tu ruta raíz es SignIn
  }

  // 2. Si está autenticado, verifica si es administrador (id_rol 1)
  const isAdmin = user && user.id_rol === 1;

  if (!isAdmin) {
    // Si no es administrador, redirige al dashboard (o una página de acceso denegado)
    return <Navigate to="/dashboard" replace />;
  }

  // Si está autenticado y es administrador, permite el acceso
  return <>{children}</>;
};


import { ToastContainer } from 'react-toastify'; // Importa ToastContainer
import 'react-toastify/dist/ReactToastify.css'; // Importa los estilos de Toastify

export default function App() {
  return (
    <AuthProvider> {/* Envuelve toda tu aplicación con AuthProvider */}
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Rutas de Autenticación (accesibles para cualquiera, incluso sin estar logueado) */}
          <Route index path="/" element={<SignIn />} /> {/* Tu ruta raíz es SignIn */}
          <Route path="/verificar-codigo" element={<VerifyCodeForm />} />
          <Route path="/reset-password" element={<RecoverPassword />} />
          <Route path="/cambiar-clave" element={<ChangePasswordForm />} />

          {/* Grupo de Rutas Protegidas que usan AppLayout */}
          <Route element={<ProtectedRoute> <AppLayout /> </ProtectedRoute>}>
            <Route path="/dashboard" element={<Home />} />
            <Route path="/blank" element={<Blank />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/roles/:idRol/permisos" element={<Permisos />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/devoluciones" element={<Devoluciones />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/compras" element={<Compras />} />
            {/* Si tienes una página de perfil de usuario individual, podría ir aquí */}
            <Route path="/profile/:login" element={<div>Página de Perfil (mostrar datos del usuario)</div>} />
          </Route>

          {/* === AÑADIDO: Ruta Protegida para Administradores === */}
          <Route
              path="/admin/users" // Ruta relativa a la ruta padre (que es la ruta que usa AppLayout)
              element={
                <AdminRoute> {/* AdminRoute protegerá solo esta sub-ruta */}
                  <AdminDashboard />
                </AdminRoute>
              }
            />
          {/* ================================================= */}

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      {/* ToastContainer global para mostrar las notificaciones */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </AuthProvider>
  );
}