import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const ID_LECTOR = 'lector-qr-juguetesfun';

let contextoAudioQr = null;

function obtenerContextoAudio() {
    if (typeof window === 'undefined') {
        return null;
    }

    const AudioContexto = window.AudioContext || window.webkitAudioContext;

    if (!AudioContexto) {
        return null;
    }

    if (!contextoAudioQr || contextoAudioQr.state === 'closed') {
        contextoAudioQr = new AudioContexto();
    }

    return contextoAudioQr;
}

export function prepararSonidoQr() {
    try {
        const contexto = obtenerContextoAudio();

        if (!contexto) {
            return;
        }

        contexto.resume().catch(() => {});

        const oscilador = contexto.createOscillator();
        const ganancia = contexto.createGain();
        const ahora = contexto.currentTime;

        ganancia.gain.setValueAtTime(0.00001, ahora);
        oscilador.connect(ganancia);
        ganancia.connect(contexto.destination);
        oscilador.start(ahora);
        oscilador.stop(ahora + 0.02);
    } catch (error) {
        console.warn('No se pudo preparar el sonido del escáner QR:', error);
    }
}

async function reproducirSonidoCheck() {
    try {
        const contexto = obtenerContextoAudio();

        if (!contexto) {
            return;
        }

        if (contexto.state === 'suspended') {
            await contexto.resume();
        }

        const ahora = contexto.currentTime;
        const gananciaGeneral = contexto.createGain();

        gananciaGeneral.gain.setValueAtTime(0.0001, ahora);
        gananciaGeneral.gain.exponentialRampToValueAtTime(0.24, ahora + 0.012);
        gananciaGeneral.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.28);
        gananciaGeneral.connect(contexto.destination);

        const primerTono = contexto.createOscillator();
        primerTono.type = 'sine';
        primerTono.frequency.setValueAtTime(740, ahora);
        primerTono.connect(gananciaGeneral);
        primerTono.start(ahora);
        primerTono.stop(ahora + 0.11);

        const segundoTono = contexto.createOscillator();
        segundoTono.type = 'sine';
        segundoTono.frequency.setValueAtTime(1046, ahora + 0.1);
        segundoTono.connect(gananciaGeneral);
        segundoTono.start(ahora + 0.1);
        segundoTono.stop(ahora + 0.28);
    } catch (error) {
        console.warn('No se pudo reproducir el sonido de confirmación QR:', error);
    }
}

function formatoMoneda(valor) {
    return Number(valor || 0).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN'
    });
}

