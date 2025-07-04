import { ReactNode } from "react";
import type { FC, ButtonHTMLAttributes } from "react"; // Importa ButtonHTMLAttributes

// Extiende ButtonHTMLAttributes para obtener todas las props estándar de un <button>
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode; // Button text or content
  size?: "sm" | "md"; // Button size
  variant?: "primary" | "outline" | "secondary" | "success" | "danger"; // ¡Añadido "secondary", "success", "danger"!
  startIcon?: ReactNode; // Icon before the text
  endIcon?: ReactNode; // Icon after the text
  // 'onClick', 'disabled', 'className', 'type' ya están cubiertos por ButtonHTMLAttributes
  // pero puedes mantenerlos explícitamente si quieres más control o documentación
}

const Button: FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  type = "button",
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    // --- ¡Añadidas nuevas variantes! ---
    secondary:
      "bg-gray-200 text-gray-800 shadow-theme-xs hover:bg-gray-300 disabled:bg-gray-100 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700 dark:disabled:bg-gray-500",
    success:
      "bg-green-500 text-white shadow-theme-xs hover:bg-green-600 disabled:bg-green-300",
    danger: // Opcional: si quieres una variante roja para eliminar
      "bg-red-500 text-white shadow-theme-xs hover:bg-red-600 disabled:bg-red-300",
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;