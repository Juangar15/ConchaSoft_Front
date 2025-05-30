// src/components/common/FloatingInput.tsx
import React, { useState } from 'react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
    name: string;
    // Agregamos readOnly como una propiedad explícita para controlarlo mejor
    readOnly?: boolean;
}

const FloatingInput: React.FC<FloatingInputProps> = ({ label, id, name, value, onChange, readOnly, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    // Determina si el label debe estar en la posición "flotando" (más pequeño, arriba)
    // Flotará si está enfocado, tiene valor, O si es de solo lectura (para que la etiqueta esté siempre arriba)
    const labelFloated = isFocused || hasValue || readOnly;

    // Clases comunes para el label flotante
    const labelClasses = `absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 z-10 origin-[0] peer-focus:start-0 peer-focus:text-brand-600 peer-focus:dark:text-brand-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto ${
        labelFloated ? 'text-brand-600 dark:text-brand-500' : ''
    }`;

    // Si es de solo lectura, renderiza una estructura diferente
    if (readOnly) {
        return (
            // Eliminamos 'mb-6' de aquí. El espaciado lo manejará el `gap` del grid padre.
            <div className="relative z-0 w-full group">
                <div className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 dark:text-white dark:border-gray-600">
                    <p className="text-gray-900 dark:text-white text-base font-medium">
                        {value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : "N/A"}
                    </p>
                </div>
                <label
                    htmlFor={id}
                    className={labelClasses}
                >
                    {label}
                </label>
            </div>
        );
    }

    // Renderizado original para campos editables
    return (
        // Eliminamos 'mb-6' de aquí también.
        <div className="relative z-0 w-full group">
            <input
                type={props.type || "text"}
                name={name}
                id={id}
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-brand-500 focus:outline-none focus:ring-0 focus:border-brand-600 peer"
                placeholder=" "
                {...props}
            />
            <label
                htmlFor={id}
                className={labelClasses}
            >
                {label}
            </label>
        </div>
    );
};

export default FloatingInput;