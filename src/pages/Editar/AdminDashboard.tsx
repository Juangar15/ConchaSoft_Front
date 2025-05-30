// src/pages/AdminDashboard.tsx
import React from 'react';
import UserManagement from '../../components/Editar/UserManagement'; // Ajusta la ruta si es necesario

const AdminDashboard: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8"> {/* Añade algunos paddings generales para la página */}
      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">Panel de Administración</h1>
      <UserManagement /> {/* Renderiza el componente de gestión de usuarios */}
    </div>
  );
};

export default AdminDashboard;