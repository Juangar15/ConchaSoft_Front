import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "../../icons"; // Asegúrate de que esta ruta sea correcta
import Label from "../form/Label";             // Asegúrate de que esta ruta sea correcta
import Input from "../form/input/InputField";  // Asegúrate de que esta ruta sea correcta
import Button from "../ui/button/Button";      // Asegúrate de que esta ruta sea correcta

export default function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // URL base de tu API desplegada en Render
  const API_BASE_URL = 'https://conchasoft-api.onrender.com/api/auth'; 

  const handleSubmit = async (e: React.FormEvent) => { // CORRECCIÓN AQUÍ: Añadido el tipo React.FormEvent
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email) {
      setError("Por favor, ingresa tu correo electrónico.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/request-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Se ha enviado un código de recuperación a tu correo.");
        navigate("/verificar-codigo", { state: { email } });
      } else {
        setError(data.error || "Ocurrió un error al procesar tu solicitud.");
      }
    } catch (err) {
      console.error("Error en la petición:", err);
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
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
              Recuperar Contraseña
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label htmlFor="email">
                  Correo electrónico <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  {isLoading ? "Enviando..." : "Enviar instrucciones"}
                </Button>
              </div>
            </div>
          </form>
          <div className="mt-5 text-sm text-center text-gray-700 dark:text-gray-400">
            ¿Recordaste tu contraseña?{" "}
            <Link
              to="/"
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}