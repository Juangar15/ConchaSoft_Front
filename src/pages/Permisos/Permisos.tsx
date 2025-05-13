import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import PermisosOne from "../../components/permisos/PermisosOne";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Permisos"
        description="Permisos"
      />
      <PageBreadcrumb pageTitle="ConchaSoft - Permisos" />
      <div className="space-y-6">
        <ComponentCard title="Permisos">
          <PermisosOne />
        </ComponentCard>
      </div>
    </>
  );
}
