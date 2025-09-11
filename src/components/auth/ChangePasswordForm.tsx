import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ChevronLeftIcon, EyeIcon, EyeCloseIcon } from "../../icons";
import { CheckCircle, XCircle } from "lucide-react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
    noCommon: false,
    noRepeat: false,
    noSpaces: false,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const emailFromState = location.state?.email;
  const codeFromState = location.state?.code;
  const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com'}/api/auth`;

  useEffect(() => {
    if (!emailFromState || !codeFromState) {
      setGeneralError("Información de recuperación incompleta. Por favor, reinicia el proceso de restablecimiento de contraseña.");
    }
  }, [emailFromState, codeFromState, navigate]);

  const validatePassword = (value: string): string | null => {
    const criteria = {
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      noCommon: !/1234|abcd|password|qwerty/i.test(value),
      noRepeat: !/(.)\1{2,}/.test(value),
      noSpaces: /^\S*$/.test(value),
    };
    setPasswordCriteria(criteria);

    return Object.values(criteria).every(Boolean) ? null : "La contraseña no cumple con todos los requisitos.";
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(validatePassword(value));
    if (confirmPassword) {
      setConfirmPasswordError(value !== confirmPassword ? "Las contraseñas no coinciden." : null);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setConfirmPasswordError(password !== value ? "Las contraseñas no coinciden." : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setGeneralError("");

    const passwordValidation = validatePassword(password);
    const confirmPasswordValidation = (password !== confirmPassword) ? "Las contraseñas no coinciden." : null;

    setPasswordError(passwordValidation);
    setConfirmPasswordError(confirmPasswordValidation);

    if (passwordValidation || confirmPasswordValidation) return;
    if (!emailFromState || !codeFromState) {
      setGeneralError("Información de recuperación incompleta. Por favor, reinicia el proceso.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailFromState, code: codeFromState, newPassword: password })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(data.message || "Contraseña restablecida exitosamente. Redirigiendo al inicio de sesión...");
        setTimeout(() => navigate("/"), 3000);
      } else {
        setGeneralError(data.error || "No se pudo restablecer la contraseña. El código pudo haber expirado.");
      }
    } catch {
      setGeneralError("No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const isButtonDisabled = isLoading || !!passwordError || !!confirmPasswordError || !password || !confirmPassword || !emailFromState || !codeFromState;

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
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
                <Label htmlFor="password">
                  Nueva Contraseña <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu nueva contraseña"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={isLoading}
                    className={passwordError ? "border-error-500 focus:ring-error-500" : ""}
                  />
                  <span onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                    {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                  </span>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm">
                  {Object.entries({
                    "Mínimo 8 caracteres": passwordCriteria.length,
                    "Al menos una mayúscula": passwordCriteria.upper,
                    "Al menos una minúscula": passwordCriteria.lower,
                    "Al menos un número": passwordCriteria.number,
                    "Carácter especial (!@#$...)": passwordCriteria.special,
                    "Sin secuencias comunes": passwordCriteria.noCommon,
                    "Sin repeticiones": passwordCriteria.noRepeat,
                    "Sin espacios": passwordCriteria.noSpaces,
                  }).map(([label, passed]) => (
                    <li key={label} className="flex items-center gap-1">
                      {passed ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      {label}
                    </li>
                  ))}
                </ul>
                {passwordError && <p className="mt-1 text-sm text-error-500">{passwordError}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword">
                  Confirmar Contraseña <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirma tu nueva contraseña"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  disabled={isLoading}
                  className={confirmPasswordError ? "border-error-500 focus:ring-error-500" : ""}
                />
                {confirmPasswordError && <p className="mt-1 text-sm text-error-500">{confirmPasswordError}</p>}
              </div>

              {message && <div className="text-green-600 text-sm mt-2">{message}</div>}
              {generalError && <div className="text-red-500 text-sm mt-2">{generalError}</div>}

              <div>
                <Button className="w-full" size="sm" type="submit" disabled={isButtonDisabled}>
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
