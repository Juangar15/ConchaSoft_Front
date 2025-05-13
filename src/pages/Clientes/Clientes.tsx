import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import ClientesOne from "../../components/clientes/ClientesOne";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Clientes"
        description="Clientes"
      />
      <PageBreadcrumb pageTitle="ConchaSoft - Clientes" />
      <div className="space-y-6 border overflow-hidden rounded-xl border-gray-400 dark:border-none">
        <ComponentCard title="Clientes">
          <ClientesOne />
        </ComponentCard>
      </div>
    </>
  );
}