function EscanerQrModal({
    abierto,
    procesando,
    onCodigo,
    onAgregar,
    onIrAlCobro,
    onCerrar
}) {
    const lectorRef = useRef(null);
    const procesandoRef = useRef(false);
    const productoPendienteRef = useRef(false);
    const ultimoCodigoRef = useRef('');
    const ultimaDeteccionRef = useRef(0);
    const codigoFueraCamaraRef = useRef(true);

    const [estado, setEstado] = useState('Preparando cámara...');
    const [error, setError] = useState('');
    const [productoEncontrado, setProductoEncontrado] = useState(null);
    const [productoAgregado, setProductoAgregado] = useState(null);
    const [agregando, setAgregando] = useState(false);

    useEffect(() => {
        procesandoRef.current = Boolean(procesando);
    }, [procesando]);

    useEffect(() => {
        productoPendienteRef.current = Boolean(productoEncontrado);
    }, [productoEncontrado]);

    useEffect(() => {
        if (!abierto) {
            return;
        }

        setProductoEncontrado(null);
        setProductoAgregado(null);
        setAgregando(false);
        setError('');
        setEstado('Preparando cámara...');
        productoPendienteRef.current = false;
        procesandoRef.current = false;
        ultimoCodigoRef.current = '';
        ultimaDeteccionRef.current = 0;
        codigoFueraCamaraRef.current = true;
    }, [abierto]);

    useEffect(() => {
        if (!abierto || productoEncontrado || productoAgregado) {
            return undefined;
        }

        let cancelado = false;
        const lector = new Html5Qrcode(ID_LECTOR, false);
        lectorRef.current = lector;

        async function iniciar() {
            try {
                setError('');
                setEstado('Solicitando acceso a la cámara...');

                await lector.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1
                    },
                    async (textoDecodificado) => {
                        const ahora = Date.now();
                        const codigo = String(textoDecodificado || '')
                            .trim()
                            .toUpperCase();

                        ultimaDeteccionRef.current = ahora;

                        if (
                            !codigo ||
                            procesandoRef.current ||
                            productoPendienteRef.current
                        ) {
                            return;
                        }

                        if (
                            codigo === ultimoCodigoRef.current &&
                            !codigoFueraCamaraRef.current
                        ) {
                            return;
                        }

                        ultimoCodigoRef.current = codigo;
                        codigoFueraCamaraRef.current = false;
                        procesandoRef.current = true;
                        setError('');
                        setEstado(`Consultando producto: ${codigo}`);

                        try {
                            const producto = await onCodigo(codigo);

                            if (!producto) {
                                throw new Error(
                                    'No se recibió la información del producto.'
                                );
                            }

                            productoPendienteRef.current = true;
                            setProductoEncontrado(producto);
                            setEstado('Producto encontrado.');

                            reproducirSonidoCheck();

                            if (navigator.vibrate) {
                                navigator.vibrate([90, 45, 120]);
                            }
                        } catch (errorCodigo) {
                            setError(
                                errorCodigo.message ||
                                'No se pudo procesar el código leído.'
                            );
                            setEstado('Retira el QR e intenta nuevamente.');
                        } finally {
                            procesandoRef.current = false;
                        }
                    },
                    () => {
                        if (Date.now() - ultimaDeteccionRef.current > 700) {
                            codigoFueraCamaraRef.current = true;
                        }
                    }
                );

                if (!cancelado) {
                    setEstado(
                        'Cámara activa. Coloca el QR dentro del recuadro.'
                    );
                }
            } catch (errorCamara) {
                console.error('Error al iniciar cámara QR:', errorCamara);

                if (!cancelado) {
                    setError(
                        'No se pudo abrir la cámara. Revisa los permisos del navegador o usa la captura manual.'
                    );
                    setEstado('Cámara no disponible.');
                }
            }
        }

        iniciar();

        return () => {
            cancelado = true;

            const detener = async () => {
                try {
                    if (lectorRef.current === lector && lector.isScanning) {
                        await lector.stop();
                    }

                    await lector.clear();
                } catch (errorDetener) {
                    console.warn(
                        'No se pudo limpiar completamente el lector QR:',
                        errorDetener
                    );
                } finally {
                    if (lectorRef.current === lector) {
                        lectorRef.current = null;
                    }
                }
            };

            detener();
        };
    }, [abierto, onCodigo, productoAgregado, productoEncontrado]);

    async function agregarAlCarrito() {
        if (!productoEncontrado || agregando) {
            return;
        }

        try {
            setAgregando(true);
            setError('');

            const productoConfirmado = productoEncontrado;

            await onAgregar(productoConfirmado);

            setProductoEncontrado(null);
            setProductoAgregado(productoConfirmado);
            productoPendienteRef.current = true;
            setEstado('Producto agregado correctamente.');
        } catch (errorAgregar) {
            setError(
                errorAgregar.message ||
                'No se pudo agregar el producto al carrito.'
            );
        } finally {
            setAgregando(false);
        }
    }

    function escanearOtro() {
        setProductoEncontrado(null);
        setProductoAgregado(null);
        setError('');
        productoPendienteRef.current = false;
        ultimoCodigoRef.current = '';
        codigoFueraCamaraRef.current = true;
        setEstado('Preparando cámara para otro producto...');
    }

    function irAlCobro() {
        setProductoAgregado(null);
        setProductoEncontrado(null);
        productoPendienteRef.current = false;

        if (typeof onIrAlCobro === 'function') {
            onIrAlCobro();
            return;
        }

        onCerrar();
    }

    if (!abierto) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/90 p-4 backdrop-blur-sm">
            {productoAgregado ? (
                <section className="w-full max-w-xl">
                    <article className="overflow-hidden rounded-3xl border border-emerald-500/60 bg-slate-950 shadow-2xl">
                        <div className="border-b border-slate-800 p-5 text-center sm:p-7">
                            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-3xl font-black text-slate-950 shadow-lg shadow-emerald-500/20">
                                ✓
                            </div>

                            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                                Producto agregado
                            </p>

                            <h2 className="mt-2 text-2xl font-bold text-white">
                                {productoAgregado.producto}
                            </h2>

                            <p className="mt-2 text-sm text-slate-400">
                                Elige si deseas continuar escaneando o pasar directamente al cobro.
                            </p>
                        </div>

                        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                            <button
                                type="button"
                                onClick={escanearOtro}
                                className="rounded-xl border border-cyan-400 px-4 py-3 font-bold text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
                            >
                                Escanear otro
                            </button>

                            <button
                                type="button"
                                onClick={irAlCobro}
                                className="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-400"
                            >
                                Ir al cobro
                            </button>
                        </div>
                    </article>
                </section>
            ) : productoEncontrado ? (
                <section className="max-h-[94vh] w-full max-w-xl overflow-y-auto">
                    <article className="overflow-hidden rounded-3xl border border-emerald-500/50 bg-slate-950 shadow-2xl">
                        <div className="flex items-start gap-4 border-b border-slate-800 p-4 sm:p-5">
                            {productoEncontrado.foto_url ? (
                                <img
                                    src={productoEncontrado.foto_url}
                                    alt={productoEncontrado.producto}
                                    className="h-20 w-20 shrink-0 rounded-xl border border-slate-700 object-cover sm:h-24 sm:w-24"
                                />
                            ) : (
                                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-500 sm:h-24 sm:w-24">
                                    Sin foto
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                                    Producto encontrado
                                </p>
                                <h2 className="mt-1 break-words text-xl font-bold text-white sm:text-2xl">
                                    {productoEncontrado.producto}
                                </h2>
                                <p className="mt-1 break-all text-xs text-slate-500">
                                    {productoEncontrado.codigo_interno}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={onCerrar}
                                className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white sm:px-4 sm:text-sm"
                            >
                                Cerrar
                            </button>
                        </div>

                        <dl className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                                <dt className="text-xs uppercase tracking-wider text-slate-500">
                                    Propietario
                                </dt>
                                <dd className="mt-1 font-semibold text-white">
                                    {productoEncontrado.propietario}
                                </dd>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                                <dt className="text-xs uppercase tracking-wider text-slate-500">
                                    Stock disponible
                                </dt>
                                <dd className="mt-1 text-lg font-bold text-cyan-300">
                                    {productoEncontrado.cantidad_disponible} pieza(s)
                                </dd>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 sm:col-span-2">
                                <dt className="text-xs uppercase tracking-wider text-slate-500">
                                    Precio de venta
                                </dt>
                                <dd className="mt-1 text-2xl font-bold text-emerald-400">
                                    {formatoMoneda(
                                        productoEncontrado.precio_venta_sugerido
                                    )}
                                </dd>
                            </div>
                        </dl>

                        {error && (
                            <div className="mx-4 mb-4 rounded-xl border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:mx-5">
                                {error}
                            </div>
                        )}

                        <div className="grid gap-3 border-t border-slate-800 p-4 sm:grid-cols-2 sm:p-5">
                            <button
                                type="button"
                                onClick={escanearOtro}
                                disabled={agregando}
                                className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-60"
                            >
                                Escanear otro
                            </button>

                            <button
                                type="button"
                                onClick={agregarAlCarrito}
                                disabled={agregando}
                                className="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                            >
                                {agregando
                                    ? 'Agregando...'
                                    : 'Agregar al carrito'}
                            </button>
                        </div>
                    </article>
                </section>
            ) : (
                <section className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                                Cámara trasera
                            </p>
                            <h2 className="mt-2 text-2xl font-bold text-white">
                                Escanear producto
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={onCerrar}
                            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                        >
                            Cerrar
                        </button>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-black p-2">
                        <div id={ID_LECTOR} className="min-h-64 w-full" />
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                        {procesando ? 'Consultando producto...' : estado}
                    </div>

                    {error && (
                        <div className="mt-4 rounded-xl border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    <p className="mt-4 text-xs leading-5 text-slate-500">
                        Cuando el sistema encuentre un producto, la cámara se cerrará y aparecerán sus datos para que confirmes si deseas agregarlo al carrito.
                    </p>
                </section>
            )}
        </div>
    );
}

export default EscanerQrModal;
