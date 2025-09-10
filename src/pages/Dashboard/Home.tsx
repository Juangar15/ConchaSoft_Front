import PageMeta from "../../components/common/PageMeta";
import DashboardMain from "../../components/dashboard/DashboardMain";
import DashboardCharts from "../../components/dashboard/DashboardCharts";

export default function Home() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Dashboard"
        description="Panel de control con estadísticas y métricas en tiempo real"
      />
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Resumen general de tu negocio con datos en tiempo real
          </p>
        </div>
        
        {/* Métricas principales */}
        <DashboardMain />
        
        {/* Gráficos y análisis */}
        <div className="mt-8">
          <DashboardCharts />
        </div>
      </div>
    </>
  );
}

//comentario 2