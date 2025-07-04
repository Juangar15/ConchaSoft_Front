import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import ComprasOne from "../../components/compras/ComprasOne";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Compras"
        description="Compras"
      />
      <PageBreadcrumb pageTitle="ConchaSoft - Compras" />
      <div className="space-y-6">
        <ComponentCard title="Gestión de Compras">
          <ComprasOne />
        </ComponentCard>
      </div>
    </>
  );
}
