import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    obtenerCatalogosVentas,
    obtenerInventarioPorJornada,
    buscarProductoPorCodigo,
    registrarVenta
} from '../api/ventas.api';

import EscanerQrModal from '../components/qr/EscanerQrModal';

const pagoInicial = {
    id_metodo_pago: '',
    monto: '',
    referencia: ''
};

function Ventas() {
    const [jornadas, setJornadas] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [idJornada, setIdJornada] = useState('');

    const [inventario, setInventario] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [pagos, setPagos] = useState([pagoInicial]);
    const [observaciones, setObservaciones] = useState('');
    const [codigoManual, setCodigoManual] = useState('');
    const [scannerAbierto, setScannerAbierto] = useState(false);
    const [buscandoCodigo, setBuscandoCodigo] = useState(false);

    const [cargando, setCargando] = useState(true);
    const [cargandoInventario, setCargandoInventario] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('success');

    const totalVenta = useMemo(() => {
        return carrito.reduce((suma, item) => {
            return suma + Number(item.cantidad || 0) * Number(item.precio_unitario_venta || 0);
        }, 0);
    }, [carrito]);

    const totalPagos = useMemo(() => {
        return pagos.reduce((suma, item) => {
            return suma + Number(item.monto || 0);
        }, 0);
    }, [pagos]);

    const diferencia = totalVenta - totalPagos;

    useEffect(() => {
        cargarCatalogos();
    }, []);

    async function cargarCatalogos() {
        try {
            setCargando(true);
            setMensaje('');

            const data = await obtenerCatalogosVentas();

            setJornadas(data.jornadas || []);
            setMetodosPago(data.metodosPago || []);

        } catch (error) {
            console.error('Error al cargar catálogos de venta:', error);
            mostrarMensaje('danger', error.message || 'No se pudieron cargar las jornadas.');

        } finally {
            setCargando(false);
        }
    }

    async function cargarInventarioJornada(id) {
        try {
            setCargandoInventario(true);
            setMensaje('');
            setInventario([]);
            setCarrito([]);

            if (!id) {
                return;
            }

            const data = await obtenerInventarioPorJornada(id);

            setInventario(data.inventario || []);

        } catch (error) {
            console.error('Error al cargar inventario de jornada:', error);
            mostrarMensaje('danger', error.message || 'No se pudo cargar el inventario de la jornada.');

        } finally {
            setCargandoInventario(false);
        }
    }

    function handleJornadaChange(event) {
        const valor = event.target.value;

        setIdJornada(valor);
        setCodigoManual('');
        setScannerAbierto(false);
        cargarInventarioJornada(valor);
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

    const agregarProducto = useCallback((producto) => {
        setMensaje('');

        setCarrito((prev) => {
            const existe = prev.find((item) => item.id_inventario_puesto === producto.id_inventario_puesto);

            if (existe) {
                return prev.map((item) => {
                    if (item.id_inventario_puesto !== producto.id_inventario_puesto) {
                        return item;
                    }

                    const nuevaCantidad = Number(item.cantidad) + 1;

                    if (nuevaCantidad > Number(producto.cantidad_disponible)) {
                        mostrarMensaje('danger', 'No hay más piezas disponibles de ese producto.');
                        return item;
                    }

                    return {
                        ...item,
                        cantidad: nuevaCantidad
                    };
                });
            }

            return [
                ...prev,
                {
                    ...producto,
                    cantidad: 1,
                    precio_unitario_venta: Number(producto.precio_venta_sugerido || 0)
                }
            ];
        });
    }, []);

    const procesarCodigoQr = useCallback(async (codigo) => {
        if (!idJornada) {
            throw new Error('Selecciona una jornada antes de escanear.');
        }

        const codigoLimpio = String(codigo || '').trim().toUpperCase();

        if (!codigoLimpio) {
            throw new Error('Escribe o escanea un código válido.');
        }

        try {
            setBuscandoCodigo(true);
            setMensaje('');

            const respuesta = await buscarProductoPorCodigo(
                idJornada,
                codigoLimpio
            );

            agregarProducto(respuesta.producto);
            setCodigoManual('');

            mostrarMensaje(
                'success',
                respuesta.mensaje ||
                `${respuesta.producto?.producto || 'Producto'} agregado al carrito.`
            );

            return respuesta.producto;
        } catch (error) {
            mostrarMensaje(
                'danger',
                error.message || 'No se pudo procesar el código QR.'
            );
            throw error;
        } finally {
            setBuscandoCodigo(false);
        }
    }, [agregarProducto, idJornada]);

    async function handleCodigoManual(event) {
        event.preventDefault();

        try {
            await procesarCodigoQr(codigoManual);
        } catch {
            // El mensaje ya se muestra dentro de procesarCodigoQr.
        }
    }

    function abrirScanner() {
        if (!idJornada) {
            mostrarMensaje('danger', 'Selecciona una jornada antes de escanear.');
            return;
        }

        setScannerAbierto(true);
    }

    function quitarProducto(idInventario) {
        setCarrito((prev) => prev.filter((item) => item.id_inventario_puesto !== idInventario));
    }

    function actualizarCantidad(idInventario, valor) {
        setCarrito((prev) =>
            prev.map((item) => {
                if (item.id_inventario_puesto !== idInventario) {
                    return item;
                }

                let cantidad = Number(valor);

                if (cantidad < 1) {
                    cantidad = 1;
                }

                if (cantidad > Number(item.cantidad_disponible)) {
                    cantidad = Number(item.cantidad_disponible);
                    mostrarMensaje('danger', `Solo hay ${item.cantidad_disponible} piezas disponibles.`);
                }

                return {
                    ...item,
                    cantidad
                };
            })
        );
    }

    function actualizarPrecio(idInventario, valor) {
        setCarrito((prev) =>
            prev.map((item) => {
                if (item.id_inventario_puesto !== idInventario) {
                    return item;
                }

                return {
                    ...item,
                    precio_unitario_venta: Number(valor || 0)
                };
            })
        );
    }

    function actualizarPago(indice, campo, valor) {
        setPagos((prev) =>
            prev.map((item, index) => {
                if (index !== indice) {
                    return item;
                }

                return {
                    ...item,
                    [campo]: valor
                };
            })
        );
    }

    function agregarPago() {
        setPagos((prev) => [
            ...prev,
            {
                id_metodo_pago: '',
                monto: '',
                referencia: ''
            }
        ]);
    }

    function quitarPago(indice) {
        setPagos((prev) => {
            if (prev.length === 1) {
                return [pagoInicial];
            }

            return prev.filter((_, index) => index !== indice);
        });
    }

    function igualarPagoAlTotal() {
        setPagos((prev) => {
            const primerMetodo = prev[0]?.id_metodo_pago || '';

            return [
                {
                    id_metodo_pago: primerMetodo,
                    monto: totalVenta.toFixed(2),
                    referencia: prev[0]?.referencia || ''
                }
            ];
        });
    }

    function obtenerMetodoPago(idMetodoPago) {
        return metodosPago.find((metodo) => metodo.id_metodo_pago === idMetodoPago);
    }

    async function handleRegistrarVenta() {
        try {
            setGuardando(true);
            setMensaje('');

            if (!idJornada) {
                mostrarMensaje('danger', 'Selecciona una jornada.');
                return;
            }

            if (carrito.length === 0) {
                mostrarMensaje('danger', 'Agrega al menos un producto al carrito.');
                return;
            }

            if (totalVenta <= 0) {
                mostrarMensaje('danger', 'El total de la venta debe ser mayor a 0.');
                return;
            }

            const pagosValidos = pagos
                .filter((pago) => pago.id_metodo_pago && Number(pago.monto) > 0)
                .map((pago) => {
                    const metodo = obtenerMetodoPago(pago.id_metodo_pago);

                    return {
                        id_metodo_pago: pago.id_metodo_pago,
                        codigo: metodo?.codigo || '',
                        monto: Number(pago.monto),
                        referencia: pago.referencia || null
                    };
                });

            if (pagosValidos.length === 0) {
                mostrarMensaje('danger', 'Agrega al menos un método de pago.');
                return;
            }

            const sumaPagos = pagosValidos.reduce((suma, pago) => suma + Number(pago.monto || 0), 0);

            if (Math.abs(totalVenta - sumaPagos) > 0.01) {
                mostrarMensaje(
                    'danger',
                    `El total de pagos ${formatoMoneda(sumaPagos)} no coincide con el total de venta ${formatoMoneda(totalVenta)}.`
                );
                return;
            }

            const productosEnviar = carrito.map((item) => ({
                id_inventario_puesto: item.id_inventario_puesto,
                cantidad: Number(item.cantidad),
                precio_unitario_venta: Number(item.precio_unitario_venta)
            }));

            const confirmar = confirm(
                `¿Confirmas registrar esta venta?\n\nTotal: ${formatoMoneda(totalVenta)}`
            );

            if (!confirmar) {
                return;
            }

            const respuesta = await registrarVenta({
                id_jornada: idJornada,
                productos: productosEnviar,
                pagos: pagosValidos,
                observaciones: observaciones.trim() || null
            });

            mostrarMensaje('success', respuesta.mensaje || 'Venta registrada correctamente.');

            setCarrito([]);
            setPagos([pagoInicial]);
            setObservaciones('');

            await cargarInventarioJornada(idJornada);

        } catch (error) {
            console.error('Error al registrar venta:', error);
            mostrarMensaje('danger', error.message || 'No se pudo registrar la venta.');

        } finally {
            setGuardando(false);
        }
    }

    return (
        <section>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Ventas</h1>
                    <p className="mt-2 text-slate-400">
                        Registro de ventas por jornada con carrito y métodos de pago.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarCatalogos}
                    disabled={guardando}
                    className="rounded-xl border border-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-60"
                >
                    Recargar jornadas
                </button>
            </div>

            {mensaje && (
                <div
                    className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${tipoMensaje === 'success'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-red-500 bg-red-500/10 text-red-300'
                        }`}
                >
                    {mensaje}
                </div>
            )}

            <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <label className="mb-2 block text-sm text-slate-300">Jornada abierta</label>
                        <select
                            value={idJornada}
                            onChange={handleJornadaChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        >
                            <option value="">Selecciona una jornada</option>
                            {jornadas.map((jornada) => (
                                <option key={jornada.id_jornada} value={jornada.id_jornada}>
                                    {jornada.nombre_jornada} | {jornada.puesto} | {jornada.fecha_base}
                                </option>
                            ))}
                        </select>

                        {jornadas.length === 0 && !cargando && (
                            <p className="mt-3 text-sm text-yellow-300">
                                No hay jornadas abiertas. Primero abre una jornada para poder vender.
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-sm text-slate-400">Total de venta</p>
                        <p className="mt-2 text-3xl font-bold text-emerald-400">
                            {formatoMoneda(totalVenta)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-8 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                            Venta rápida
                        </p>
                        <h2 className="mt-2 text-xl font-bold text-white">
                            Agregar producto mediante código QR
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                            Cada lectura agrega una unidad. El sistema valida la jornada,
                            el puesto y la existencia disponible.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={abrirScanner}
                        disabled={!idJornada || guardando || buscandoCodigo}
                        className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Abrir cámara y escanear
                    </button>
                </div>

                <form
                    onSubmit={handleCodigoManual}
                    className="mt-5 flex flex-col gap-3 sm:flex-row"
                >
                    <input
                        type="text"
                        value={codigoManual}
                        disabled={!idJornada || buscandoCodigo}
                        onChange={(event) =>
                            setCodigoManual(event.target.value.toUpperCase())
                        }
                        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono uppercase text-white outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                        placeholder="JF-L-000001"
                        autoComplete="off"
                    />

                    <button
                        type="submit"
                        disabled={!idJornada || !codigoManual.trim() || buscandoCodigo}
                        className="rounded-xl border border-cyan-400 px-5 py-3 font-bold text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {buscandoCodigo ? 'Buscando...' : 'Agregar código'}
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <h2 className="mb-5 text-xl font-bold text-white">Productos disponibles</h2>

                    {cargando || cargandoInventario ? (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-300">
                            Cargando productos...
                        </div>
                    ) : !idJornada ? (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">
                            Selecciona una jornada para ver productos disponibles.
                        </div>
                    ) : inventario.length === 0 ? (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">
                            No hay productos disponibles para esta jornada.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {inventario.map((item) => (
                                <article
                                    key={item.id_inventario_puesto}
                                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                                >
                                    <div className="flex gap-4">
                                        {item.foto_url ? (
                                            <img
                                                src={item.foto_url}
                                                alt={item.producto}
                                                className="h-20 w-20 rounded-xl border border-slate-700 object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-slate-700 text-center text-[11px] text-slate-500">
                                                Sin foto
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-white">
                                                {item.producto}
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-400">
                                                Propietario: {item.propietario}
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Disponible: {item.cantidad_disponible}
                                            </p>

                                            {item.codigo_interno && (
                                                <p className="mt-1 font-mono text-xs text-cyan-300">
                                                    {item.codigo_interno}
                                                </p>
                                            )}

                                            <p className="mt-2 font-bold text-emerald-400">
                                                {formatoMoneda(item.precio_venta_sugerido)}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => agregarProducto(item)}
                                        disabled={guardando}
                                        className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                                    >
                                        Agregar al carrito
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Carrito</h2>

                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-400">
                                {carrito.length} producto(s)
                            </span>
                        </div>

                        {carrito.length === 0 ? (
                            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-slate-400">
                                Todavía no hay productos en el carrito.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {carrito.map((item) => (
                                    <article
                                        key={item.id_inventario_puesto}
                                        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                                    >
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                {item.foto_url ? (
                                                    <img
                                                        src={item.foto_url}
                                                        alt={item.producto}
                                                        className="h-16 w-16 rounded-xl border border-slate-700 object-cover"
                                                    />
                                                ) : (
                                                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-slate-700 text-center text-[11px] text-slate-500">
                                                        Sin foto
                                                    </div>
                                                )}

                                                <div>
                                                    <h3 className="font-bold text-white">
                                                        {item.producto}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">
                                                        Disponible: {item.cantidad_disponible}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => quitarProducto(item.id_inventario_puesto)}
                                                className="rounded-lg border border-red-500 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
                                            >
                                                Quitar
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1 block text-xs text-slate-400">
                                                    Cantidad
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={item.cantidad_disponible}
                                                    value={item.cantidad}
                                                    onChange={(event) =>
                                                        actualizarCantidad(
                                                            item.id_inventario_puesto,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-xs text-slate-400">
                                                    Precio
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.precio_unitario_venta}
                                                    onChange={(event) =>
                                                        actualizarPrecio(
                                                            item.id_inventario_puesto,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                                                />
                                            </div>
                                        </div>

                                        <p className="mt-3 text-right font-bold text-emerald-400">
                                            Subtotal:{' '}
                                            {formatoMoneda(
                                                Number(item.cantidad) *
                                                Number(item.precio_unitario_venta)
                                            )}
                                        </p>
                                    </article>
                                ))}

                                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-right">
                                    <p className="text-sm text-emerald-300">Total</p>
                                    <p className="text-2xl font-bold text-emerald-400">
                                        {formatoMoneda(totalVenta)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-xl font-bold text-white">Métodos de pago</h2>

                            <button
                                type="button"
                                onClick={igualarPagoAlTotal}
                                disabled={carrito.length === 0}
                                className="rounded-lg border border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-60"
                            >
                                Igualar al total
                            </button>
                        </div>

                        <div className="space-y-4">
                            {pagos.map((pago, index) => (
                                <article
                                    key={index}
                                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                                >
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="mb-1 block text-xs text-slate-400">
                                                Método de pago
                                            </label>
                                            <select
                                                value={pago.id_metodo_pago}
                                                onChange={(event) =>
                                                    actualizarPago(index, 'id_metodo_pago', event.target.value)
                                                }
                                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                                            >
                                                <option value="">Selecciona método</option>
                                                {metodosPago.map((metodo) => (
                                                    <option
                                                        key={metodo.id_metodo_pago}
                                                        value={metodo.id_metodo_pago}
                                                    >
                                                        {metodo.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs text-slate-400">
                                                Monto
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={pago.monto}
                                                onChange={(event) =>
                                                    actualizarPago(index, 'monto', event.target.value)
                                                }
                                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs text-slate-400">
                                                Referencia
                                            </label>
                                            <input
                                                type="text"
                                                value={pago.referencia}
                                                onChange={(event) =>
                                                    actualizarPago(index, 'referencia', event.target.value)
                                                }
                                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-emerald-500"
                                                placeholder="Opcional"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => quitarPago(index)}
                                            className="rounded-lg border border-red-500 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
                                        >
                                            Quitar pago
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={agregarPago}
                            className="mt-4 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                        >
                            Agregar otro pago
                        </button>

                        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Total venta</span>
                                <span className="font-bold text-white">{formatoMoneda(totalVenta)}</span>
                            </div>

                            <div className="mt-2 flex justify-between text-sm">
                                <span className="text-slate-400">Total pagos</span>
                                <span className="font-bold text-white">{formatoMoneda(totalPagos)}</span>
                            </div>

                            <div className="mt-2 flex justify-between text-sm">
                                <span className="text-slate-400">Diferencia</span>
                                <span
                                    className={`font-bold ${Math.abs(diferencia) <= 0.01
                                            ? 'text-emerald-400'
                                            : 'text-red-400'
                                        }`}
                                >
                                    {formatoMoneda(diferencia)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <label className="mb-2 block text-sm text-slate-300">
                            Observaciones
                        </label>

                        <textarea
                            value={observaciones}
                            onChange={(event) => setObservaciones(event.target.value)}
                            className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Opcional"
                        />

                        <button
                            type="button"
                            onClick={handleRegistrarVenta}
                            disabled={guardando || carrito.length === 0}
                            className="mt-5 w-full rounded-xl bg-emerald-500 px-6 py-4 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                            {guardando ? 'Registrando venta...' : 'Registrar venta'}
                        </button>
                    </div>
                </div>
            </div>

            <EscanerQrModal
                abierto={scannerAbierto}
                procesando={buscandoCodigo}
                onCodigo={procesarCodigoQr}
                onCerrar={() => setScannerAbierto(false)}
            />
        </section>
    );
}

export default Ventas;