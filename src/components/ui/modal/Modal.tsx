interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
  }
  
  const Modal: React.FC<ModalProps> = ({ isOpen, children }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-6 w-full max-w-md shadow-lg text-theme-xs text-black dark:text-white border border-gray-500 px-5 py-3 text-start">
          {children}
        </div>
      </div>
    );
  };
  
  export default Modal;