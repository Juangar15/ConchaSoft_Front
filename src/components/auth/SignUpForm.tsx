import { useState, useEffect } from "react"; // Añade useEffect
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ChevronLeftIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function VerifyCodeForm() {
  const [codigo, setCodigo] = useState("");
  const [codigoError, setCodigoError] = useState<string | null>(null); // Estado específico para el error del código
  const [message, setMessage] = useState("");
  const [generalError, setGeneralError] = useState(""); // Para errores generales de la API o conexión
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const emailFromState = location.state?.email;

  // URL base de tu API desplegada en Render
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com/api';

  // Redirigir si no hay email en el estado (el usuario no siguió el flujo)
  useEffect(() => {
    if (!emailFromState) {
      setGeneralError("No se encontró el correo electrónico. Por favor, regresa al formulario de recuperación de contraseña.");
      // Opcional: redirigir automáticamente después de un tiempo
      // setTimeout(() => navigate('/recuperar-contraseña'), 3000);
    }
  }, [emailFromState, navigate]);

  // --- Función de Validación del Código ---
  const validateCodigo = (value: string): string | null => {
    if (!value.trim()) {
      return "El código de verificación es requerido.";
    }
    // Asumiendo que el código es numérico y tiene una longitud fija (ej. 6 dígitos)
    // Ajusta la regex si tu código tiene letras o una longitud diferente
    if (!/^\d{6}$/.test(value)) {
      return "El código debe ser numérico y tener 6 dígitos.";
    }
    return null; // Válido
  };

  // --- Manejador de Cambio con Validación en Tiempo Real ---
  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCodigo(value);
    // Valida en tiempo real y actualiza el estado del error del código
    setCodigoError(validateCodigo(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(""); // Limpiar mensajes anteriores
    setGeneralError(""); // Limpiar errores generales anteriores

    if (!emailFromState) {
      setGeneralError("No se encontró el correo electrónico. Por favor, regresa al formulario anterior.");
      return;
    }

    // Realiza una validación final antes de enviar
    const validationError = validateCodigo(codigo);
    setCodigoError(validationError); // Asegura que el estado final del error se actualice

    if (validationError) {
      // Si hay un error de validación, no enviar la solicitud
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-reset-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailFromState, code: codigo }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Código verificado exitosamente.");
        // Redirige al formulario de cambio de contraseña después de un breve retraso
        setTimeout(() => {
          navigate("/cambiar-clave", { state: { email: emailFromState, code: codigo } });
        }, 1500);
      } else {
        // Muestra el error de la API como un error general
        setGeneralError(data.error || "El código es incorrecto o ha expirado. Intenta nuevamente.");
      }
    } catch {
      setGeneralError("No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setMessage("");
    setGeneralError("");
    setCodigoError(null); // Limpiar error del código al reenviar

    if (!emailFromState) {
      setGeneralError("No se encontró el correo para reenviar el código.");
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
        setGeneralError(data.error || "No se pudo reenviar el código. Intenta de nuevo más tarde.");
      }
    } catch {
      setGeneralError("Error de conexión al intentar reenviar el código.");
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
            Ingresa el código que te enviamos por correo a **{emailFromState || 'tu dirección de correo'}** para continuar.
          </p>
          {!emailFromState && (
            <p className="mt-2 text-red-500 text-sm">
              ¡Importante! No se detectó un correo. Asegúrate de haber iniciado el proceso de recuperación correctamente.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label htmlFor="codigo">
                Código de verificación <span className="text-error-500">*</span>
              </Label>
              <Input
                id="codigo"
                type="text" // Mantener como 'text' para permitir la entrada de cualquier carácter y luego validar
                name="codigo"
                placeholder="Ej: 123456"
                value={codigo}
                onChange={handleCodigoChange} // Valida en tiempo real
                disabled={isLoading}
                // Aplica la clase de error si codigoError tiene un valor
                className={codigoError ? "border-error-500 focus:ring-error-500" : ""}
              />
              {codigoError && ( // Muestra el error específico del código
                <p className="mt-1 text-sm text-error-500">{codigoError}</p>
              )}
            </div>

            {message && (
              <div className="text-green-600 text-sm mt-2">{message}</div>
            )}
            {generalError && ( // Muestra errores generales de la API o conexión
              <div className="text-red-500 text-sm mt-2">{generalError}</div>
            )}

            <div>
              <Button
                className="w-full"
                size="sm"
                type="submit"
                disabled={isLoading || !!codigoError || !emailFromState} // Deshabilita si no hay email o el código es inválido
              >
                {isLoading ? "Verificando..." : "Verificar Código"}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-5 text-center text-sm text-gray-700 dark:text-gray-400">
          ¿No recibiste el código?{" "}
          <button
            onClick={handleResendCode}
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            disabled={isLoading || !emailFromState} // Deshabilita si está cargando o no hay email
          >
            Reenviar
          </button>
        </div>
      </div>
    </div>
  );
}