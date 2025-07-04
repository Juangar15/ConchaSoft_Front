import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import ProductosOne from "../../components/productos/ProductosOne";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Productos"
        description="Productos"
      />
      <PageBreadcrumb pageTitle="ConchaSoft - Productos" />
      <div className="space-y-6 border overflow-hidden rounded-xl border-gray-400 dark:border-none">
        <ComponentCard title="Gestión de Productos">
          <ProductosOne />
        </ComponentCard>
      </div>
    </>
  );
}

