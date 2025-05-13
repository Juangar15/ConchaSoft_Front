import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import RecoverPasswordForm from "../../components/auth/RecoverPasswordForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Recuperar Contraseña"
        description="Recuperar Contraseña"
      />
      <AuthLayout>
        <RecoverPasswordForm />
      </AuthLayout>
    </>
  );
}
