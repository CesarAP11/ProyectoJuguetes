import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const ID_LECTOR = 'lector-qr-juguetesfun';

function EscanerQrModal({ abierto, procesando, onCodigo, onCerrar }) {
    const lectorRef = useRef(null);
    const procesandoRef = useRef(false);
    const ultimoCodigoRef = useRef('');
    const ultimaDeteccionRef = useRef(0);
    const codigoFueraCamaraRef = useRef(true);

    const [estado, setEstado] = useState('Preparando cámara...');
    const [error, setError] = useState('');

    useEffect(() => {
        procesandoRef.current = Boolean(procesando);
    }, [procesando]);

    useEffect(() => {
        if (!abierto) {
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

                        if (!codigo || procesandoRef.current) {
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
                        setEstado(`Código leído: ${codigo}`);

                        try {
                            await onCodigo(codigo);

                            if (navigator.vibrate) {
                                navigator.vibrate(120);
                            }

                            setEstado('Producto agregado. Retira el QR y acerca el siguiente.');
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
                        if (
                            Date.now() - ultimaDeteccionRef.current > 700
                        ) {
                            codigoFueraCamaraRef.current = true;
                        }
                    }
                );

                if (!cancelado) {
                    setEstado('Cámara activa. Coloca el QR dentro del recuadro.');
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
                    if (lectorRef.current?.isScanning) {
                        await lectorRef.current.stop();
                    }

                    await lectorRef.current?.clear();
                } catch (errorDetener) {
                    console.warn('No se pudo limpiar completamente el lector QR:', errorDetener);
                } finally {
                    lectorRef.current = null;
                }
            };

            detener();
        };
    }, [abierto, onCodigo]);

    if (!abierto) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/90 p-4 backdrop-blur-sm">
            <section className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
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
                    <div id={ID_LECTOR} className="min-h-72 w-full" />
                </div>

                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                    {procesando ? 'Procesando producto...' : estado}
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <p className="mt-4 text-xs leading-5 text-slate-500">
                    Para escanear dos piezas del mismo lote, retira el QR de la cámara y vuelve a acercarlo. Cada lectura válida agrega una unidad al carrito.
                </p>
            </section>
        </div>
    );
}

export default EscanerQrModal;
