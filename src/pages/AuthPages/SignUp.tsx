import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import VerifyCodeForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Verificar"
        description="."
      />
      <AuthLayout>
        <VerifyCodeForm />
      </AuthLayout>
    </>
  );
}
