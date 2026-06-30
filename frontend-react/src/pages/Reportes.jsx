import { useEffect, useState } from 'react';
import { obtenerResumenReportes } from '../api/reportes.api';

function fechaHoy() {
    const fecha = new Date();
    return fecha.toISOString().split('T')[0];
}

function fechaHaceDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha.toISOString().split('T')[0];
}

function Reportes() {
    const [fechaInicio, setFechaInicio] = useState(fechaHaceDias(7));
    const [fechaFin, setFechaFin] = useState(fechaHoy());

    const [resumen, setResumen] = useState(null);
    const [porPuesto, setPorPuesto] = useState([]);
    const [porPropietario, setPorPropietario] = useState([]);
    const [porVendedor, setPorVendedor] = useState([]);
    const [porMetodoPago, setPorMetodoPago] = useState([]);
    const [productosTop, setProductosTop] = useState([]);
    const [detalleVentas, setDetalleVentas] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('success');

    useEffect(() => {
        cargarReportes();
    }, []);

    async function cargarReportes() {
        try {
            setCargando(true);
            setMensaje('');

            if (!fechaInicio) {
                mostrarMensaje('danger', 'Selecciona la fecha inicial.');
                return;
            }

            if (!fechaFin) {
                mostrarMensaje('danger', 'Selecciona la fecha final.');
                return;
            }

            if (fechaFin < fechaInicio) {
                mostrarMensaje('danger', 'La fecha final no puede ser menor a la fecha inicial.');
                return;
            }

            const data = await obtenerResumenReportes({
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            });

            setResumen(data.resumen || null);
            setPorPuesto(data.porPuesto || []);
            setPorPropietario(data.porPropietario || []);
            setPorVendedor(data.porVendedor || []);
            setPorMetodoPago(data.porMetodoPago || []);
            setProductosTop(data.productosTop || []);
            setDetalleVentas(data.detalleVentas || []);

        } catch (error) {
            console.error('Error al cargar reportes:', error);
            mostrarMensaje('danger', error.message || 'No se pudieron cargar los reportes.');

        } finally {
            setCargando(false);
        }
    }

    function mostrarMensaje(tipo, texto) {
        setTipoMensaje(tipo);
        setMensaje(texto);
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

    function formatoFechaHora(fecha) {
        if (!fecha) {
            return '-';
        }

        return new Date(fecha).toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function obtenerValor(item, campos, valorDefault = 0) {
        for (const campo of campos) {
            if (item[campo] !== undefined && item[campo] !== null) {
                return item[campo];
            }
        }

        return valorDefault;
    }

    return (
        <section>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Reportes</h1>
                    <p className="mt-2 text-slate-400">
                        Resumen de ventas, ganancias, propietarios, vendedores y productos vendidos.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarReportes}
                    disabled={cargando}
                    className="rounded-xl border border-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-60"
                >
                    Actualizar reporte
                </button>
            </div>

            {mensaje && (
                <div
                    className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
                        tipoMensaje === 'success'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-red-500 bg-red-500/10 text-red-300'
                    }`}
                >
                    {mensaje}
                </div>
            )}

            <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-5 text-xl font-bold text-white">Filtros</h2>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Fecha inicial</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(event) => setFechaInicio(event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Fecha final</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(event) => setFechaFin(event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={cargarReportes}
                            disabled={cargando}
                            className="w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                            {cargando ? 'Consultando...' : 'Consultar'}
                        </button>
                    </div>
                </div>
            </div>

            {cargando ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
                    Cargando reportes...
                </div>
            ) : (
                <>
                    <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <TarjetaResumen
                            titulo="Ventas registradas"
                            valor={formatoNumero(resumen?.total_ventas || resumen?.ventas || 0)}
                            subtitulo="Total de operaciones"
                        />

                        <TarjetaResumen
                            titulo="Total vendido"
                            valor={formatoMoneda(resumen?.monto_total || resumen?.total_vendido || 0)}
                            subtitulo="Ingresos por venta"
                        />

                        <TarjetaResumen
                            titulo="Costo total"
                            valor={formatoMoneda(resumen?.costo_total || 0)}
                            subtitulo="Costo de mercancía"
                        />

                        <TarjetaResumen
                            titulo="Ganancia estimada"
                            valor={formatoMoneda(resumen?.ganancia_total || resumen?.ganancia || 0)}
                            subtitulo="Venta menos costo"
                        />
                    </div>

                    <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
                        <TablaSimple
                            titulo="Ventas por puesto"
                            columnas={['Puesto', 'Ventas', 'Total', 'Ganancia']}
                            datos={porPuesto}
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4 font-semibold text-white">
                                        {item.puesto || item.nombre_puesto || 'Sin puesto'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoNumero(obtenerValor(item, ['ventas', 'total_ventas', 'cantidad_ventas']))}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoMoneda(obtenerValor(item, ['total', 'monto_total', 'total_vendido']))}
                                    </td>
                                    <td className="px-5 py-4 text-emerald-400 font-bold">
                                        {formatoMoneda(obtenerValor(item, ['ganancia', 'ganancia_total']))}
                                    </td>
                                </tr>
                            )}
                        />

                        <TablaSimple
                            titulo="Ganancia por propietario"
                            columnas={['Propietario', 'Piezas', 'Total', 'Ganancia']}
                            datos={porPropietario}
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4 font-semibold text-white">
                                        {item.propietario || item.nombre_propietario || 'Sin propietario'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoNumero(obtenerValor(item, ['piezas', 'cantidad', 'cantidad_vendida']))}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoMoneda(obtenerValor(item, ['total', 'monto_total', 'total_vendido']))}
                                    </td>
                                    <td className="px-5 py-4 text-emerald-400 font-bold">
                                        {formatoMoneda(obtenerValor(item, ['ganancia', 'ganancia_total']))}
                                    </td>
                                </tr>
                            )}
                        />

                        <TablaSimple
                            titulo="Ventas por vendedor"
                            columnas={['Vendedor', 'Ventas', 'Total', 'Ganancia']}
                            datos={porVendedor}
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4 font-semibold text-white">
                                        {item.vendedor || item.nombre_vendedor || 'Sin vendedor'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoNumero(obtenerValor(item, ['ventas', 'total_ventas', 'cantidad_ventas']))}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoMoneda(obtenerValor(item, ['total', 'monto_total', 'total_vendido']))}
                                    </td>
                                    <td className="px-5 py-4 text-emerald-400 font-bold">
                                        {formatoMoneda(obtenerValor(item, ['ganancia', 'ganancia_total']))}
                                    </td>
                                </tr>
                            )}
                        />

                        <TablaSimple
                            titulo="Métodos de pago"
                            columnas={['Método', 'Pagos', 'Total']}
                            datos={porMetodoPago}
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4 font-semibold text-white">
                                        {item.metodo_pago || item.metodo || item.nombre || 'Sin método'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoNumero(obtenerValor(item, ['pagos', 'cantidad_pagos', 'total_pagos']))}
                                    </td>
                                    <td className="px-5 py-4 text-emerald-400 font-bold">
                                        {formatoMoneda(obtenerValor(item, ['total', 'monto_total', 'total_pagado']))}
                                    </td>
                                </tr>
                            )}
                        />
                    </div>

                    <TablaSimple
                        titulo="Productos más vendidos"
                        columnas={['Producto', 'Propietario', 'Piezas', 'Total vendido', 'Ganancia']}
                        datos={productosTop}
                        renderFila={(item, index) => (
                            <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        {item.foto_url ? (
                                            <img
                                                src={item.foto_url}
                                                alt={item.producto}
                                                className="h-14 w-14 rounded-xl border border-slate-700 object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-slate-700 text-[10px] text-slate-500">
                                                Sin foto
                                            </div>
                                        )}

                                        <div>
                                            <p className="font-semibold text-white">
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

                                <td className="px-5 py-4">
                                    {formatoNumero(obtenerValor(item, ['piezas', 'cantidad_vendida', 'cantidad']))}
                                </td>

                                <td className="px-5 py-4">
                                    {formatoMoneda(obtenerValor(item, ['total', 'total_vendido', 'monto_total']))}
                                </td>

                                <td className="px-5 py-4 text-emerald-400 font-bold">
                                    {formatoMoneda(obtenerValor(item, ['ganancia', 'ganancia_total']))}
                                </td>
                            </tr>
                        )}
                    />

                    <div className="mt-8">
                        <TablaSimple
                            titulo="Detalle de juguetes vendidos"
                            columnas={[
                                'Foto',
                                'Producto',
                                'Propietario',
                                'Vendedor',
                                'Puesto',
                                'Categoría',
                                'Fecha y hora',
                                'Cantidad'
                            ]}
                            datos={detalleVentas}
                            minWidth="min-w-[1300px]"
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4">
                                        {item.foto_url ? (
                                            <img
                                                src={item.foto_url}
                                                alt={item.producto}
                                                className="h-16 w-16 rounded-xl border border-slate-700 object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-slate-700 text-[11px] text-slate-500">
                                                Sin foto
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-5 py-4">
                                        <p className="font-semibold text-white">
                                            {item.producto || 'Sin producto'}
                                        </p>
                                        <p className="max-w-xs text-xs text-slate-500">
                                            {item.descripcion || 'Sin descripción'}
                                        </p>
                                    </td>

                                    <td className="px-5 py-4">
                                        {item.propietario || 'Sin propietario'}
                                    </td>

                                    <td className="px-5 py-4">
                                        {item.vendedor || 'Sin vendedor'}
                                    </td>

                                    <td className="px-5 py-4">
                                        {item.puesto || 'Sin puesto'}
                                    </td>

                                    <td className="px-5 py-4">
                                        {item.categoria || 'Sin categoría'}
                                    </td>

                                    <td className="px-5 py-4">
                                        {formatoFechaHora(item.fecha_venta)}
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-400">
                                            {formatoNumero(item.cantidad_vendida || item.cantidad || 0)}
                                        </span>
                                    </td>
                                </tr>
                            )}
                        />
                    </div>
                </>
            )}
        </section>
    );
}

function TarjetaResumen({ titulo, valor, subtitulo }) {
    return (
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">{titulo}</p>
            <h2 className="mt-2 text-2xl font-bold text-emerald-400">{valor}</h2>
            <p className="mt-2 text-xs text-slate-500">{subtitulo}</p>
        </article>
    );
}

function TablaSimple({ titulo, columnas, datos, renderFila, minWidth = 'min-w-[900px]' }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-6 py-5">
                <h2 className="text-xl font-bold text-white">{titulo}</h2>
            </div>

            <div className="overflow-x-auto">
                <table className={`w-full ${minWidth} text-left text-sm`}>
                    <thead className="bg-slate-950 text-slate-300">
                        <tr>
                            {columnas.map((columna) => (
                                <th key={columna} className="px-5 py-4">
                                    {columna}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                        {datos.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columnas.length}
                                    className="px-5 py-10 text-center text-slate-400"
                                >
                                    Sin información en este rango.
                                </td>
                            </tr>
                        ) : (
                            datos.map((item, index) => renderFila(item, index))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Reportes;