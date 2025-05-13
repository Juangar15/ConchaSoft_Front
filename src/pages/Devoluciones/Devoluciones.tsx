import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import DevolucionesOne from "../../components/devoluciones/DevolucionesOne";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Devoluciones"
        description="Devoluciones"
      />
      <PageBreadcrumb pageTitle="ConchaSoft - Devoluciones" />
      <div className="space-y-6 border overflow-hidden rounded-xl border-gray-400 dark:border-none">
        <ComponentCard title="Devoluciones">
          <DevolucionesOne />
        </ComponentCard>
      </div>
    </>
  );
}
