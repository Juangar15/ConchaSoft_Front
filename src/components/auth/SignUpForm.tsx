import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom"; // Añade useLocation
import { ChevronLeftIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function VerifyCodeForm() {
  const [codigo, setCodigo] = useState("");
  const [message, setMessage] = useState(""); // Para mensajes de éxito
  const [error, setError] = useState("");     // Para mensajes de error
  const [isLoading, setIsLoading] = useState(false); // Para el estado de carga
  const navigate = useNavigate();
  const location = useLocation(); // Hook para acceder al estado de la ruta
  
  // Extrae el email del estado de la navegación.
  // Si el usuario llega directamente a esta página sin pasar por el formulario anterior,
  // el email podría ser undefined. Considera qué hacer en ese caso (redirigir, mostrar error).
  const emailFromState = location.state?.email;

  // URL base de tu API desplegada en Render
  const API_BASE_URL = 'https://conchasoft-api.onrender.com/api/auth';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(""); // Limpiar mensajes anteriores
    setError("");   // Limpiar errores anteriores

    if (!emailFromState) {
        setError("No se encontró el correo electrónico. Por favor, regresa al formulario anterior.");
        return;
    }

    if (!codigo) {
      setError("Por favor, ingresa el código de verificación.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-reset-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailFromState, code: codigo }), // Envía email y código
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Código verificado exitosamente.");
        // Redirige al formulario de cambio de contraseña, pasando el email y el código verificados.
        // El código es necesario para la última etapa de restablecimiento.
        navigate("/cambiar-clave", { state: { email: emailFromState, code: codigo } });
      } else {
        setError(data.error || "El código es incorrecto o ha expirado. Intenta nuevamente.");
      }
    } catch (err) {
      console.error("Error en la petición:", err);
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para reenviar el código (opcional, pero buena práctica)
  const handleResendCode = async () => {
    setMessage("");
    setError("");
    if (!emailFromState) {
        setError("No se encontró el correo para reenviar el código.");
        return;
    }
    setIsLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/request-password-reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailFromState }),
        });
        const data = await response.json();
        if (response.ok) {
            setMessage(data.message || "Se ha reenviado un nuevo código a tu correo.");
        } else {
            setError(data.error || "No se pudo reenviar el código. Intenta de nuevo más tarde.");
        }
    } catch (err) {
        console.error("Error al reenviar código:", err);
        setError("Error de conexión al intentar reenviar el código.");
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
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Verifica tu código
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ingresa el código que te enviamos por correo a **{emailFromState || 'tu dirección de correo' }** para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label htmlFor="codigo">
                Código de verificación <span className="text-error-500">*</span>
              </Label>
              <Input
                id="codigo"
                type="text"
                name="codigo"
                placeholder="Ej: 123456"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {message && (
              <div className="text-green-600 text-sm mt-2">{message}</div>
            )}
            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}

            <div>
              <Button className="w-full" size="sm" type="submit" disabled={isLoading}>
                {isLoading ? "Verificando..." : "Verificar Código"}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-5 text-center text-sm text-gray-700 dark:text-gray-400">
          ¿No recibiste el código?{" "}
          <button
            onClick={handleResendCode} // Añadimos el handler para reenviar
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            disabled={isLoading} // Deshabilitar mientras se envía
          >
            Reenviar
          </button>
        </div>
      </div>
    </div>
  );
}