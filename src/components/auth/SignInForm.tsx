// src/pages/AuthPages/SignIn.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons"; // Asegúrate de que las rutas sean correctas
import Label from "../../components/form/Label";       // Asegúrate de que las rutas sean correctas
import Input from "../../components/form/input/InputField"; // Asegúrate de que las rutas sean correctas
import Button from "../../components/ui/button/Button";   // Asegúrate de que las rutas sean correctas
import { useAuth } from "../../context/authContext";    // Ruta correcta para tu AuthContext

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth(); // Obtiene la función login del contexto

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch("https://conchasoft-api.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login: username, contraseña: password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Inicio de sesión exitoso:", data);
        // === CAMBIO CLAVE AQUÍ: EXTRAER user DE LA RESPUESTA ===
        // Suponemos que 'data' es { token: "...", user: { login: "...", correo: "...", id_rol: X } }
        const { token, user } = data;

        // **IMPORTANTE**: Verifica que 'user' tenga la propiedad 'id_rol'
        if (token && user && typeof user.id_rol === 'number') {
          login(token, user); // Pasa el token Y la información completa del usuario al contexto
          navigate("/dashboard"); // Redirige al dashboard o a donde corresponda
        } else {
          setError("Respuesta de la API incompleta o inesperada. Falta token o datos de usuario (incluyendo rol).");
        }
      } else {
        console.error("Error al iniciar sesión:", data.error);
        setError(data.error || "Error al iniciar sesión. Inténtalo de nuevo.");
      }
    } catch (err) {
      console.error("Error de red o del servidor:", err);
      setError("No se pudo conectar con el servidor. Inténtalo más tarde.");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Iniciar Sesión
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresa por favor tu nombre de usuario y contraseña
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="username">
                    Nombre de Usuario <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    id="username"
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">
                    Contraseña <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                {error && <p className="text-sm text-error-500">{error}</p>}
                <div className="flex items-center justify-between">
                  <Link
                    to="/reset-password"
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div>
                  <Button className="w-full" size="sm" type="submit">
                    Iniciar Sesión
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}