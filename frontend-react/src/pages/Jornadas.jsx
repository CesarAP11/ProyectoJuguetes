import { useEffect, useState } from 'react';

import {
    obtenerCatalogosJornadas,
    obtenerJornadas,
    abrirJornada,
    cerrarJornada
} from '../api/jornadas.api';

function obtenerFechaHoy() {
    const fecha = new Date();
    return fecha.toISOString().split('T')[0];
}

function obtenerFechaManana() {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 1);
    return fecha.toISOString().split('T')[0];
}

const estadoInicialFormulario = {
    id_puesto: '',
    nombre_jornada: '',
    fecha_base: obtenerFechaHoy(),
    hora_inicio: '09:00',
    fecha_cierre_programado: obtenerFechaManana(),
    hora_cierre_programado: '01:00',
    observaciones: ''
};

function Jornadas() {
    const [puestos, setPuestos] = useState([]);
    const [jornadas, setJornadas] = useState([]);

    const [formulario, setFormulario] = useState(estadoInicialFormulario);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [accionando, setAccionando] = useState(false);

    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('success');

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    async function cargarDatosIniciales() {
        try {
            setCargando(true);
            setMensaje('');

            const [catalogosData, jornadasData] = await Promise.all([
                obtenerCatalogosJornadas(),
                obtenerJornadas()
            ]);

            setPuestos(catalogosData.puestos || []);
            setJornadas(jornadasData.jornadas || []);

        } catch (error) {
            console.error('Error al cargar jornadas:', error);
            mostrarMensaje('danger', error.message || 'No se pudieron cargar las jornadas.');

        } finally {
            setCargando(false);
        }
    }

    async function cargarJornadas() {
        try {
            setMensaje('');

            const data = await obtenerJornadas();
            setJornadas(data.jornadas || []);

        } catch (error) {
            console.error('Error al cargar jornadas:', error);
            mostrarMensaje('danger', error.message || 'No se pudieron cargar las jornadas.');
        }
    }

    function mostrarMensaje(tipo, texto) {
        setTipoMensaje(tipo);
        setMensaje(texto);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setFormulario((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    function limpiarFormulario() {
        setFormulario({
            ...estadoInicialFormulario,
            fecha_base: obtenerFechaHoy(),
            fecha_cierre_programado: obtenerFechaManana()
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

    function obtenerClaseEstado(estado) {
        if (estado === 'abierta') {
            return 'border-emerald-500 bg-emerald-500/10 text-emerald-300';
        }

        if (estado === 'cerrada') {
            return 'border-slate-600 bg-slate-700/20 text-slate-300';
        }

        return 'border-yellow-500 bg-yellow-500/10 text-yellow-300';
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setGuardando(true);
            setMensaje('');

            if (!formulario.id_puesto) {
                mostrarMensaje('danger', 'Selecciona el puesto.');
                return;
            }

            if (!formulario.nombre_jornada.trim()) {
                mostrarMensaje('danger', 'Escribe el nombre de la jornada.');
                return;
            }

            if (!formulario.fecha_base) {
                mostrarMensaje('danger', 'Selecciona la fecha base.');
                return;
            }

            if (!formulario.hora_inicio) {
                mostrarMensaje('danger', 'Selecciona la hora de inicio.');
                return;
            }

            if (!formulario.fecha_cierre_programado) {
                mostrarMensaje('danger', 'Selecciona la fecha de cierre programado.');
                return;
            }

            if (!formulario.hora_cierre_programado) {
                mostrarMensaje('danger', 'Selecciona la hora de cierre programado.');
                return;
            }

            const inicio = new Date(`${formulario.fecha_base}T${formulario.hora_inicio}`);
            const cierre = new Date(`${formulario.fecha_cierre_programado}T${formulario.hora_cierre_programado}`);

            if (cierre <= inicio) {
                mostrarMensaje('danger', 'La fecha y hora de cierre debe ser mayor al inicio.');
                return;
            }

            const puestoSeleccionado = puestos.find((puesto) => puesto.id_puesto === formulario.id_puesto);

            const confirmar = confirm(
                `¿Confirmas abrir la jornada "${formulario.nombre_jornada}"?\n\nPuesto: ${puestoSeleccionado?.nombre || 'Seleccionado'}\nInicio: ${formulario.fecha_base} ${formulario.hora_inicio}\nCierre programado: ${formulario.fecha_cierre_programado} ${formulario.hora_cierre_programado}`
            );

            if (!confirmar) {
                return;
            }

            const respuesta = await abrirJornada({
                id_puesto: formulario.id_puesto,
                nombre_jornada: formulario.nombre_jornada.trim(),
                fecha_base: formulario.fecha_base,
                hora_inicio: formulario.hora_inicio,
                fecha_cierre_programado: formulario.fecha_cierre_programado,
                hora_cierre_programado: formulario.hora_cierre_programado,
                observaciones: formulario.observaciones.trim() || null
            });

            mostrarMensaje('success', respuesta.mensaje || 'Jornada abierta correctamente.');

            limpiarFormulario();
            await cargarJornadas();

        } catch (error) {
            console.error('Error al abrir jornada:', error);
            mostrarMensaje('danger', error.message || 'No se pudo abrir la jornada.');

        } finally {
            setGuardando(false);
        }
    }

    async function handleCerrarJornada(jornada) {
        try {
            const confirmar = confirm(
                `¿Seguro que deseas cerrar la jornada "${jornada.nombre_jornada}"?\n\nDespués de cerrarla ya no se podrán registrar ventas en esa jornada.`
            );

            if (!confirmar) {
                return;
            }

            const observaciones = prompt('Observaciones de cierre:', '');

            setAccionando(true);
            setMensaje('');

            const respuesta = await cerrarJornada(jornada.id_jornada, {
                observaciones_cierre: observaciones || null,
                observaciones: observaciones || null
            });

            mostrarMensaje('success', respuesta.mensaje || 'Jornada cerrada correctamente.');

            await cargarJornadas();

        } catch (error) {
            console.error('Error al cerrar jornada:', error);
            mostrarMensaje('danger', error.message || 'No se pudo cerrar la jornada.');

        } finally {
            setAccionando(false);
        }
    }

    return (
        <section>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Jornadas</h1>
                    <p className="mt-2 text-slate-400">
                        Apertura y cierre de jornadas por puesto.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarDatosIniciales}
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

            {accionando && (
                <div className="mb-6 rounded-2xl border border-sky-500 bg-sky-500/10 px-5 py-4 text-sm text-sky-300">
                    Procesando acción...
                </div>
            )}

            <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-5 text-xl font-bold text-white">Abrir nueva jornada</h2>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Puesto</label>
                        <select
                            name="id_puesto"
                            value={formulario.id_puesto}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        >
                            <option value="">Selecciona puesto</option>
                            {puestos.map((puesto) => (
                                <option key={puesto.id_puesto} value={puesto.id_puesto}>
                                    {puesto.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="lg:col-span-2">
                        <label className="mb-2 block text-sm text-slate-300">Nombre de jornada</label>
                        <input
                            type="text"
                            name="nombre_jornada"
                            value={formulario.nombre_jornada}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Ej. Centro Urbano - 2026-06-30"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Fecha base</label>
                        <input
                            type="date"
                            name="fecha_base"
                            value={formulario.fecha_base}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Hora inicio</label>
                        <input
                            type="time"
                            name="hora_inicio"
                            value={formulario.hora_inicio}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Fecha cierre programado</label>
                        <input
                            type="date"
                            name="fecha_cierre_programado"
                            value={formulario.fecha_cierre_programado}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Hora cierre programado</label>
                        <input
                            type="time"
                            name="hora_cierre_programado"
                            value={formulario.hora_cierre_programado}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <label className="mb-2 block text-sm text-slate-300">Observaciones</label>
                        <input
                            type="text"
                            name="observaciones"
                            value={formulario.observaciones}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Opcional"
                        />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:col-span-3">
                        <button
                            type="submit"
                            disabled={guardando || accionando}
                            className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                            {guardando ? 'Abriendo jornada...' : 'Abrir jornada'}
                        </button>

                        <button
                            type="button"
                            onClick={limpiarFormulario}
                            disabled={guardando || accionando}
                            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-60"
                        >
                            Limpiar
                        </button>
                    </div>
                </form>
            </div>

            {cargando ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
                    Cargando jornadas...
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px] text-left text-sm">
                            <thead className="bg-slate-950 text-slate-300">
                                <tr>
                                    <th className="px-5 py-4">Jornada</th>
                                    <th className="px-5 py-4">Puesto</th>
                                    <th className="px-5 py-4">Fecha base</th>
                                    <th className="px-5 py-4">Inicio</th>
                                    <th className="px-5 py-4">Cierre programado</th>
                                    <th className="px-5 py-4">Cierre real</th>
                                    <th className="px-5 py-4">Estado</th>
                                    <th className="px-5 py-4">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-800">
                                {jornadas.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-5 py-10 text-center text-slate-400">
                                            No hay jornadas registradas.
                                        </td>
                                    </tr>
                                ) : (
                                    jornadas.map((jornada) => (
                                        <tr
                                            key={jornada.id_jornada}
                                            className="text-slate-300 transition hover:bg-slate-800/60"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-white">
                                                    {jornada.nombre_jornada}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {jornada.observaciones || 'Sin observaciones'}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                {jornada.puesto || 'Sin puesto'}
                                            </td>

                                            <td className="px-5 py-4">
                                                {formatoFecha(jornada.fecha_base)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p>{jornada.hora_inicio || '-'}</p>
                                                <p className="text-xs text-slate-500">
                                                    {formatoFechaHora(jornada.fecha_hora_inicio)}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p>
                                                    {formatoFecha(jornada.fecha_cierre_programado)}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {jornada.hora_cierre_programado || '-'}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                {formatoFechaHora(jornada.fecha_hora_cierre_real)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${obtenerClaseEstado(jornada.estado)}`}
                                                >
                                                    {jornada.estado}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                {jornada.estado === 'abierta' ? (
                                                    <button
                                                        type="button"
                                                        disabled={accionando}
                                                        onClick={() => handleCerrarJornada(jornada)}
                                                        className="rounded-lg border border-red-500 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-60"
                                                    >
                                                        Cerrar jornada
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-500">
                                                        Sin acciones
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Jornadas;