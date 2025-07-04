import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import RolesOne from "../../components/usuarios/UsuariosOne";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Usuarios"
        description="Usuarios"
      />
      <PageBreadcrumb pageTitle="ConchaSoft - Usuarios" />
      <div className="space-y-6 border overflow-hidden rounded-xl border-gray-400 dark:border-none">
        <ComponentCard title="Gestión de Usuarios">
          <RolesOne />
        </ComponentCard>
      </div>
    </>
  );
}




