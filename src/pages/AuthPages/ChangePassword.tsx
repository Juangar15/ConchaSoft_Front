import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ChangePasswordForm from "../../components/auth/ChangePasswordForm";

export default function Cambiar() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Registrarse"
        description="."
      />
      <AuthLayout>
        <ChangePasswordForm />
      </AuthLayout>
    </>
  );
}
