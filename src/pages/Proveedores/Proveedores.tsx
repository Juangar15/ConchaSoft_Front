import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import ProveedoresOne from "../../components/Proveedores/ProveedoresOne";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Proveedores"
        description="Proveedores"
      />
      <PageBreadcrumb pageTitle="ConchaSoft - Proveedores" />
      <div className="space-y-6 border overflow-hidden rounded-xl border-gray-400 dark:border-none">
        <ComponentCard title="Proveedores">
          <ProveedoresOne />
        </ComponentCard>
      </div>
    </>
  );
}
