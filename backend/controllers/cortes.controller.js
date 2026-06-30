const { supabaseAdmin } = require('../services/supabase.service');

function numero(valor) {
    return Number(valor || 0);
}

async function obtenerJornadasParaCorte(req, res) {
    try {
        const { data: jornadas, error: jornadasError } = await supabaseAdmin
            .from('jornadas')
            .select('*')
            .order('fecha_base', { ascending: false });

        if (jornadasError) {
            console.error('Error al consultar jornadas para corte:', jornadasError);

            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar jornadas.',
                error: jornadasError.message,
                detalle: jornadasError
            });
        }

        const idsPuestos = [
            ...new Set(
                (jornadas || [])
                    .map((jornada) => jornada.id_puesto)
                    .filter(Boolean)
            )
        ];

        let puestos = [];

        if (idsPuestos.length > 0) {
            const { data: puestosData, error: puestosError } = await supabaseAdmin
                .from('puestos')
                .select('id_puesto, nombre')
                .in('id_puesto', idsPuestos);

            if (puestosError) {
                console.error('Error al consultar puestos para corte:', puestosError);

                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al consultar puestos.',
                    error: puestosError.message,
                    detalle: puestosError
                });
            }

            puestos = puestosData || [];
        }

        const mapaPuestos = new Map();

        puestos.forEach((puesto) => {
            mapaPuestos.set(puesto.id_puesto, puesto);
        });

        const jornadasFormateadas = (jornadas || []).map((jornada) => {
            const puesto = mapaPuestos.get(jornada.id_puesto);

            return {
                id_jornada: jornada.id_jornada,
                id_puesto: jornada.id_puesto,
                nombre_jornada: jornada.nombre_jornada || 'Sin nombre',
                fecha_base: jornada.fecha_base || null,
                hora_inicio: jornada.hora_inicio || null,
                fecha_hora_inicio: jornada.fecha_hora_inicio || jornada.fecha_creacion || null,
                fecha_hora_cierre_real: jornada.fecha_hora_cierre_real || null,
                estado: jornada.estado || 'sin estado',
                observaciones: jornada.observaciones || null,
                puesto: puesto?.nombre || 'Sin puesto'
            };
        });

        res.json({
            ok: true,
            jornadas: jornadasFormateadas
        });

    } catch (error) {
        console.error('Error interno al consultar jornadas para corte:', error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al consultar jornadas para corte.',
            error: error.message
        });
    }
}

