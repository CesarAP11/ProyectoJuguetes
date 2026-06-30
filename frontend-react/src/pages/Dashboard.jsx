import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { obtenerResumenReportes } from '../api/reportes.api';
import { obtenerInventario } from '../api/productos.api';
import { obtenerJornadas } from '../api/jornadas.api';
import { useAuth } from '../context/AuthContext';

function fechaHoy() {
    return new Date().toISOString().slice(0, 10);
}

function formatoMoneda(valor) {
    return Number(valor || 0).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN'
    });
}

function formatoNumero(valor) {
    return Number(valor || 0).toLocaleString('es-MX');
}

function formatoFecha(fecha) {
    if (!fecha) {
        return '-';
    }

    return new Date(fecha).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatoFechaHora(fecha) {
    if (!fecha) {
        return '-';
    }

    return new Date(fecha).toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function Dashboard() {
    const { perfil } = useAuth();

    const [reporte, setReporte] = useState(null);
    const [inventario, setInventario] = useState([]);
    const [jornadas, setJornadas] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState('');

    const hoy = fechaHoy();

    useEffect(() => {
        cargarDashboard();
    }, []);

    async function cargarDashboard() {
        try {
            setCargando(true);
            setMensaje('');

            const [reporteData, inventarioData, jornadasData] = await Promise.all([
                obtenerResumenReportes({
                    fecha_inicio: hoy,
                    fecha_fin: hoy
                }),
                obtenerInventario(),
                obtenerJornadas()
            ]);

            setReporte(reporteData || null);
            setInventario(
                inventarioData.inventario ||
                inventarioData.productos ||
                inventarioData.data ||
                []
            );
            setJornadas(jornadasData.jornadas || []);

        } catch (error) {
            console.error('Error al cargar dashboard:', error);
            setMensaje(error.message || 'No se pudo cargar el dashboard.');

        } finally {
            setCargando(false);
        }
    }

    const resumen = reporte?.resumen || {};

    const productosTop = reporte?.productosTop || [];
    const detalleVentas = reporte?.detalleVentas || [];

    const inventarioActivo = useMemo(() => {
        return inventario.filter((item) => {
            const estado = String(item.estado || '').toLowerCase();
            return estado !== 'eliminado';
        });
    }, [inventario]);

    const inventarioBajo = useMemo(() => {
        return inventarioActivo
            .filter((item) => Number(item.cantidad_disponible || item.stock || item.cantidad || 0) <= 5)
            .sort((a, b) => {
                const cantidadA = Number(a.cantidad_disponible || a.stock || a.cantidad || 0);
                const cantidadB = Number(b.cantidad_disponible || b.stock || b.cantidad || 0);

                return cantidadA - cantidadB;
            })
            .slice(0, 6);
    }, [inventarioActivo]);

    const jornadasAbiertas = useMemo(() => {
        return jornadas
            .filter((jornada) => String(jornada.estado || '').toLowerCase() === 'abierta')
            .slice(0, 5);
    }, [jornadas]);

    const tarjetas = [
        {
            titulo: 'Ventas de hoy',
            valor: formatoNumero(resumen.total_ventas),
            descripcion: 'Operaciones registradas',
            variante: 'emerald'
        },
        {
            titulo: 'Total vendido',
            valor: formatoMoneda(resumen.monto_total),
            descripcion: 'Ingresos del día',
            variante: 'sky'
        },
        {
            titulo: 'Ganancia estimada',
            valor: formatoMoneda(resumen.ganancia_total),
            descripcion: 'Venta menos costo',
            variante: 'yellow'
        },
        {
            titulo: 'Piezas vendidas',
            valor: formatoNumero(resumen.piezas_vendidas),
            descripcion: 'Juguetes vendidos hoy',
            variante: 'purple'
        },
        {
            titulo: 'Inventario activo',
            valor: formatoNumero(inventarioActivo.length),
            descripcion: 'Productos disponibles',
            variante: 'emerald'
        },
        {
            titulo: 'Bajo stock',
            valor: formatoNumero(inventarioBajo.length),
            descripcion: 'Productos con 5 piezas o menos',
            variante: 'red'
        },
        {
            titulo: 'Jornadas abiertas',
            valor: formatoNumero(jornadasAbiertas.length),
            descripcion: 'Puestos trabajando',
            variante: 'sky'
        }
    ];

    return (
        <section>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
                        JuguetesFun
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                        Dashboard
                    </h1>

                    <p className="mt-2 text-slate-400">
                        Bienvenido, {perfil?.nombre_completo || perfil?.username || 'usuario'}.
                        Aquí tienes el resumen operativo del día.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                        to="/ventas"
                        className="rounded-xl bg-emerald-500 px-5 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                    >
                        Registrar venta
                    </Link>

                    <Link
                        to="/inventario"
                        className="rounded-xl border border-slate-700 px-5 py-3 text-center text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                        Ver inventario
                    </Link>

                    <button
                        type="button"
                        onClick={cargarDashboard}
                        disabled={cargando}
                        className="rounded-xl border border-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-60"
                    >
                        {cargando ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>
            </div>

            {mensaje && (
                <div className="mb-6 rounded-2xl border border-red-500 bg-red-500/10 px-5 py-4 text-sm text-red-300">
                    {mensaje}
                </div>
            )}

            {cargando ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
                    Cargando dashboard...
                </div>
            ) : (
                <>
                    <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {tarjetas.map((tarjeta) => (
                            <TarjetaResumen
                                key={tarjeta.titulo}
                                titulo={tarjeta.titulo}
                                valor={tarjeta.valor}
                                descripcion={tarjeta.descripcion}
                                variante={tarjeta.variante}
                            />
                        ))}
                    </div>

                    <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900">
                            <div className="border-b border-slate-800 px-6 py-5">
                                <h2 className="text-xl font-bold text-white">
                                    Productos más vendidos hoy
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Basado en las ventas registradas del día.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px] text-left text-sm">
                                    <thead className="bg-slate-950 text-slate-300">
                                        <tr>
                                            <th className="px-5 py-4">Producto</th>
                                            <th className="px-5 py-4">Propietario</th>
                                            <th className="px-5 py-4">Piezas</th>
                                            <th className="px-5 py-4">Total</th>
                                            <th className="px-5 py-4">Ganancia</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-800">
                                        {productosTop.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-5 py-10 text-center text-slate-400">
                                                    No hay productos vendidos hoy.
                                                </td>
                                            </tr>
                                        ) : (
                                            productosTop.slice(0, 5).map((item, index) => (
                                                <tr
                                                    key={`${item.id_producto || item.producto}-${index}`}
                                                    className="text-slate-300 transition hover:bg-slate-800/60"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {item.foto_url ? (
                                                                <img
                                                                    src={item.foto_url}
                                                                    alt={item.producto}
                                                                    className="h-14 w-14 rounded-xl border border-slate-700 object-cover"
                                                                />
                                                            ) : (
                                                                <div className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-slate-700 text-[11px] text-slate-500">
                                                                    Sin foto
                                                                </div>
                                                            )}

                                                            <div>
                                                                <p className="font-bold text-white">
                                                                    {item.producto || 'Sin producto'}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {item.categoria || 'Sin categoría'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        {item.propietario || 'Sin propietario'}
                                                    </td>

                                                    <td className="px-5 py-4 font-bold text-white">
                                                        {formatoNumero(item.piezas || item.cantidad_vendida)}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        {formatoMoneda(item.total_vendido || item.total)}
                                                    </td>

                                                    <td className="px-5 py-4 font-bold text-emerald-400">
                                                        {formatoMoneda(item.ganancia_total || item.ganancia)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900">
                            <div className="border-b border-slate-800 px-6 py-5">
                                <h2 className="text-xl font-bold text-white">
                                    Accesos rápidos
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Operaciones frecuentes.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 p-6">
                                <AccesoRapido
                                    titulo="Nueva venta"
                                    descripcion="Registrar una venta del día."
                                    ruta="/ventas"
                                />

                                <AccesoRapido
                                    titulo="Abrir jornada"
                                    descripcion="Crear una jornada por puesto."
                                    ruta="/jornadas"
                                />

                                <AccesoRapido
                                    titulo="Agregar inventario"
                                    descripcion="Registrar producto o resurtido."
                                    ruta="/inventario"
                                />

                                <AccesoRapido
                                    titulo="Hacer corte"
                                    descripcion="Registrar gastos y efectivo contado."
                                    ruta="/cortes"
                                />

                                <AccesoRapido
                                    titulo="Ver reportes"
                                    descripcion="Consultar ventas y ganancias."
                                    ruta="/reportes"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900">
                            <div className="border-b border-slate-800 px-6 py-5">
                                <h2 className="text-xl font-bold text-white">
                                    Inventario con bajo stock
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Productos con 5 piezas o menos.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px] text-left text-sm">
                                    <thead className="bg-slate-950 text-slate-300">
                                        <tr>
                                            <th className="px-5 py-4">Producto</th>
                                            <th className="px-5 py-4">Puesto</th>
                                            <th className="px-5 py-4">Propietario</th>
                                            <th className="px-5 py-4">Disponibles</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-800">
                                        {inventarioBajo.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-5 py-10 text-center text-slate-400">
                                                    No hay productos con bajo stock.
                                                </td>
                                            </tr>
                                        ) : (
                                            inventarioBajo.map((item) => {
                                                const disponibles = Number(
                                                    item.cantidad_disponible ||
                                                    item.stock ||
                                                    item.cantidad ||
                                                    0
                                                );

                                                return (
                                                    <tr
                                                        key={item.id_inventario_puesto || item.id_producto}
                                                        className="text-slate-300 transition hover:bg-slate-800/60"
                                                    >
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-3">
                                                                {item.foto_url ? (
                                                                    <img
                                                                        src={item.foto_url}
                                                                        alt={item.producto || item.nombre}
                                                                        className="h-12 w-12 rounded-xl border border-slate-700 object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="grid h-12 w-12 place-items-center rounded-xl border border-dashed border-slate-700 text-[10px] text-slate-500">
                                                                        Sin foto
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <p className="font-bold text-white">
                                                                        {item.producto || item.nombre || 'Sin producto'}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {item.categoria || 'Sin categoría'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            {item.puesto || item.nombre_puesto || 'Sin puesto'}
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            {item.propietario || item.nombre_propietario || 'Sin propietario'}
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <span
                                                                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                                                    disponibles <= 2
                                                                        ? 'border-red-500 bg-red-500/10 text-red-300'
                                                                        : 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                                                                }`}
                                                            >
                                                                {formatoNumero(disponibles)} piezas
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900">
                            <div className="border-b border-slate-800 px-6 py-5">
                                <h2 className="text-xl font-bold text-white">
                                    Últimas ventas de hoy
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Detalle reciente de juguetes vendidos.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px] text-left text-sm">
                                    <thead className="bg-slate-950 text-slate-300">
                                        <tr>
                                            <th className="px-5 py-4">Producto</th>
                                            <th className="px-5 py-4">Puesto</th>
                                            <th className="px-5 py-4">Fecha</th>
                                            <th className="px-5 py-4">Cantidad</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-800">
                                        {detalleVentas.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-5 py-10 text-center text-slate-400">
                                                    No hay ventas registradas hoy.
                                                </td>
                                            </tr>
                                        ) : (
                                            detalleVentas.slice(0, 6).map((item) => (
                                                <tr
                                                    key={item.id_detalle_venta}
                                                    className="text-slate-300 transition hover:bg-slate-800/60"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {item.foto_url ? (
                                                                <img
                                                                    src={item.foto_url}
                                                                    alt={item.producto}
                                                                    className="h-12 w-12 rounded-xl border border-slate-700 object-cover"
                                                                />
                                                            ) : (
                                                                <div className="grid h-12 w-12 place-items-center rounded-xl border border-dashed border-slate-700 text-[10px] text-slate-500">
                                                                    Sin foto
                                                                </div>
                                                            )}

                                                            <div>
                                                                <p className="font-bold text-white">
                                                                    {item.producto || 'Sin producto'}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {item.propietario || 'Sin propietario'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        {item.puesto || 'Sin puesto'}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        {formatoFechaHora(item.fecha_venta)}
                                                    </td>

                                                    <td className="px-5 py-4 font-bold text-white">
                                                        {formatoNumero(item.cantidad_vendida || item.cantidad)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {jornadasAbiertas.length > 0 && (
                        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
                            <div className="border-b border-slate-800 px-6 py-5">
                                <h2 className="text-xl font-bold text-white">
                                    Jornadas abiertas
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Jornadas que siguen activas.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                                {jornadasAbiertas.map((jornada) => (
                                    <article
                                        key={jornada.id_jornada}
                                        className="rounded-xl border border-slate-800 bg-slate-950 p-5"
                                    >
                                        <h3 className="font-bold text-white">
                                            {jornada.nombre_jornada || 'Sin jornada'}
                                        </h3>

                                        <p className="mt-2 text-sm text-slate-400">
                                            Puesto: {jornada.puesto || jornada.nombre_puesto || 'Sin puesto'}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-400">
                                            Fecha: {formatoFecha(jornada.fecha_base)}
                                        </p>

                                        <Link
                                            to="/cortes"
                                            className="mt-4 inline-block rounded-lg border border-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950"
                                        >
                                            Ir a corte
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function TarjetaResumen({ titulo, valor, descripcion, variante }) {
    const clases = {
        emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        sky: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
        yellow: 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10',
        purple: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
        red: 'text-red-300 border-red-500/30 bg-red-500/10'
    };

    return (
        <article className={`rounded-2xl border bg-slate-900 p-6 ${clases[variante] || clases.emerald}`}>
            <p className="text-sm text-slate-400">{titulo}</p>
            <h2 className="mt-3 text-3xl font-black text-white">
                {valor}
            </h2>
            <p className={`mt-2 text-sm font-semibold ${clases[variante]?.split(' ')[0] || 'text-emerald-400'}`}>
                {descripcion}
            </p>
        </article>
    );
}

function AccesoRapido({ titulo, descripcion, ruta }) {
    return (
        <Link
            to={ruta}
            className="group rounded-xl border border-slate-800 bg-slate-950 p-5 transition hover:border-emerald-500 hover:bg-slate-800"
        >
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-white group-hover:text-emerald-300">
                        {titulo}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        {descripcion}
                    </p>
                </div>

                <span className="text-xl text-emerald-400">
                    →
                </span>
            </div>
        </Link>
    );
}

export default Dashboard;