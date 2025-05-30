import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom"; // Añade useLocation
import { ChevronLeftIcon, EyeIcon, EyeCloseIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(""); // Para mensajes de éxito
  const [error, setError] = useState("");     // Para mensajes de error
  const [isLoading, setIsLoading] = useState(false); // Para el estado de carga
  const navigate = useNavigate();
  const location = useLocation(); // Hook para acceder al estado de la ruta

  // Extrae el email y el código del estado de la navegación
  const emailFromState = location.state?.email;
  const codeFromState = location.state?.code;

  // URL base de tu API desplegada en Render
  const API_BASE_URL = 'https://conchasoft-api.onrender.com/api/auth';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(""); // Limpiar mensajes anteriores
    setError("");   // Limpiar errores anteriores

    if (!emailFromState || !codeFromState) {
        setError("Información de recuperación incompleta. Por favor, reinicia el proceso.");
        // Opcional: Redirigir a la página de inicio de recuperación
        // navigate("/recuperar-contrasena");
        return;
    }

    if (!password || !confirmPassword) {
      setError("Por favor, completa ambos campos de contraseña.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden. Inténtalo de nuevo.");
      return;
    }

    // Opcional: Añadir validación de complejidad de la contraseña (ej. longitud mínima)
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailFromState,
          code: codeFromState,
          newPassword: password, // Envía la nueva contraseña
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Contraseña restablecida exitosamente. Redirigiendo al inicio de sesión...");
        // Redirige al inicio de sesión después de un breve retraso
        setTimeout(() => {
          navigate("/");
        }, 3000); // 3 segundos antes de redirigir
      } else {
        setError(data.error || "No se pudo restablecer la contraseña. El código pudo haber expirado.");
        // Si el código ha expirado, podríamos sugerir reiniciar el proceso
      }
    } catch (err) {
      console.error("Error en la petición:", err);
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Volver al inicio de sesión
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Nueva Contraseña
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresa tu nueva contraseña para recuperar el acceso.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label htmlFor="password">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu nueva contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
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
              <div>
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirma tu nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Mensajes de feedback */}
              {message && (
                <div className="text-green-600 text-sm mt-2">{message}</div>
              )}
              {error && (
                <div className="text-red-500 text-sm mt-2">{error}</div>
              )}

              <div>
                <Button className="w-full" size="sm" type="submit" disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar Contraseña"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}