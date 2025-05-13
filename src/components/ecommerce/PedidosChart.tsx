import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export default function PedidosChart() {
  const options: ApexOptions = {
    colors: ["#3B82F6"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "line",
      height: 180,
      toolbar: { show: false },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    xaxis: {
      categories: [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
      ],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      strokeColors: "#fff",
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} pedidos`,
      },
    },
    grid: {
      yaxis: {
        lines: { show: true },
      },
    },
  };

  const series = [
    {
      name: "Pedidos",
      data: [90, 100, 80, 110, 120, 100, 140, 160, 130, 170, 150, 140],
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-400 bg-gray-100 p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        Pedidos Mensuales
      </h3>
      <Chart options={options} series={series} type="line" height={180} />
    </div>
  );
}