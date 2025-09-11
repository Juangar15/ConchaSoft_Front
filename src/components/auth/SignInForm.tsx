// src/pages/AuthPages/SignIn.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { useAuth } from "../../context/authContext";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null); // For API or general errors
  const navigate = useNavigate();
  const { login } = useAuth();

  // Regex to allow only alphanumeric characters for username
  // The ^ and $ ensure the entire string matches the pattern.
  const alphanumericRegex = /^[a-zA-Z0-9]*$/;
  // Regex to disallow spaces anywhere in the password string
  const noSpacesRegex = /^\S*$/;

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    // Real-time validation for username
    if (!value.trim()) {
      setUsernameError("El nombre de usuario es requerido.");
    } else if (value.includes(" ")) {
      setUsernameError("El nombre de usuario no puede contener espacios.");
    } else if (!alphanumericRegex.test(value)) {
      setUsernameError("El nombre de usuario solo puede contener letras y números.");
    } else {
      setUsernameError(null); // Clear error if input is valid
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    // Real-time validation for password
    if (!value.trim()) {
      setPasswordError("La contraseña es requerida.");
    } else if (value.includes(" ")) {
      setPasswordError("La contraseña no puede contener espacios.");
    } else if (!noSpacesRegex.test(value)) {
      // This might be redundant with value.includes(" ") but ensures no hidden spaces
      setPasswordError("La contraseña no puede contener espacios u otros caracteres no permitidos.");
    } else {
      setPasswordError(null); // Clear error if input is valid
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear all previous errors on new submission attempt
    setGeneralError(null);
    setUsernameError(null);
    setPasswordError(null);

    // Re-validate fields before submission to catch any missed edge cases or
    // if the user tries to submit without interacting with a field.
    let isValid = true;

    if (!username.trim()) {
      setUsernameError("El nombre de usuario es requerido.");
      isValid = false;
    } else if (username.includes(" ")) {
      setUsernameError("El nombre de usuario no puede contener espacios.");
      isValid = false;
    } else if (!alphanumericRegex.test(username)) {
      setUsernameError("El nombre de usuario solo puede contener letras y números.");
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError("La contraseña es requerida.");
      isValid = false;
    } else if (password.includes(" ")) {
      setPasswordError("La contraseña no puede contener espacios.");
      isValid = false;
    } else if (!noSpacesRegex.test(password)) {
      setPasswordError("La contraseña contiene caracteres no permitidos.");
      isValid = false;
    }

    if (!isValid) {
      return; // Stop submission if any client-side validation fails
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com';
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // IMPORTANT: Sending `username` and `password` exactly as typed (case-sensitive)
        body: JSON.stringify({ login: username, contraseña: password }),
      });

      const data = await response.json();

      if (response.ok) {
        const { token, user } = data;

        // **IMPORTANT**: Verify that 'user' has the 'id_rol' property
        if (token && user && typeof user.id_rol === 'number') {
          login(token, user);
          navigate("/dashboard");
        } else {
          setGeneralError("Respuesta de la API incompleta o inesperada. Falta token o datos de usuario (incluyendo rol).");
        }
      } else {
        // Display specific error from the API if available, otherwise a generic one.
        setGeneralError(data.error || "Error al iniciar sesión. Inténtalo de nuevo. Asegúrate de que el usuario y la contraseña sean correctos y distingan entre mayúsculas y minúsculas.");
      }
    } catch {
      setGeneralError("No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet o inténtalo más tarde.");
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
              Ingresa por favor tu nombre de usuario y contraseña. Recuerda que son sensibles a mayúsculas y minúsculas.
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
                    onChange={handleUsernameChange} // Use the new handler
                    // Add conditional styling for error state
                    className={usernameError ? "border-error-500 focus:ring-error-500" : ""}
                  />
                  {/* Display username error */}
                  {usernameError && <p className="mt-1 text-sm text-error-500">{usernameError}</p>}
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
                      onChange={handlePasswordChange} // Use the new handler
                      // Add conditional styling for error state
                      className={passwordError ? "border-error-500 focus:ring-error-500" : ""}
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
                  {/* Display password error */}
                  {passwordError && <p className="mt-1 text-sm text-error-500">{passwordError}</p>}
                </div>
                {/* Display general API/network error */}
                {generalError && <p className="text-sm text-error-500">{generalError}</p>}
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
