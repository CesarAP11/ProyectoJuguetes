const { supabaseAdmin } = require('../services/supabase.service');

function obtenerFechaSiguiente(fechaBase) {
    const fecha = new Date(`${fechaBase}T00:00:00`);
    fecha.setDate(fecha.getDate() + 1);
    return fecha.toISOString().slice(0, 10);
}

async function obtenerCatalogosJornadas(req, res) {
    try {
        const { data: puestos, error } = await supabaseAdmin
            .from('puestos')
            .select('id_puesto, nombre, direccion')
            .eq('activo', true)
            .order('nombre', { ascending: true });

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al cargar puestos.',
                error: error.message
            });
        }

        res.json({
            ok: true,
            puestos
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al cargar catálogos de jornadas.',
            error: error.message
        });
    }
}

async function listarJornadas(req, res) {
    try {
        const { data: jornadas, error: jornadasError } = await supabaseAdmin
            .from('jornadas')
            .select(`
                id_jornada,
                id_puesto,
                nombre_jornada,
                fecha_base,
                fecha_hora_inicio,
                fecha_hora_cierre_programado,
                fecha_hora_cierre_real,
                estado,
                responsable,
                notas,
                fecha_creacion
            `)
            .order('fecha_creacion', { ascending: false });

        if (jornadasError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar jornadas.',
                error: jornadasError.message
            });
        }

        if (!jornadas || jornadas.length === 0) {
            return res.json({
                ok: true,
                jornadas: []
            });
        }

        const idsPuestos = [...new Set(jornadas.map(j => j.id_puesto).filter(Boolean))];
        const idsResponsables = [...new Set(jornadas.map(j => j.responsable).filter(Boolean))];
        const idsJornadas = jornadas.map(j => j.id_jornada);

        const [puestosRes, responsablesRes, ventasRes] = await Promise.all([
            supabaseAdmin
                .from('puestos')
                .select('id_puesto, nombre')
                .in('id_puesto', idsPuestos),

            idsResponsables.length > 0
                ? supabaseAdmin
                    .from('perfiles')
                    .select('id_perfil, nombre_completo')
                    .in('id_perfil', idsResponsables)
                : { data: [], error: null },

            supabaseAdmin
                .from('ventas')
                .select('id_venta, id_jornada, total_venta, estado')
                .in('id_jornada', idsJornadas)
        ]);

        if (puestosRes.error || responsablesRes.error || ventasRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar datos relacionados de jornadas.',
                error: {
                    puestos: puestosRes.error?.message || null,
                    responsables: responsablesRes.error?.message || null,
                    ventas: ventasRes.error?.message || null
                }
            });
        }

        const mapaPuestos = new Map((puestosRes.data || []).map(p => [p.id_puesto, p]));
        const mapaResponsables = new Map((responsablesRes.data || []).map(p => [p.id_perfil, p]));

        const jornadasFormateadas = jornadas.map((jornada) => {
            const ventasJornada = (ventasRes.data || []).filter((venta) => {
                return venta.id_jornada === jornada.id_jornada && venta.estado === 'pagada';
            });

            const totalVendido = ventasJornada.reduce((suma, venta) => {
                return suma + Number(venta.total_venta || 0);
            }, 0);

            return {
                id_jornada: jornada.id_jornada,
                puesto: mapaPuestos.get(jornada.id_puesto)?.nombre || 'Sin puesto',
                responsable: mapaResponsables.get(jornada.responsable)?.nombre_completo || 'Sin responsable',
                nombre_jornada: jornada.nombre_jornada,
                fecha_base: jornada.fecha_base,
                fecha_hora_inicio: jornada.fecha_hora_inicio,
                fecha_hora_cierre_programado: jornada.fecha_hora_cierre_programado,
                fecha_hora_cierre_real: jornada.fecha_hora_cierre_real,
                estado: jornada.estado,
                total_ventas: ventasJornada.length,
                total_vendido: totalVendido
            };
        });

        res.json({
            ok: true,
            jornadas: jornadasFormateadas
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al listar jornadas.',
            error: error.message
        });
    }
}

async function abrirJornada(req, res) {
    try {
        const {
            id_puesto,
            fecha_base,
            hora_inicio,
            fecha_cierre_programado,
            hora_cierre_programado,
            notas
        } = req.body;

        if (!id_puesto || !fecha_base || !hora_inicio || !fecha_cierre_programado || !hora_cierre_programado) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El puesto, fecha base, hora de inicio, fecha de cierre y hora de cierre son obligatorios.'
            });
        }

        const { data: puesto, error: puestoError } = await supabaseAdmin
            .from('puestos')
            .select('id_puesto, nombre')
            .eq('id_puesto', id_puesto)
            .eq('activo', true)
            .single();

        if (puestoError || !puesto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El puesto seleccionado no existe o está inactivo.'
            });
        }

        const { data: jornadaAbierta } = await supabaseAdmin
            .from('jornadas')
            .select('id_jornada')
            .eq('id_puesto', id_puesto)
            .eq('estado', 'abierta')
            .maybeSingle();

        if (jornadaAbierta) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Este puesto ya tiene una jornada abierta.'
            });
        }

        const fechaHoraInicio = `${fecha_base}T${hora_inicio}:00-06:00`;
        const fechaHoraCierreProgramado = `${fecha_cierre_programado}T${hora_cierre_programado}:00-06:00`;

        const inicioDate = new Date(fechaHoraInicio);
        const cierreDate = new Date(fechaHoraCierreProgramado);

        if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(cierreDate.getTime())) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La fecha u hora ingresada no es válida.'
            });
        }

        if (cierreDate <= inicioDate) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El cierre programado debe ser mayor que la hora de inicio.'
            });
        }

        const nombreJornada = `${puesto.nombre} - ${fecha_base}`;

        const { error } = await supabaseAdmin
            .from('jornadas')
            .insert({
                id_puesto,
                nombre_jornada: nombreJornada,
                fecha_base,
                fecha_hora_inicio: fechaHoraInicio,
                fecha_hora_cierre_programado: fechaHoraCierreProgramado,
                estado: 'abierta',
                responsable: req.usuario.id,
                notas: notas || null
            });

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo abrir la jornada.',
                error: error.message
            });
        }

        res.status(201).json({
            ok: true,
            mensaje: 'Jornada abierta correctamente.'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al abrir jornada.',
            error: error.message
        });
    }
}

async function cerrarJornada(req, res) {
    try {
        const { idJornada } = req.params;

        const { data: jornada, error: jornadaError } = await supabaseAdmin
            .from('jornadas')
            .select('id_jornada, estado')
            .eq('id_jornada', idJornada)
            .single();

        if (jornadaError || !jornada) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Jornada no encontrada.'
            });
        }

        if (jornada.estado !== 'abierta') {
            return res.status(400).json({
                ok: false,
                mensaje: 'Solo se pueden cerrar jornadas abiertas.'
            });
        }

        const { error } = await supabaseAdmin
            .from('jornadas')
            .update({
                estado: 'cerrada',
                fecha_hora_cierre_real: new Date().toISOString()
            })
            .eq('id_jornada', idJornada);

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo cerrar la jornada.',
                error: error.message
            });
        }

        res.json({
            ok: true,
            mensaje: 'Jornada cerrada correctamente.'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al cerrar jornada.',
            error: error.message
        });
    }
}

module.exports = {
    obtenerCatalogosJornadas,
    listarJornadas,
    abrirJornada,
    cerrarJornada
};