async function obtenerResumenCorte(req, res) {
    try {
        const { idJornada } = req.params;

        if (!idJornada) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió la jornada.'
            });
        }

        const { data: jornada, error: jornadaError } = await supabaseAdmin
            .from('jornadas')
            .select('id_jornada, id_puesto, nombre_jornada, fecha_base, estado')
            .eq('id_jornada', idJornada)
            .single();

        if (jornadaError || !jornada) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Jornada no encontrada.'
            });
        }

        const { data: ventas, error: ventasError } = await supabaseAdmin
            .from('ventas')
            .select('id_venta, total_venta, estado')
            .eq('id_jornada', idJornada)
            .neq('estado', 'cancelada');

        if (ventasError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar ventas.',
                error: ventasError.message
            });
        }

        const idsVentas = (ventas || []).map((venta) => venta.id_venta);

        let detalles = [];
        let pagos = [];

        if (idsVentas.length > 0) {
            const { data: detallesData, error: detallesError } = await supabaseAdmin
                .from('detalle_ventas')
                .select('id_detalle_venta, id_venta, cantidad, precio_unitario_venta, costo_unitario_snapshot, subtotal')
                .in('id_venta', idsVentas);

            if (detallesError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al consultar detalle de ventas.',
                    error: detallesError.message
                });
            }

            detalles = detallesData || [];

            const { data: pagosData, error: pagosError } = await supabaseAdmin
                .from('pagos_venta')
                .select('*')
                .in('id_venta', idsVentas);

            if (pagosError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al consultar pagos.',
                    error: pagosError.message
                });
            }

            pagos = pagosData || [];
        }

        const idsMetodosPago = [
            ...new Set((pagos || []).map((pago) => pago.id_metodo_pago).filter(Boolean))
        ];

        let metodosPago = [];

        if (idsMetodosPago.length > 0) {
            const { data: metodosData, error: metodosError } = await supabaseAdmin
                .from('metodos_pago')
                .select('id_metodo_pago, nombre, codigo')
                .in('id_metodo_pago', idsMetodosPago);

            if (metodosError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al consultar métodos de pago.',
                    error: metodosError.message
                });
            }

            metodosPago = metodosData || [];
        }

        const mapaMetodosPago = new Map();

        metodosPago.forEach((metodo) => {
            mapaMetodosPago.set(metodo.id_metodo_pago, metodo);
        });

        const { data: gastosRaw, error: gastosError } = await supabaseAdmin
            .from('gastos_jornada')
            .select('*')
            .eq('id_jornada', idJornada);

        if (gastosError) {
            console.error('Error al consultar gastos:', gastosError);

            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar gastos.',
                error: gastosError.message,
                detalle: gastosError
            });
        }

        const gastos = (gastosRaw || [])
            .map((gasto) => ({
                id_gasto: gasto.id_gasto,
                id_jornada: gasto.id_jornada,
                concepto: gasto.concepto || 'Sin concepto',
                monto: numero(gasto.monto),
                fecha_gasto: gasto.fecha_gasto || gasto.fecha_creacion || gasto.created_at || null,
                registrado_por: gasto.registrado_por || null
            }))
            .sort((a, b) => {
                return new Date(b.fecha_gasto || 0) - new Date(a.fecha_gasto || 0);
            });

        const { data: corteExistente } = await supabaseAdmin
            .from('cortes_caja')
            .select('*')
            .eq('id_jornada', idJornada)
            .order('fecha_corte', { ascending: false })
            .limit(1)
            .maybeSingle();

        let totalVentas = 0;
        let totalEfectivo = 0;
        let totalTransferencia = 0;
        let totalTerminal = 0;
        let totalOtros = 0;
        let gananciaBruta = 0;

        totalVentas = (ventas || []).reduce((suma, venta) => {
            return suma + numero(venta.total_venta);
        }, 0);

        gananciaBruta = (detalles || []).reduce((suma, detalle) => {
            const cantidad = numero(detalle.cantidad);
            const precio = numero(detalle.precio_unitario_venta);
            const costo = numero(detalle.costo_unitario_snapshot);

            return suma + ((cantidad * precio) - (cantidad * costo));
        }, 0);

        for (const pago of pagos || []) {
            const metodo = pago.id_metodo_pago ? mapaMetodosPago.get(pago.id_metodo_pago) : null;

            const codigo = String(
                metodo?.codigo ||
                metodo?.nombre ||
                pago.metodo_pago ||
                pago.nombre_metodo ||
                pago.codigo ||
                ''
            ).toLowerCase();

            const monto = numero(pago.monto);

            if (codigo.includes('efectivo')) {
                totalEfectivo += monto;
            } else if (codigo.includes('transfer')) {
                totalTransferencia += monto;
            } else if (
                codigo.includes('terminal') ||
                codigo.includes('tarjeta') ||
                codigo.includes('card')
            ) {
                totalTerminal += monto;
            } else {
                totalOtros += monto;
            }
        }

        const totalGastos = (gastos || []).reduce((suma, gasto) => {
            return suma + numero(gasto.monto);
        }, 0);

        const efectivoEsperado = totalEfectivo - totalGastos;
        const gananciaNeta = gananciaBruta - totalGastos;

        const resumen = {
            id_jornada: idJornada,
            jornada: jornada.nombre_jornada,
            fecha_base: jornada.fecha_base,
            estado_jornada: jornada.estado,

            total_ventas: totalVentas,
            total_efectivo: totalEfectivo,
            total_transferencia: totalTransferencia,
            total_terminal: totalTerminal,
            total_otros: totalOtros,
            total_gastos: totalGastos,

            efectivo_esperado: efectivoEsperado,
            efectivo_contado: corteExistente?.efectivo_contado || 0,
            diferencia: corteExistente?.diferencia || 0,

            ganancia_bruta: gananciaBruta,
            ganancia_total: gananciaBruta,
            ganancia_neta: gananciaNeta,

            corte_guardado: Boolean(corteExistente),
            corte: corteExistente || null
        };

        res.json({
            ok: true,
            resumen,
            gastos: gastos || []
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al generar resumen de corte.',
            error: error.message
        });
    }
}

