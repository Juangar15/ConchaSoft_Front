import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "../../icons"; 
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button"; 

export default function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null); // Estado específico para el error del email
  const [message, setMessage] = useState("");
  const [generalError, setGeneralError] = useState(""); // Para errores generales de la API
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // URL base de tu API desplegada en Render
  const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com'}/api/auth`;

  // --- Función de Validación de Correo ---
  const validateEmail = (value: string): string | null => {
    if (!value.trim()) {
      return "El correo electrónico es requerido.";
    }
    // Regex robusta para formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "El formato del correo electrónico no es válido.";
    }
    return null; // Válido
  };

  // --- Manejador de Cambio con Validación en Tiempo Real ---
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    // Valida en tiempo real y actualiza el estado del error del email
    setEmailError(validateEmail(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setGeneralError(""); // Limpia errores generales previos al envío

    // Realiza una validación final antes de enviar
    const validationError = validateEmail(email);
    setEmailError(validationError); // Asegura que el estado final del error se actualice

    if (validationError) {
      // Si hay un error de validación, no enviar la solicitud
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
        // Espera un poco antes de navegar para que el usuario vea el mensaje
        setTimeout(() => {
            navigate("/verificar-codigo", { state: { email } });
        }, 1500);
      } else {
        // Muestra el error de la API como un error general
        setGeneralError(data.error || "Ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo.");
      }
    } catch {
      setGeneralError("No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.");
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
                  onChange={handleEmailChange} // Ahora valida en tiempo real
                  disabled={isLoading}
                  // Aplica la clase de error si emailError tiene un valor
                  className={emailError ? "border-error-500 focus:ring-error-500" : ""}
                />
                {emailError && ( // Muestra el error específico del email
                  <p className="mt-1 text-sm text-error-500">{emailError}</p>
                )}
              </div>

              {message && (
                <div className="text-green-600 text-sm mt-2">{message}</div>
              )}
              {generalError && ( // Muestra errores generales de la API o conexión
                <div className="text-red-500 text-sm mt-2">{generalError}</div>
              )}

              <div>
                <Button className="w-full" size="sm" type="submit" disabled={isLoading || !!emailError}>
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