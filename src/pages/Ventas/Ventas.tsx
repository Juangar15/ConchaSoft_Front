import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import VentasOne from "../../components/ventas/VentasOne";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Ventas"
        description="Ventas"
      />
      <PageBreadcrumb pageTitle="ConchaSoft - Ventas" />
      <div className="space-y-6 border overflow-hidden rounded-xl border-gray-400 dark:border-none">
        <ComponentCard title="Gestión de Ventas">
          <VentasOne />
        </ComponentCard>
      </div>
    </>
  );
}
