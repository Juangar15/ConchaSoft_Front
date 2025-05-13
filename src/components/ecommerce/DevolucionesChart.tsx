import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export default function DevolucionesChart() {
  const options: ApexOptions = {
    colors: ["#EF4444"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 180,
      toolbar: { show: false },
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.4,
        opacityTo: 0,
      },
    },
    xaxis: {
      categories: [
        "Ene", "Feb", "Mar", "Abr", "May", "Jun",
        "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
      ],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} devoluciones`,
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
      name: "Devoluciones",
      data: [10, 20, 15, 12, 8, 14, 9, 13, 10, 17, 11, 16],
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-400 bg-gray-100 p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        Devoluciones Mensuales
      </h3>
      <Chart options={options} series={series} type="area" height={180} />
    </div>
  );
}