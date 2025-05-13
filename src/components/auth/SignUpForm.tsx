import { useState } from "react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import { ChevronLeftIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

export default function VerifyCodeForm() {
  const [codigo, setCodigo] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Aquí debería ir la verificación real del código
    if (codigo === "123456") {
      navigate("/cambiar-clave");
    } else {
      alert("Código incorrecto. Intenta nuevamente.");
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Volver al inicio de sesión
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Verifica tu código
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ingresa el código que te enviamos por correo para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label>
                Código de verificación <span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                name="codigo"
                placeholder="Ej: 123456"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </div>

            <div>
              <Button className="w-full" size="sm">
                Verificar Código
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-5 text-center text-sm text-gray-700 dark:text-gray-400">
          ¿No recibiste el código?{" "}
          <button className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
            Reenviar
          </button>
        </div>
      </div>
    </div>
  );
}