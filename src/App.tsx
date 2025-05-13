import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
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

export default function App() {
  const isAuth = !! localStorage.getItem("token")

  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={isAuth ? <Home/> : <Navigate to="/"/>} />

            {/* Others Page */}
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}

            {/* Tables */}
            <Route path="/roles" element={<Roles />} />
            <Route path="/permisos" element={<Permisos />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/devoluciones" element={<Devoluciones />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/compras" element={<Compras />} />

            {/* Ui Elements */}


            {/* Charts */}
          </Route>

          {/* Auth Layout */}
          <Route index path="/" element={<SignIn />} />
          <Route path="/verificar-codigo" element={<VerifyCodeForm />} />
          <Route path="/reset-password" element={<RecoverPassword />} />
          <Route path="/cambiar-clave" element={<ChangePasswordForm />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
