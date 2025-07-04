import PageMeta from "../../components/common/PageMeta";
import VentasChart from "../../components/ecommerce/VentasChart";
import ComprasChart from "../../components/ecommerce/ComprasChart";
import DevolucionesChart from "../../components/ecommerce/DevolucionesChart";
import PedidosChart from "../../components/ecommerce/PedidosChart";

export default function Home() {
  return (
    <>
      <PageMeta
        title="ConchaSoft - Inicio"
        description="Bienvenido"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Primera fila: Ventas y Compras */}
        <div className="col-span-12 lg:col-span-6">
          <VentasChart />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <ComprasChart />
        </div>

        {/* Segunda fila: Devoluciones y Pedidos */}
        <div className="col-span-12 lg:col-span-6">
          <DevolucionesChart />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <PedidosChart />
        </div>
      </div>
    </>
  );
}

//comentario 2