async function registrarGasto(req, res) {
    try {
        const { id_jornada, concepto, monto } = req.body;

        if (!id_jornada) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Selecciona una jornada.'
            });
        }

        if (!concepto || !concepto.trim()) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El concepto del gasto es obligatorio.'
            });
        }

        if (Number(monto) <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El monto del gasto debe ser mayor a 0.'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('gastos_jornada')
            .insert({
                id_jornada,
                concepto: concepto.trim(),
                monto: Number(monto),
                registrado_por: req.usuario.id
            })
            .select('*')
            .single();

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo registrar el gasto.',
                error: error.message
            });
        }

        res.status(201).json({
            ok: true,
            mensaje: 'Gasto registrado correctamente.',
            gasto: data
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al registrar gasto.',
            error: error.message
        });
    }
}

async function eliminarGasto(req, res) {
    try {
        const { idGasto } = req.params;

        if (!idGasto) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió el gasto.'
            });
        }

        const { error } = await supabaseAdmin
            .from('gastos_jornada')
            .delete()
            .eq('id_gasto', idGasto);

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo eliminar el gasto.',
                error: error.message
            });
        }

        res.json({
            ok: true,
            mensaje: 'Gasto eliminado correctamente.'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al eliminar gasto.',
            error: error.message
        });
    }
}

async function guardarCorteCaja(req, res) {
    try {
        const {
            id_jornada,
            total_ventas,
            total_efectivo,
            total_transferencia,
            total_terminal,
            total_otros,
            total_gastos,
            efectivo_esperado,
            efectivo_contado,
            diferencia,
            ganancia_bruta,
            ganancia_neta,
            observaciones,
            cerrar_jornada
        } = req.body;

        if (!id_jornada) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Selecciona una jornada.'
            });
        }

        if (efectivo_contado === undefined || efectivo_contado === null || Number(efectivo_contado) < 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Ingresa el efectivo contado.'
            });
        }

        const { data: corte, error } = await supabaseAdmin
            .from('cortes_caja')
            .insert({
                id_jornada,
                total_ventas: numero(total_ventas),
                total_efectivo: numero(total_efectivo),
                total_transferencia: numero(total_transferencia),
                total_terminal: numero(total_terminal),
                total_otros: numero(total_otros),
                total_gastos: numero(total_gastos),
                efectivo_esperado: numero(efectivo_esperado),
                efectivo_contado: numero(efectivo_contado),
                diferencia: numero(diferencia),
                ganancia_bruta: numero(ganancia_bruta),
                ganancia_neta: numero(ganancia_neta),
                observaciones: observaciones || null,
                cerrado_por: req.usuario.id
            })
            .select('*')
            .single();

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo guardar el corte de caja.',
                error: error.message
            });
        }

        if (cerrar_jornada) {
            const { error: cierreError } = await supabaseAdmin
                .from('jornadas')
                .update({
                    estado: 'cerrada',
                    fecha_hora_cierre_real: new Date().toISOString()
                })
                .eq('id_jornada', id_jornada);

            if (cierreError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'El corte se guardó, pero no se pudo cerrar la jornada.',
                    error: cierreError.message,
                    corte
                });
            }
        }

        res.status(201).json({
            ok: true,
            mensaje: cerrar_jornada
                ? 'Corte guardado y jornada cerrada correctamente.'
                : 'Corte guardado correctamente.',
            corte
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al guardar corte de caja.',
            error: error.message
        });
    }
}

module.exports = {
    obtenerJornadasParaCorte,
    obtenerResumenCorte,
    registrarGasto,
    eliminarGasto,
    guardarCorteCaja
};