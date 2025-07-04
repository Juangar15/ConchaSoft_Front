// src/components/form/input/InputField.tsx

import type React from "react";
import type { FC, InputHTMLAttributes } from "react"; // Importa InputHTMLAttributes

// Extiende InputHTMLAttributes para obtener todas las props estándar de un <input>
// Luego, puedes añadir o sobrescribir props específicas si lo necesitas.
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  // Las props como 'type', 'id', 'name', 'placeholder', 'onChange', 'className',
  // 'min', 'max', 'step', 'disabled' ya están incluidas de InputHTMLAttributes.
  // Sin embargo, si quieres restringir 'type' a ciertos valores o añadir un 'string' genérico
  // para tipos no estándar, puedes hacerlo así.
  type?: "text" | "number" | "email" | "password" | "date" | "time" | "checkbox" | string; // ¡Añadido "checkbox"!
  // Ya no necesitamos redefinir 'value' ni 'onChange' a menos que queramos tiparlos de forma más específica
  // para este componente particular (por ejemplo, para que 'value' sea siempre string para 'text', etc.).
  // Por ahora, InputHTMLAttributes<HTMLInputElement> es suficiente para 'value' y 'onChange'.

  success?: boolean;
  error?: boolean;
  hint?: string;
  // Para checkboxes, la prop 'checked' se maneja automáticamente al extender InputHTMLAttributes,
  // pero debes asegurarte de que tu componente la pase al elemento <input> interno.
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value, // Se pasa para tipos de texto/número
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
  checked, // ¡Añadido para recibir la prop checked!
  ...rest // Captura cualquier otra prop no destructurada (como checked si no la pones arriba)
}) => {
  let inputClasses = ` h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${className}`;

  if (disabled) {
    inputClasses += ` text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`; // Eliminé el segundo opacity-40 que estaba duplicado
  } else if (error) {
    inputClasses += ` border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800`;
  } else if (success) {
    inputClasses += ` border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800`;
  } else {
    inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800`;
  }

  // Clases específicas para checkbox para que no herede las alturas de los otros inputs
  if (type === "checkbox") {
    inputClasses = `h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 ${className}`;
  }


  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        // Condicionalmente pasa 'value' o 'checked'
        {...(type === "checkbox" ? { checked: checked } : { value: value })}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClasses}
        {...rest} // Asegúrate de pasar todas las demás props, incluyendo 'checked' si no la desestructuraste explícitamente
      />

      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;