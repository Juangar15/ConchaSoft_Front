import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import RolesOne from "../../components/roles/RolesOne";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Roles"
        description="Roles"
      />
      <PageBreadcrumb pageTitle="ConchaSoft - Roles" />
      <div className="space-y-6 border overflow-hidden rounded-xl border-gray-400 dark:border-none">
        <ComponentCard title="Roles">
          <RolesOne />
        </ComponentCard>
      </div>
    </>
  );
}


