import { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import { toast } from 'react-toastify';
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Select from "../form/Select";

// --- URL BASE DE LA API ---
const API_BASE_URL = 'https://conchasoft-api.onrender.com/api';

// --- INTERFACES ---
interface TendenciasData {
  ventas: Array<{
    periodo: string;
    cantidad_ventas: number;
    monto_total: number;
    promedio_venta: number;
  }>;
  devoluciones: Array<{
    periodo: string;
    cantidad_devoluciones: number;
    monto_total_devuelto: number;
  }>;
}

interface DatosGraficos {
  ventas_vs_compras: Array<{
    fecha: string;
    ventas: number;
    compras: number;
    diferencia: number;
  }>;
  ventas_por_tipo_pago: Array<{
    tipo_pago: string;
    cantidad_ventas: number;
    monto_total: number;
    porcentaje: number;
  }>;
  top_clientes: Array<{
    nombre: string;
    apellido: string;
    total_ventas: number;
    monto_total: number;
    promedio_venta: number;
  }>;
}

export default function DashboardCharts() {
  const { token, isAuthenticated } = useAuth();
  const [tendencias, setTendencias] = useState<TendenciasData | null>(null);
  const [datosGraficos, setDatosGraficos] = useState<DatosGraficos | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipoTendencia, setTipoTendencia] = useState('mensual');
  
  // Función para formatear valores monetarios de forma consistente
  const formatCOP = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // --- FUNCIONES DE API ---
  const fetchTendencias = async (tipo: string = 'mensual', intentos = 1, maxIntentos = 3) => {
    if (!isAuthenticated || !token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/tendencias?tipo=${tipo}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });

      // Verificar si el servidor respondió con un error 500
      if (response.status === 500) {
        console.error(`Error 500 del servidor al cargar tendencias (intento ${intentos}/${maxIntentos})`);
        console.log('Respuesta del servidor:', await response.text().catch(() => 'No se pudo leer la respuesta'));
        
        // Intentar nuevamente si no hemos alcanzado el máximo de intentos
        if (intentos < maxIntentos) {
          toast.info(`Reintentando cargar tendencias (${intentos}/${maxIntentos})...`);
          // Esperar un segundo antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchTendencias(tipo, intentos + 1, maxIntentos);
        } else {
          throw new Error(`Error 500 del servidor: No se pudieron cargar las tendencias después de ${maxIntentos} intentos`);
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No se pudo leer el mensaje de error');
        console.error(`Error al cargar tendencias (${response.status}):`, errorText);
        throw new Error(`Error al cargar tendencias: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setTendencias(data);
    } catch (err) {
      console.error('Error al cargar tendencias:', err);
      toast.error(`Error al cargar tendencias: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  };

  const fetchDatosGraficos = async (intentos = 1, maxIntentos = 3) => {
    if (!isAuthenticated || !token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/datos-graficos`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      });

      // Verificar si el servidor respondió con un error 500
      if (response.status === 500) {
        console.error(`Error 500 del servidor al cargar datos de gráficos (intento ${intentos}/${maxIntentos})`);
        console.log('Respuesta del servidor:', await response.text().catch(() => 'No se pudo leer la respuesta'));
        
        // Intentar nuevamente si no hemos alcanzado el máximo de intentos
        if (intentos < maxIntentos) {
          toast.info(`Reintentando cargar datos de gráficos (${intentos}/${maxIntentos})...`);
          // Esperar un segundo antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchDatosGraficos(intentos + 1, maxIntentos);
        } else {
          throw new Error(`Error 500 del servidor: No se pudieron cargar los datos después de ${maxIntentos} intentos`);
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No se pudo leer el mensaje de error');
        console.error(`Error al cargar datos de gráficos (${response.status}):`, errorText);
        throw new Error(`Error al cargar datos de gráficos: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Verificar los datos de ventas por tipo de pago
      console.log('Datos de ventas por tipo de pago:', data.ventas_por_tipo_pago);
      
      // Asegurarse de que los porcentajes sean números válidos
      if (data.ventas_por_tipo_pago) {
        data.ventas_por_tipo_pago = data.ventas_por_tipo_pago.map(item => ({
          ...item,
          porcentaje: isNaN(item.porcentaje) ? 0 : Number(item.porcentaje)
        }));
      }
      
      setDatosGraficos(data);
    } catch (err) {
      console.error('Error al cargar datos de gráficos:', err);
      toast.error(`Error al cargar datos de gráficos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Ejecutar las peticiones de forma independiente para que un error en una no afecte a la otra
        const tendenciasPromise = fetchTendencias(tipoTendencia).catch(err => {
          console.error('Error en carga de tendencias:', err);
          // No relanzamos el error para que no interrumpa el flujo
        });
        
        const graficosPromise = fetchDatosGraficos().catch(err => {
          console.error('Error en carga de gráficos:', err);
          // No relanzamos el error para que no interrumpa el flujo
        });
        
        // Esperar a que ambas promesas se resuelvan (con éxito o error)
        await Promise.allSettled([tendenciasPromise, graficosPromise]);
      } catch (err) {
        console.error('Error general en carga de datos:', err);
        toast.error('Ocurrió un error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, token, tipoTendencia]);

  // --- OPCIONES DE GRÁFICOS ---
  const ventasOptions: ApexOptions = {
    colors: ["#10B981", "#EF4444", "#F59E0B", "#8B5CF6"],
    chart: {
      fontFamily: "Inter, sans-serif",
      type: "area",
      height: 350,
      toolbar: { 
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100]
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: tendencias?.ventas.map(v => v.periodo) || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"]
        }
      }
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: ["#6B7280"] },
        formatter: (val: number) => formatCOP(val),
      },
    },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } }
    },
    tooltip: {
      theme: "light",
      style: {
        fontSize: "12px",
        fontFamily: "Inter, sans-serif"
      },
      y: {
        formatter: (val: number) => formatCOP(val),
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "14px",
      fontWeight: 600,
      markers: {
        size: 8,
        strokeWidth: 2
      }
    },
  };

  // Configuración para futuros gráficos
  const donutOptions: ApexOptions = {
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '16px',
              fontWeight: 600,
              color: '#374151',
              formatter: function (w: any) {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
                return formatCOP(total)
              }
            }
          }
        }
      }
    }
  };

  // Opciones para gráfico de barras de ventas vs compras
  const ventasVsComprasOptions: ApexOptions = {
    colors: ["#3B82F6", "#10B981"],
    chart: {
      fontFamily: "Inter, sans-serif",
      type: "bar",
      height: 350,
      toolbar: { show: true },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4
      }
    },
    dataLabels: { 
      enabled: false 
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: datosGraficos?.ventas_vs_compras.map(d => new Date(d.fecha).toLocaleDateString('es-CO', { 
        day: 'numeric', 
        month: 'short' 
      })) || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"]
        }
      }
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: ["#6B7280"] },
        formatter: (val: number) => formatCOP(val),
      },
    },
    fill: {
      opacity: 1,
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        shadeIntensity: 0.5,
        gradientToColors: ["#1D4ED8", "#059669"],
        inverseColors: false,
        opacityFrom: 0.8,
        opacityTo: 0.3,
        stops: [0, 100]
      }
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val: number) => formatCOP(val),
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      fontSize: "14px",
      fontWeight: 600
    },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando gráficos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GRÁFICO DE TENDENCIAS */}
      <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mr-3"></div>
              Tendencias de Ventas y Devoluciones
            </CardTitle>
            <Select
              options={[
                { value: "diario", label: "Diario" },
                { value: "semanal", label: "Semanal" },
                { value: "mensual", label: "Mensual" }
              ]}
              placeholder="Seleccionar período"
              onChange={setTipoTendencia}
              defaultValue={tipoTendencia}
              className="w-40 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
            />
          </div>
        </CardHeader>
        <CardContent>
          {tendencias && (
            <Chart
              options={ventasOptions}
              series={[
                {
                  name: "Ventas",
                  data: tendencias.ventas.map(v => v.monto_total),
                },
                {
                  name: "Devoluciones",
                  data: tendencias.devoluciones.map(d => d.monto_total_devuelto),
                },
              ]}
              type="area"
              height={350}
            />
          )}
        </CardContent>
      </Card>

      {/* GRÁFICOS DE COMPARACIÓN */}
      <div className="grid grid-cols-1 gap-6">
        {/* Top Clientes */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 max-w-3xl mx-auto w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-blue-800 dark:text-blue-200 flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mr-3"></div>
              Top 5 Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {datosGraficos && (
              <div className="space-y-4">
                {datosGraficos.top_clientes.slice(0, 5).map((cliente, index) => {
                  const maxMonto = Math.max(...datosGraficos.top_clientes.map(c => c.monto_total));
                  const porcentaje = (cliente.monto_total / maxMonto) * 100;
                  
                  return (
                    <div key={index} className="group p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-blue-100 dark:border-blue-800/50 hover:shadow-md transition-all duration-300 hover:border-blue-200 dark:hover:border-blue-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {cliente.nombre} {cliente.apellido}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{cliente.total_ventas} ventas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                            {formatCOP(cliente.monto_total)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Promedio: {formatCOP(cliente.promedio_venta)}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${porcentaje}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO DE VENTAS VS COMPRAS */}
      {datosGraficos && datosGraficos.ventas_vs_compras.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">
          {/* Gráfico de Barras */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-200 flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full mr-3"></div>
                Ventas vs Compras (Gráfico)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Chart
                options={ventasVsComprasOptions}
                series={[
                  {
                    name: "Ventas",
                    data: datosGraficos.ventas_vs_compras.map(d => d.ventas)
                  },
                  {
                    name: "Compras", 
                    data: datosGraficos.ventas_vs_compras.map(d => d.compras)
                  }
                ]}
                type="bar"
                height={350}
              />
            </CardContent>
          </Card>

          {/* Tabla de Detalles */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-amber-800 dark:text-amber-200 flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full mr-3"></div>
                Detalle por Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {datosGraficos.ventas_vs_compras.slice(0, 7).map((dato, index) => (
                  <div key={index} className="group p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-amber-100 dark:border-amber-800/50 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(dato.fecha).toLocaleDateString('es-CO', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${dato.diferencia >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCOP(dato.diferencia)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Diferencia</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">Ventas</p>
                        <p className="font-bold text-green-600 dark:text-green-400">
                          {formatCOP(dato.ventas)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300 font-medium">Compras</p>
                        <p className="font-bold text-red-600 dark:text-red-400">
                          {formatCOP(dato.compras)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}