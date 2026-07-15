import { useEffect, useMemo, useState } from 'react';

import {
    obtenerJornadasParaCorte,
    obtenerResumenCorte,
    registrarGasto,
    eliminarGasto,
    guardarCorteCaja,
    modificarCorteCaja,
    obtenerHistorialCorte,
    descargarPdfCorte
} from '../api/cortes.api';

import { useAuth } from '../context/AuthContext';

const gastoInicial = {
    concepto: '',
    monto: ''
};

function Cortes() {
    const { perfil } = useAuth();

    const [jornadas, setJornadas] = useState([]);
    const [idJornada, setIdJornada] = useState('');

    const [resumen, setResumen] = useState(null);
    const [gastos, setGastos] = useState([]);
    const [historial, setHistorial] = useState([]);

    const [gasto, setGasto] = useState(gastoInicial);
    const [efectivoContado, setEfectivoContado] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [cerrarJornada, setCerrarJornada] = useState(false);
    const [motivoModificacion, setMotivoModificacion] = useState('');
    const [modoEdicion, setModoEdicion] = useState(false);

    const [cargando, setCargando] = useState(true);
    const [cargandoResumen, setCargandoResumen] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [accionando, setAccionando] = useState(false);
    const [generandoPdf, setGenerandoPdf] = useState(false);

    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('success');

    const esAdminPrincipal = Boolean(perfil?.es_admin_principal);
    const corteGuardado = Boolean(resumen?.corte_guardado && resumen?.corte);
    const corte = resumen?.corte || null;

    const totalVentas = Number(resumen?.total_ventas || 0);
    const totalEfectivo = Number(resumen?.total_efectivo || 0);
    const totalTransferencia = Number(resumen?.total_transferencia || 0);
    const totalTerminal = Number(resumen?.total_terminal || 0);
    const totalOtros = Number(resumen?.total_otros || 0);
    const gananciaBruta = Number(
        resumen?.ganancia_bruta ||
        resumen?.ganancia_total ||
        0
    );

    const totalGastos = useMemo(() => {
        return gastos.reduce(
            (suma, item) => suma + Number(item.monto || 0),
            0
        );
    }, [gastos]);

    const efectivoEsperado = corteGuardado
        ? Number(corte?.efectivo_esperado || 0)
        : totalEfectivo - totalGastos;

    const diferencia = Number(efectivoContado || 0) - efectivoEsperado;

    const gananciaNeta = corteGuardado
        ? Number(corte?.ganancia_neta || 0)
        : gananciaBruta - totalGastos;

    useEffect(() => {
        cargarJornadas();
    }, []);

    async function cargarJornadas() {
        try {
            setCargando(true);
            setMensaje('');

            const data = await obtenerJornadasParaCorte();
            setJornadas(data.jornadas || []);

        } catch (error) {
            console.error('Error al cargar jornadas para corte:', error);
            mostrarMensaje(
                'danger',
                error.message || 'No se pudieron cargar las jornadas.'
            );

        } finally {
            setCargando(false);
        }
    }

    async function cargarResumen(id) {
        try {
            setCargandoResumen(true);
            setMensaje('');
            setResumen(null);
            setGastos([]);
            setHistorial([]);
            setModoEdicion(false);
            setMotivoModificacion('');

            if (!id) {
                return;
            }

            const data = await obtenerResumenCorte(id);
            const resumenRecibido = data.resumen || data.corte || null;
            const corteRecibido = resumenRecibido?.corte || null;

            setResumen(resumenRecibido);
            setGastos(data.gastos || []);

            setEfectivoContado(
                corteRecibido
                    ? String(Number(corteRecibido.efectivo_contado || 0))
                    : ''
            );

            setObservaciones(corteRecibido?.observaciones || '');

            if (corteRecibido?.id_corte) {
                await cargarHistorial(corteRecibido.id_corte);
            }

        } catch (error) {
            console.error('Error al cargar resumen de corte:', error);
            mostrarMensaje(
                'danger',
                error.message || 'No se pudo cargar el resumen del corte.'
            );

        } finally {
            setCargandoResumen(false);
        }
    }

    async function cargarHistorial(idCorte) {
        try {
            const data = await obtenerHistorialCorte(idCorte);
            setHistorial(data.historial || []);
        } catch (error) {
            console.error('Error al cargar historial del corte:', error);
            setHistorial([]);
        }
    }

    function handleJornadaChange(event) {
        const valor = event.target.value;

        setIdJornada(valor);
        setEfectivoContado('');
        setObservaciones('');
        setCerrarJornada(false);
        setModoEdicion(false);
        setMotivoModificacion('');

        cargarResumen(valor);
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

    function formatoFecha(fecha) {
        if (!fecha) {
            return '-';
        }

        return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', {
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

    function handleGastoChange(event) {
        const { name, value } = event.target;

        setGasto((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    async function handleRegistrarGasto(event) {
        event.preventDefault();

        try {
            setAccionando(true);
            setMensaje('');

            if (corteGuardado) {
                mostrarMensaje(
                    'danger',
                    'La jornada ya tiene un corte. No se pueden registrar más gastos.'
                );
                return;
            }

            if (!idJornada) {
                mostrarMensaje('danger', 'Selecciona una jornada.');
                return;
            }

            if (!gasto.concepto.trim()) {
                mostrarMensaje('danger', 'Escribe el concepto del gasto.');
                return;
            }

            if (Number(gasto.monto) <= 0) {
                mostrarMensaje(
                    'danger',
                    'El monto del gasto debe ser mayor a 0.'
                );
                return;
            }

            const confirmar = confirm(
                `¿Confirmas registrar este gasto?\n\nConcepto: ${gasto.concepto}\nMonto: ${formatoMoneda(gasto.monto)}`
            );

            if (!confirmar) {
                return;
            }

            const respuesta = await registrarGasto({
                id_jornada: idJornada,
                concepto: gasto.concepto.trim(),
                monto: Number(gasto.monto)
            });

            mostrarMensaje(
                'success',
                respuesta.mensaje || 'Gasto registrado correctamente.'
            );

            setGasto(gastoInicial);
            await cargarResumen(idJornada);

        } catch (error) {
            console.error('Error al registrar gasto:', error);
            mostrarMensaje(
                'danger',
                error.message || 'No se pudo registrar el gasto.'
            );

        } finally {
            setAccionando(false);
        }
    }

    async function handleEliminarGasto(item) {
        try {
            if (corteGuardado) {
                mostrarMensaje(
                    'danger',
                    'La jornada ya tiene un corte. No se pueden eliminar gastos.'
                );
                return;
            }

            const confirmar = confirm(
                `¿Seguro que deseas eliminar este gasto?\n\nConcepto: ${item.concepto}\nMonto: ${formatoMoneda(item.monto)}`
            );

            if (!confirmar) {
                return;
            }

            setAccionando(true);
            setMensaje('');

            const respuesta = await eliminarGasto(item.id_gasto);

            mostrarMensaje(
                'success',
                respuesta.mensaje || 'Gasto eliminado correctamente.'
            );

            await cargarResumen(idJornada);

        } catch (error) {
            console.error('Error al eliminar gasto:', error);
            mostrarMensaje(
                'danger',
                error.message || 'No se pudo eliminar el gasto.'
            );

        } finally {
            setAccionando(false);
        }
    }

    async function handleGuardarCorte() {
        try {
            setGuardando(true);
            setMensaje('');

            if (corteGuardado) {
                mostrarMensaje(
                    'danger',
                    'Esta jornada ya cuenta con un corte de caja.'
                );
                return;
            }

            if (!idJornada) {
                mostrarMensaje('danger', 'Selecciona una jornada.');
                return;
            }

            if (efectivoContado === '' || Number(efectivoContado) < 0) {
                mostrarMensaje('danger', 'Ingresa el efectivo contado.');
                return;
            }

            const confirmar = confirm(
                `¿Confirmas guardar el corte de caja?\n\nTotal ventas: ${formatoMoneda(totalVentas)}\nEfectivo esperado: ${formatoMoneda(efectivoEsperado)}\nEfectivo contado: ${formatoMoneda(efectivoContado)}\nDiferencia: ${formatoMoneda(diferencia)}`
            );

            if (!confirmar) {
                return;
            }

            const respuesta = await guardarCorteCaja({
                id_jornada: idJornada,

                total_ventas: totalVentas,
                total_efectivo: totalEfectivo,
                total_transferencia: totalTransferencia,
                total_terminal: totalTerminal,
                total_otros: totalOtros,
                total_gastos: totalGastos,

                efectivo_esperado: efectivoEsperado,
                efectivo_contado: Number(efectivoContado),
                diferencia,
                ganancia_bruta: gananciaBruta,
                ganancia_neta: gananciaNeta,

                observaciones: observaciones.trim() || null,
                cerrar_jornada: cerrarJornada
            });

            mostrarMensaje(
                'success',
                respuesta.mensaje || 'Corte guardado correctamente.'
            );

            await cargarResumen(idJornada);
            await cargarJornadas();

        } catch (error) {
            console.error('Error al guardar corte:', error);

            mostrarMensaje(
                'danger',
                error.message || 'No se pudo guardar el corte.'
            );

            await cargarResumen(idJornada);

        } finally {
            setGuardando(false);
        }
    }

    async function handleModificarCorte() {
        try {
            if (!esAdminPrincipal) {
                mostrarMensaje(
                    'danger',
                    'Solo el administrador principal puede modificar el corte.'
                );
                return;
            }

            if (!corte?.id_corte) {
                mostrarMensaje('danger', 'No se encontró el corte guardado.');
                return;
            }

            if (!motivoModificacion.trim()) {
                mostrarMensaje(
                    'danger',
                    'Escribe el motivo de la modificación.'
                );
                return;
            }

            if (efectivoContado === '' || Number(efectivoContado) < 0) {
                mostrarMensaje('danger', 'Ingresa el efectivo contado.');
                return;
            }

            const confirmar = confirm(
                `¿Confirmas modificar este corte?\n\nEfectivo anterior: ${formatoMoneda(corte.efectivo_contado)}\nEfectivo nuevo: ${formatoMoneda(efectivoContado)}\nMotivo: ${motivoModificacion.trim()}`
            );

            if (!confirmar) {
                return;
            }

            setGuardando(true);
            setMensaje('');

            const respuesta = await modificarCorteCaja(corte.id_corte, {
                efectivo_contado: Number(efectivoContado),
                observaciones: observaciones.trim() || null,
                motivo: motivoModificacion.trim()
            });

            mostrarMensaje(
                'success',
                respuesta.mensaje || 'Corte modificado correctamente.'
            );

            setModoEdicion(false);
            setMotivoModificacion('');

            await cargarResumen(idJornada);

        } catch (error) {
            console.error('Error al modificar corte:', error);
            mostrarMensaje(
                'danger',
                error.message || 'No se pudo modificar el corte.'
            );

        } finally {
            setGuardando(false);
        }
    }

    async function handleDescargarPdf() {
        try {
            if (!corte?.id_corte) {
                mostrarMensaje('danger', 'No se encontró el corte guardado.');
                return;
            }

            setGenerandoPdf(true);
            setMensaje('');

            await descargarPdfCorte(corte.id_corte);

            mostrarMensaje(
                'success',
                'Reporte PDF generado correctamente.'
            );

        } catch (error) {
            console.error('Error al descargar PDF:', error);
            mostrarMensaje(
                'danger',
                error.message || 'No se pudo generar el PDF.'
            );

        } finally {
            setGenerandoPdf(false);
        }
    }

    return (
        <section>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Cortes</h1>
                    <p className="mt-2 text-slate-400">
                        Corte de caja por jornada, ventas, gastos y efectivo.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarJornadas}
                    disabled={guardando || accionando}
                    className="rounded-xl border border-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-60"
                >
                    Recargar jornadas
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

            {corteGuardado && (
                <div className="mb-6 rounded-2xl border border-yellow-500 bg-yellow-500/10 p-5 text-yellow-100">
                    <p className="text-lg font-bold">
                        Esta jornada ya cuenta con un corte de caja.
                    </p>

                    <p className="mt-2 text-sm text-yellow-200">
                        Registrado el {formatoFechaHora(corte.fecha_hora_corte)}.
                        No es posible crear un segundo corte para esta jornada.
                    </p>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={handleDescargarPdf}
                            disabled={generandoPdf || guardando}
                            className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-yellow-300 disabled:opacity-60"
                        >
                            {generandoPdf ? 'Generando PDF...' : 'Descargar PDF'}
                        </button>

                        {esAdminPrincipal && (
                            <button
                                type="button"
                                onClick={() => {
                                    setModoEdicion((valor) => !valor);
                                    setMotivoModificacion('');
                                }}
                                disabled={guardando}
                                className="rounded-xl border border-purple-400 px-5 py-3 font-bold text-purple-200 transition hover:bg-purple-500 hover:text-white disabled:opacity-60"
                            >
                                {modoEdicion
                                    ? 'Cancelar modificación'
                                    : 'Modificar corte'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {accionando && (
                <div className="mb-6 rounded-2xl border border-sky-500 bg-sky-500/10 px-5 py-4 text-sm text-sky-300">
                    Procesando acción...
                </div>
            )}

            <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <label className="mb-2 block text-sm text-slate-300">
                            Jornada
                        </label>

                        <select
                            value={idJornada}
                            onChange={handleJornadaChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        >
                            <option value="">Selecciona una jornada</option>

                            {jornadas.map((jornada) => (
                                <option
                                    key={jornada.id_jornada}
                                    value={jornada.id_jornada}
                                >
                                    {jornada.corte_guardado ? 'CORTE REALIZADO | ' : ''}
                                    {jornada.nombre_jornada} | {jornada.puesto || 'Sin puesto'} | {formatoFecha(jornada.fecha_base)} | {jornada.estado}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-sm text-slate-400">Estado</p>

                        <p
                            className={`mt-2 text-2xl font-bold ${
                                corteGuardado
                                    ? 'text-yellow-300'
                                    : 'text-emerald-400'
                            }`}
                        >
                            {!idJornada
                                ? 'Sin selección'
                                : corteGuardado
                                    ? 'Corte realizado'
                                    : 'Jornada seleccionada'}
                        </p>
                    </div>
                </div>
            </div>

            {cargando || cargandoResumen ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
                    Cargando corte...
                </div>
            ) : !idJornada ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
                    Selecciona una jornada para calcular el corte.
                </div>
            ) : (
                <>
                    <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <TarjetaCorte
                            titulo="Total ventas"
                            valor={formatoMoneda(totalVentas)}
                        />

                        <TarjetaCorte
                            titulo="Efectivo"
                            valor={formatoMoneda(totalEfectivo)}
                        />

                        <TarjetaCorte
                            titulo="Transferencia"
                            valor={formatoMoneda(totalTransferencia)}
                        />

                        <TarjetaCorte
                            titulo="Terminal / tarjeta"
                            valor={formatoMoneda(totalTerminal)}
                        />

                        <TarjetaCorte
                            titulo="Otros pagos"
                            valor={formatoMoneda(totalOtros)}
                        />

                        <TarjetaCorte
                            titulo="Gastos"
                            valor={formatoMoneda(totalGastos)}
                            variante="danger"
                        />

                        <TarjetaCorte
                            titulo="Efectivo esperado"
                            valor={formatoMoneda(efectivoEsperado)}
                        />

                        <TarjetaCorte
                            titulo="Ganancia neta"
                            valor={formatoMoneda(gananciaNeta)}
                        />
                    </div>

                    <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-[1fr_1fr]">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                            <h2 className="mb-5 text-xl font-bold text-white">
                                Registrar gasto
                            </h2>

                            {corteGuardado ? (
                                <div className="rounded-xl border border-yellow-500/60 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                                    Los gastos quedaron bloqueados porque la jornada
                                    ya tiene un corte de caja.
                                </div>
                            ) : (
                                <form
                                    onSubmit={handleRegistrarGasto}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="mb-2 block text-sm text-slate-300">
                                            Concepto
                                        </label>

                                        <input
                                            type="text"
                                            name="concepto"
                                            value={gasto.concepto}
                                            onChange={handleGastoChange}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                                            placeholder="Ej. Pasajes, comida, bolsas..."
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm text-slate-300">
                                            Monto
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            name="monto"
                                            value={gasto.monto}
                                            onChange={handleGastoChange}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={accionando || guardando}
                                        className="w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                                    >
                                        Registrar gasto
                                    </button>
                                </form>
                            )}
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                            <h2 className="mb-5 text-xl font-bold text-white">
                                {corteGuardado
                                    ? modoEdicion
                                        ? 'Modificar corte'
                                        : 'Corte guardado'
                                    : 'Guardar corte'}
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm text-slate-300">
                                        Efectivo contado
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={efectivoContado}
                                        disabled={corteGuardado && !modoEdicion}
                                        onChange={(event) =>
                                            setEfectivoContado(event.target.value)
                                        }
                                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                                    <ResumenLinea
                                        etiqueta="Efectivo esperado"
                                        valor={formatoMoneda(efectivoEsperado)}
                                    />

                                    <ResumenLinea
                                        etiqueta="Efectivo contado"
                                        valor={formatoMoneda(efectivoContado)}
                                    />

                                    <ResumenLinea
                                        etiqueta="Diferencia"
                                        valor={formatoMoneda(diferencia)}
                                        claseValor={
                                            Math.abs(diferencia) <= 0.01
                                                ? 'text-emerald-400'
                                                : 'text-red-400'
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm text-slate-300">
                                        Observaciones
                                    </label>

                                    <textarea
                                        value={observaciones}
                                        disabled={corteGuardado && !modoEdicion}
                                        onChange={(event) =>
                                            setObservaciones(event.target.value)
                                        }
                                        className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        placeholder="Opcional"
                                    />
                                </div>

                                {!corteGuardado && (
                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={cerrarJornada}
                                            onChange={(event) =>
                                                setCerrarJornada(event.target.checked)
                                            }
                                        />

                                        Cerrar jornada al guardar corte
                                    </label>
                                )}

                                {corteGuardado && modoEdicion && esAdminPrincipal && (
                                    <div>
                                        <label className="mb-2 block text-sm text-slate-300">
                                            Motivo de modificación
                                        </label>

                                        <textarea
                                            value={motivoModificacion}
                                            onChange={(event) =>
                                                setMotivoModificacion(event.target.value)
                                            }
                                            className="min-h-24 w-full rounded-xl border border-purple-500/70 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-400"
                                            placeholder="Explica por qué se modifica el corte"
                                        />
                                    </div>
                                )}

                                {!corteGuardado && (
                                    <button
                                        type="button"
                                        onClick={handleGuardarCorte}
                                        disabled={guardando || accionando}
                                        className="w-full rounded-xl bg-emerald-500 px-6 py-4 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                                    >
                                        {guardando
                                            ? 'Guardando corte...'
                                            : 'Guardar corte de caja'}
                                    </button>
                                )}

                                {corteGuardado && modoEdicion && esAdminPrincipal && (
                                    <button
                                        type="button"
                                        onClick={handleModificarCorte}
                                        disabled={guardando || accionando}
                                        className="w-full rounded-xl bg-purple-500 px-6 py-4 font-bold text-white transition hover:bg-purple-400 disabled:opacity-60"
                                    >
                                        {guardando
                                            ? 'Guardando modificación...'
                                            : 'Guardar modificación'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                        <div className="border-b border-slate-800 px-6 py-5">
                            <h2 className="text-xl font-bold text-white">
                                Gastos de la jornada
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] text-left text-sm">
                                <thead className="bg-slate-950 text-slate-300">
                                    <tr>
                                        <th className="px-5 py-4">Concepto</th>
                                        <th className="px-5 py-4">Monto</th>
                                        <th className="px-5 py-4">Fecha</th>
                                        <th className="px-5 py-4">Acciones</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-800">
                                    {gastos.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="4"
                                                className="px-5 py-10 text-center text-slate-400"
                                            >
                                                No hay gastos registrados en esta jornada.
                                            </td>
                                        </tr>
                                    ) : (
                                        gastos.map((item) => (
                                            <tr
                                                key={item.id_gasto}
                                                className="text-slate-300 transition hover:bg-slate-800/60"
                                            >
                                                <td className="px-5 py-4 font-semibold text-white">
                                                    {item.concepto}
                                                </td>

                                                <td className="px-5 py-4 font-bold text-red-300">
                                                    {formatoMoneda(item.monto)}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {formatoFechaHora(item.fecha_gasto)}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {corteGuardado ? (
                                                        <span className="text-xs text-slate-500">
                                                            Bloqueado por corte
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={accionando || guardando}
                                                            onClick={() =>
                                                                handleEliminarGasto(item)
                                                            }
                                                            className="rounded-lg border border-red-500 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-60"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {corteGuardado && historial.length > 0 && (
                        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                            <div className="border-b border-slate-800 px-6 py-5">
                                <h2 className="text-xl font-bold text-white">
                                    Historial de modificaciones
                                </h2>
                            </div>

                            <div className="divide-y divide-slate-800">
                                {historial.map((item) => (
                                    <article
                                        key={item.id_historial}
                                        className="p-5 text-sm text-slate-300"
                                    >
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                            <p className="font-bold text-purple-300">
                                                {item.modificado_por_nombre}
                                            </p>

                                            <p className="text-slate-500">
                                                {formatoFechaHora(item.fecha_modificacion)}
                                            </p>
                                        </div>

                                        <p className="mt-3">
                                            <span className="font-semibold text-white">
                                                Motivo:
                                            </span>{' '}
                                            {item.motivo}
                                        </p>

                                        <p className="mt-2 text-slate-400">
                                            Efectivo contado:{' '}
                                            {formatoMoneda(
                                                item.valores_anteriores?.efectivo_contado
                                            )}{' '}
                                            →{' '}
                                            {formatoMoneda(
                                                item.valores_nuevos?.efectivo_contado
                                            )}
                                        </p>
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

function ResumenLinea({ etiqueta, valor, claseValor = 'text-white' }) {
    return (
        <div className="mt-2 flex justify-between text-sm first:mt-0">
            <span className="text-slate-400">{etiqueta}</span>
            <span className={`font-bold ${claseValor}`}>{valor}</span>
        </div>
    );
}

function TarjetaCorte({ titulo, valor, variante = 'normal' }) {
    return (
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">{titulo}</p>

            <h2
                className={`mt-2 text-2xl font-bold ${
                    variante === 'danger'
                        ? 'text-red-400'
                        : 'text-emerald-400'
                }`}
            >
                {valor}
            </h2>
        </article>
    );
}

export default Cortes;