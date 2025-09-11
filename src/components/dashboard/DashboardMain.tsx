import { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import { toast } from 'react-toastify';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
// We don't have a generic Alert container with children; use a simple div
import { AlertTriangle, TrendingUp, TrendingDown, Package, Users, DollarSign, RotateCcw } from 'lucide-react';

// --- URL BASE DE LA API ---
const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'https://conchasoft-api.onrender.com'}/api`;

// --- INTERFACES ---
interface DashboardData {
  ventas: {
    total_ventas: number;
    total_monto_ventas: number;
    promedio_venta: number;
    ventas_completadas: number;
    ventas_anuladas: number;
  };
  devoluciones: {
    total_devoluciones: number;
    total_monto_devuelto: number;
    devoluciones_aceptadas: number;
  };
  productos: {
    total_productos: number;
    total_variantes: number;
    stock_total: number;
    productos_sin_stock: number;
  };
  clientes: {
    total_clientes: number;
    clientes_activos: number;
  };
  ventas_por_dia: Array<{
    fecha: string;
    cantidad_ventas: number;
    monto_total: number;
  }>;
  top_productos_vendidos: Array<{
    nombre_producto: string;
    talla: string;
    color?: string;
    cantidad_vendida: number;
    monto_total: number;
  }>;
  alertas_stock: Array<{
    nombre_producto: string;
    talla: string;
    stock_actual: number;
    color?: string;
  }>;
}

interface ProductVariant {
  nombre_talla?: string;
  color?: string;
  stock?: number;
  id_producto_talla?: number;
}

interface Product {
  nombre?: string;
  variantes?: ProductVariant[];
}

interface MetricasRendimiento {
  comparacion_ventas: Array<{
    periodo: string;
    total_ventas: number;
    total_monto: number;
  }>;
  tasa_devolucion: {
    tasa_devolucion_porcentaje: number;
    total_devoluciones: number;
    total_ventas: number;
  };
  metricas_clientes: {
    clientes_activos: number;
    promedio_ventas_por_cliente: number;
    promedio_monto_por_cliente: number;
  };
}

export default function DashboardMain() {
  const { token, isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [metricas, setMetricas] = useState<MetricasRendimiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colorLookup, setColorLookup] = useState<Record<string, string>>({});
  const [variantIndexByNameTalla, setVariantIndexByNameTalla] = useState<Record<string, Array<{ color: string; stock: number }>>>({});
  
  // Formateador consistente de pesos colombianos sin decimales
  const formatCOP = (value: number | string | null | undefined) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  // Normalizadores para claves de lookup
  const normalizeText = (val: unknown): string => {
    if (val == null) return '';
    const s = String(val).trim().toLowerCase();
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };
  const normalizeTalla = (val: unknown): string => {
    const s = normalizeText(val);
    const only = s.replace(/[^0-9a-z]/g, '');
    return only;
  };

  // Utilidades para contraste de color (mejor visibilidad en colores claros)
  const parseHexColor = (hex: string): { r: number; g: number; b: number } | null => {
    if (typeof hex !== 'string') return null;
    let h = hex.trim();
    if (h.startsWith('#')) h = h.slice(1);
    if (h.length === 3) {
      h = h.split('').map((c) => c + c).join('');
    }
    if (h.length !== 6) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  };
  const isLightColor = (hex: string | null | undefined): boolean => {
    if (!hex) return false;
    const rgb = parseHexColor(hex);
    if (!rgb) return false;
    const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    return luminance > 200; // Umbral para considerar "claro"
  };





  // --- FUNCIONES DE API ---
  const fetchDashboardData = async () => {
    if (!isAuthenticated || !token) return;
    
    try {
      const [dashboardResponse, metricasResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/dashboard/metricas`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!dashboardResponse.ok || !metricasResponse.ok) {
        throw new Error('Error al cargar datos del dashboard');
      }

      const dashboardData = await dashboardResponse.json();
      const metricasData = await metricasResponse.json();

      console.log('Datos del dashboard:', dashboardData);
      console.log('Métricas:', metricasData);

      setDashboardData(dashboardData);
      setMetricas(metricasData);
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Cargar catálogo de productos para obtener colores por (producto, talla)
  const fetchProductColors = async () => {
    if (!isAuthenticated || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/productos`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return;
      const products = await res.json();
      const map: Record<string, string> = {};
      const byNameTalla: Record<string, Array<{ color: string; stock: number }>> = {};
      if (Array.isArray(products)) {
        products.forEach((p: Product) => {
          const nombre = p?.nombre;
          const variantes = Array.isArray(p?.variantes) ? p.variantes : [];
          variantes.forEach((v: ProductVariant) => {
            const talla = v?.nombre_talla;
            const color = v?.color;
            const stock = Number(v?.stock || 0);
            if (nombre && talla && typeof color === 'string' && color) {
              const key = `${String(nombre)}|${String(talla)}`;
              const nkey = `${normalizeText(nombre)}|${normalizeTalla(talla)}`;
              if (!map[key]) map[key] = color;
              if (!map[nkey]) map[nkey] = color;
              const list = byNameTalla[nkey] || [];
              list.push({ color, stock });
              byNameTalla[nkey] = list;
            }
            // Mapear también por id de variante para resolución directa
            const idPt = v?.id_producto_talla;
            if (idPt && typeof color === 'string' && color) {
              const idKey = `idpt:${String(idPt)}`;
              if (!map[idKey]) map[idKey] = color;
            }
          });
        });
      }
      setColorLookup(map);
      setVariantIndexByNameTalla(byNameTalla);
    } catch {
      // Silencio: el dashboard seguirá sin colores si falla
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchProductColors();
  }, [isAuthenticated, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700 max-w-md flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>
            <div className="font-semibold">Error al cargar el dashboard</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData || !metricas) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">No hay datos disponibles</p>
      </div>
    );
  }

  // Calcular comparación de ventas
  const ventasActuales = metricas.comparacion_ventas.find(v => v.periodo === 'actual');
  const ventasAnteriores = metricas.comparacion_ventas.find(v => v.periodo === 'anterior');
  const crecimientoVentas = ventasActuales && ventasAnteriores 
    ? ((ventasActuales.total_monto - ventasAnteriores.total_monto) / ventasAnteriores.total_monto) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ventas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCOP(dashboardData.ventas.total_monto_ventas)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {crecimientoVentas >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={crecimientoVentas >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(crecimientoVentas).toFixed(1)}%
              </span>
              <span className="ml-1">vs período anterior</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboardData.ventas.total_ventas} ventas realizadas
            </p>
          </CardContent>
        </Card>

        {/* Productos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.productos.total_productos}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.productos.total_variantes} variantes disponibles
            </p>
            <p className="text-xs text-muted-foreground">
              Stock total: {dashboardData.productos.stock_total} unidades
            </p>
          </CardContent>
        </Card>

        {/* Clientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.clientes.total_clientes}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.clientes.clientes_activos} clientes activos
            </p>
            <p className="text-xs text-muted-foreground">
              Promedio por cliente: {formatCOP(metricas.metricas_clientes.promedio_monto_por_cliente)}
            </p>
          </CardContent>
        </Card>

        {/* Devoluciones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.devoluciones.total_devoluciones}</div>
            <p className="text-xs text-muted-foreground">
              {formatCOP(dashboardData.devoluciones.total_monto_devuelto)} devueltos
            </p>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const tasa = Number(metricas.tasa_devolucion?.tasa_devolucion_porcentaje ?? 0);
                const safeTasa = Number.isFinite(tasa) ? tasa : 0;
                return `Tasa: ${safeTasa.toFixed(1)}%`;
              })()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ALERTAS DE STOCK */}
      {dashboardData.alertas_stock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              Alertas de Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                // Agrupar alertas por producto+talla para evitar repeticiones y sumar stock de la talla
                const groups = new Map<string, { nombre: string; talla: string; totalTalla: number }>();
                for (const a of dashboardData.alertas_stock) {
                  const nombreRaw = a.nombre_producto || (a as { producto?: string }).producto || (a as { nombre?: string }).nombre;
                  const tallaRaw = (a as { nombre_talla?: string }).nombre_talla || a.talla;
                  const key = `${String(normalizeText(nombreRaw))}|${String(normalizeTalla(tallaRaw))}`;
                  const prev = groups.get(key);
                  const toAdd = Number(a.stock_actual || 0);
                  if (prev) {
                    prev.totalTalla += toAdd;
                  } else {
                    groups.set(key, { nombre: String(nombreRaw), talla: String(tallaRaw), totalTalla: toAdd });
                  }
                }
                const entries = Array.from(groups.values()).slice(0, 5);
                return entries.map((entry, index) => {
                  const nkey = `${normalizeText(entry.nombre)}|${normalizeTalla(entry.talla)}`;
                  const variants = (variantIndexByNameTalla[nkey] || []) as Array<{ color: string; stock: number }>;
                  const LOW_STOCK = 3;
                  const sorted = [...variants].sort((a, b) => a.stock - b.stock);
                  const totalFromVariants = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
                  const totalDisplay = totalFromVariants > 0 ? totalFromVariants : entry.totalTalla;
                  const fallbackColor = colorLookup[`${entry.nombre}|${entry.talla}`] || colorLookup[nkey] || '#d1d5db';
                  return (
                    <div key={index} className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-orange-800">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{entry.nombre} - {entry.talla}</div>
                        <div className="text-xs text-orange-700">Total talla: {totalDisplay} uds</div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {sorted.length > 0 ? (
                          sorted.map((v, i) => {
                            const light = isLightColor(v.color);
                            return (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-white px-2 py-1 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white border border-gray-300">
                                    <span
                                      className="inline-block h-3.5 w-3.5 rounded-full border"
                                      style={{ backgroundColor: v.color, borderColor: light ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)' }}
                                    />
                                  </span>
                                  <span className="text-xs text-gray-800">{String(v.color).toUpperCase()}</span>
                                </div>
                                <span className={`text-xs font-semibold ${v.stock === 0 ? 'text-red-600' : v.stock <= LOW_STOCK ? 'text-orange-600' : 'text-gray-700'}`}>
                                  {v.stock === 0 ? 'Sin stock' : `Stock: ${v.stock}`}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <span className="inline-block h-3.5 w-3.5 rounded-full border border-gray-300" style={{ backgroundColor: fallbackColor }} />
                            <span>{String(fallbackColor).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GRÁFICO DE VENTAS POR DÍA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ventas de los Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.ventas_por_dia.map((venta, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{new Date(venta.fecha).toLocaleDateString('es-CO')}</p>
                    <p className="text-sm text-gray-600">{venta.cantidad_ventas} ventas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCOP(venta.monto_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* TOP PRODUCTOS VENDIDOS */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Talla</TableCell>
                  <TableCell>Color</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Monto</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.top_productos_vendidos.map((producto, index) => {
                  const key = `${String(producto.nombre_producto)}|${String(producto.talla)}`;
                  const color = producto.color || colorLookup[key] || null;
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{producto.nombre_producto}</TableCell>
                      <TableCell>
                        <Badge variant="light" color="dark">{producto.talla}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {color ? (
                            <span
                              className="inline-block h-4 w-4 rounded-full border border-gray-300 ring-2 ring-gray-200"
                              style={{ backgroundColor: color }}
                              aria-label={color}
                              title={color}
                            />
                          ) : (
                            <span className="inline-block h-4 w-4 rounded-full bg-gray-300" />
                          )}
                          <span className="text-xs text-gray-700">{(color || 'N/A').toString().toUpperCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell>{producto.cantidad_vendida}</TableCell>
                      <TableCell className="text-green-600 font-semibold">{formatCOP(producto.monto_total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* MÉTRICAS ADICIONALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Promedio de Venta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCOP(dashboardData.ventas.promedio_venta)}</div>
            <p className="text-xs text-muted-foreground">Por transacción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ventas Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardData.ventas.ventas_completadas}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.ventas.ventas_anuladas} anuladas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Productos Sin Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dashboardData.productos.productos_sin_stock}
            </div>
            <p className="text-xs text-muted-foreground">Requieren reposición</p>
          </CardContent>
        </Card>
      </div>

      
    </div>
  );
}
