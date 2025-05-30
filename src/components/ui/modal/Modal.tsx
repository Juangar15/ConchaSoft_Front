// src/ui/modal/Modal.tsx
import React from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    handleClose: () => void;
    children: React.ReactNode;
    maxWidthClass?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, children, handleClose, maxWidthClass = 'max-w-xl' }) => {
    if (!isOpen) return null;

    const portalRoot = document.getElementById('modal-root');
    if (!portalRoot) {
        console.error("No se encontró el elemento 'modal-root'. Asegúrate de que existe en tu index.html");
        return null;
    }

    return ReactDOM.createPortal(
        <div
            // Este div es el fondo y el centrador. Está bien.
            className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/50"
            onClick={handleClose}
        >
            <div
                // *** ¡AÑADE 'w-full' AQUÍ, JUNTO A maxWidthClass! ***
                className={`bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl relative transition-all duration-300 transform scale-100 opacity-100 w-full ${maxWidthClass} overflow-visible`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        portalRoot
    );
};

export default Modal;