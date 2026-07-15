const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { supabaseAdmin } = require('../services/supabase.service');

function numero(valor) {
    return Number(valor || 0);
}

function texto(valor, respaldo = '-') {
    const contenido = String(valor ?? '').trim();
    return contenido || respaldo;
}

function formatoMoneda(valor) {
    return numero(valor).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN'
    });
}

function formatoFecha(fecha) {
    if (!fecha) {
        return '-';
    }

    return new Date(fecha).toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function consultarCortePorJornada(idJornada) {
    const { data, error } = await supabaseAdmin
        .from('cortes_caja')
        .select('*')
        .eq('id_jornada', idJornada)
        .order('fecha_hora_corte', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
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
                error: jornadasError.message
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
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al consultar puestos.',
                    error: puestosError.message
                });
            }

            puestos = puestosData || [];
        }

        const mapaPuestos = new Map(
            puestos.map((puesto) => [puesto.id_puesto, puesto])
        );

        const idsJornadas = (jornadas || [])
            .map((jornada) => jornada.id_jornada)
            .filter(Boolean);

        let cortes = [];

        if (idsJornadas.length > 0) {
            const { data: cortesData, error: cortesError } = await supabaseAdmin
                .from('cortes_caja')
                .select('id_corte, id_jornada, fecha_hora_corte')
                .in('id_jornada', idsJornadas);

            if (cortesError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al consultar cortes existentes.',
                    error: cortesError.message
                });
            }

            cortes = cortesData || [];
        }

        const mapaCortes = new Map();

        cortes.forEach((corte) => {
            mapaCortes.set(corte.id_jornada, corte);
        });

        const jornadasFormateadas = (jornadas || []).map((jornada) => {
            const puesto = mapaPuestos.get(jornada.id_puesto);
            const corte = mapaCortes.get(jornada.id_jornada);

            return {
                id_jornada: jornada.id_jornada,
                id_puesto: jornada.id_puesto,
                nombre_jornada: jornada.nombre_jornada || 'Sin nombre',
                fecha_base: jornada.fecha_base || null,
                fecha_hora_inicio: jornada.fecha_hora_inicio || jornada.fecha_creacion || null,
                fecha_hora_cierre_real: jornada.fecha_hora_cierre_real || null,
                estado: jornada.estado || 'sin estado',
                observaciones: jornada.observaciones || jornada.notas || null,
                puesto: puesto?.nombre || 'Sin puesto',
                corte_guardado: Boolean(corte),
                id_corte: corte?.id_corte || null,
                fecha_hora_corte: corte?.fecha_hora_corte || null
            };
        });

        return res.json({
            ok: true,
            jornadas: jornadasFormateadas
        });

    } catch (error) {
        console.error('Error interno al consultar jornadas para corte:', error);

        return res.status(500).json({
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
            .select('id_jornada, id_puesto, nombre_jornada, fecha_base, fecha_hora_inicio, fecha_hora_cierre_real, estado')
            .eq('id_jornada', idJornada)
            .single();

        if (jornadaError || !jornada) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Jornada no encontrada.'
            });
        }

        const { data: puesto } = await supabaseAdmin
            .from('puestos')
            .select('id_puesto, nombre')
            .eq('id_puesto', jornada.id_puesto)
            .maybeSingle();

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

        const mapaMetodosPago = new Map(
            metodosPago.map((metodo) => [metodo.id_metodo_pago, metodo])
        );

        const { data: gastosRaw, error: gastosError } = await supabaseAdmin
            .from('gastos_jornada')
            .select('*')
            .eq('id_jornada', idJornada);

        if (gastosError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar gastos.',
                error: gastosError.message
            });
        }

        const gastos = (gastosRaw || [])
            .map((gasto) => ({
                id_gasto: gasto.id_gasto,
                id_jornada: gasto.id_jornada,
                concepto: gasto.concepto || 'Sin concepto',
                monto: numero(gasto.monto),
                fecha_gasto: gasto.fecha_hora || gasto.fecha_creacion || null,
                registrado_por: gasto.registrado_por || null
            }))
            .sort((a, b) => new Date(b.fecha_gasto || 0) - new Date(a.fecha_gasto || 0));

        const corteExistente = await consultarCortePorJornada(idJornada);

        const totalVentas = (ventas || []).reduce(
            (suma, venta) => suma + numero(venta.total_venta),
            0
        );

        const gananciaBruta = (detalles || []).reduce((suma, detalle) => {
            const cantidad = numero(detalle.cantidad);
            const precio = numero(detalle.precio_unitario_venta);
            const costo = numero(detalle.costo_unitario_snapshot);

            return suma + ((cantidad * precio) - (cantidad * costo));
        }, 0);

        let totalEfectivo = 0;
        let totalTransferencia = 0;
        let totalTerminal = 0;
        let totalOtros = 0;

        for (const pago of pagos || []) {
            const metodo = pago.id_metodo_pago
                ? mapaMetodosPago.get(pago.id_metodo_pago)
                : null;

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

        const totalGastos = gastos.reduce(
            (suma, gasto) => suma + numero(gasto.monto),
            0
        );

        const efectivoEsperado = totalEfectivo - totalGastos;
        const gananciaNeta = gananciaBruta - totalGastos;

        const resumen = {
            id_jornada: idJornada,
            jornada: jornada.nombre_jornada,
            puesto: puesto?.nombre || 'Sin puesto',
            fecha_base: jornada.fecha_base,
            fecha_hora_inicio: jornada.fecha_hora_inicio,
            fecha_hora_cierre_real: jornada.fecha_hora_cierre_real,
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

        return res.json({
            ok: true,
            resumen,
            gastos
        });

    } catch (error) {
        console.error('Error interno al generar resumen de corte:', error);

        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno al generar resumen de corte.',
            error: error.message
        });
    }
}

async function obtenerCortePorJornada(req, res) {
    try {
        const { idJornada } = req.params;
        const corte = await consultarCortePorJornada(idJornada);

        if (!corte) {
            return res.status(404).json({
                ok: false,
                mensaje: 'La jornada todavía no tiene un corte de caja.'
            });
        }

        return res.json({
            ok: true,
            corte
        });

    } catch (error) {
        return res.status(500).json({
            ok: false,
            mensaje: 'No se pudo consultar el corte de caja.',
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

        const corteExistente = await consultarCortePorJornada(id_jornada);

        if (corteExistente) {
            return res.status(409).json({
                ok: false,
                mensaje: 'La jornada ya tiene un corte de caja. No se pueden registrar más gastos.'
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

        return res.status(201).json({
            ok: true,
            mensaje: 'Gasto registrado correctamente.',
            gasto: data
        });

    } catch (error) {
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno al registrar gasto.',
            error: error.message
        });
    }
}

async function eliminarGasto(req, res) {
    try {
        const { idGasto } = req.params;

        const { data: gasto, error: gastoError } = await supabaseAdmin
            .from('gastos_jornada')
            .select('id_gasto, id_jornada')
            .eq('id_gasto', idGasto)
            .single();

        if (gastoError || !gasto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Gasto no encontrado.'
            });
        }

        const corteExistente = await consultarCortePorJornada(gasto.id_jornada);

        if (corteExistente) {
            return res.status(409).json({
                ok: false,
                mensaje: 'La jornada ya tiene un corte de caja. No se pueden eliminar gastos.'
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

        return res.json({
            ok: true,
            mensaje: 'Gasto eliminado correctamente.'
        });

    } catch (error) {
        return res.status(500).json({
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

        const corteExistente = await consultarCortePorJornada(id_jornada);

        if (corteExistente) {
            return res.status(409).json({
                ok: false,
                mensaje: 'Esta jornada ya cuenta con un corte de caja.',
                corte_guardado: true,
                corte: corteExistente
            });
        }

        if (
            efectivo_contado === undefined ||
            efectivo_contado === null ||
            Number(efectivo_contado) < 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Ingresa el efectivo contado.'
            });
        }

        const { data: corte, error } = await supabaseAdmin
            .from('cortes_caja')
            .insert({
                id_jornada,
                realizado_por: req.usuario.id,
                cerrado_por: req.usuario.id,

                total_sistema: numero(total_ventas),
                transferencias_reportadas: numero(total_transferencia),
                gastos_jornada: numero(total_gastos),
                notas: observaciones || null,

                total_ventas: numero(total_ventas),
                total_efectivo: numero(total_efectivo),
                total_transferencia: numero(total_transferencia),
                total_terminal: numero(total_terminal),
                total_otros: numero(total_otros),
                total_gastos: numero(total_gastos),

                efectivo_esperado: numero(efectivo_esperado),
                efectivo_contado: numero(efectivo_contado),
                diferencia: numero(diferencia),
                diferencia_efectivo: numero(diferencia),

                ganancia_bruta: numero(ganancia_bruta),
                ganancia_neta: numero(ganancia_neta),
                total_ganancia: numero(ganancia_neta),

                observaciones: observaciones || null
            })
            .select('*')
            .single();

        if (error) {
            if (error.code === '23505') {
                const existente = await consultarCortePorJornada(id_jornada);

                return res.status(409).json({
                    ok: false,
                    mensaje: 'Esta jornada ya cuenta con un corte de caja.',
                    corte_guardado: true,
                    corte: existente
                });
            }

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

        return res.status(201).json({
            ok: true,
            mensaje: cerrar_jornada
                ? 'Corte guardado y jornada cerrada correctamente.'
                : 'Corte guardado correctamente.',
            corte
        });

    } catch (error) {
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno al guardar corte de caja.',
            error: error.message
        });
    }
}

async function modificarCorteCaja(req, res) {
    try {
        const { idCorte } = req.params;
        const { efectivo_contado, observaciones, motivo } = req.body;

        if (!motivo || !motivo.trim()) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El motivo de modificación es obligatorio.'
            });
        }

        if (
            efectivo_contado === undefined ||
            efectivo_contado === null ||
            Number(efectivo_contado) < 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Ingresa un efectivo contado válido.'
            });
        }

        const { data, error } = await supabaseAdmin.rpc(
            'modificar_corte_caja_admin',
            {
                p_id_corte: idCorte,
                p_modificado_por: req.usuario.id,
                p_efectivo_contado: Number(efectivo_contado),
                p_observaciones: observaciones || null,
                p_motivo: motivo.trim()
            }
        );

        if (error) {
            return res.status(400).json({
                ok: false,
                mensaje: error.message || 'No se pudo modificar el corte de caja.'
            });
        }

        return res.json({
            ok: true,
            mensaje: 'Corte de caja modificado correctamente.',
            corte: data
        });

    } catch (error) {
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno al modificar el corte de caja.',
            error: error.message
        });
    }
}

async function obtenerHistorialCorte(req, res) {
    try {
        const { idCorte } = req.params;

        const { data: historial, error } = await supabaseAdmin
            .from('cortes_caja_historial')
            .select('*')
            .eq('id_corte', idCorte)
            .order('fecha_modificacion', { ascending: false });

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo consultar el historial del corte.',
                error: error.message
            });
        }

        const idsUsuarios = [
            ...new Set((historial || []).map((item) => item.modificado_por).filter(Boolean))
        ];

        let perfiles = [];

        if (idsUsuarios.length > 0) {
            const { data: perfilesData } = await supabaseAdmin
                .from('perfiles')
                .select('id_perfil, nombre_completo')
                .in('id_perfil', idsUsuarios);

            perfiles = perfilesData || [];
        }

        const mapaPerfiles = new Map(
            perfiles.map((perfil) => [perfil.id_perfil, perfil.nombre_completo])
        );

        return res.json({
            ok: true,
            historial: (historial || []).map((item) => ({
                ...item,
                modificado_por_nombre:
                    mapaPerfiles.get(item.modificado_por) || 'Administrador principal'
            }))
        });

    } catch (error) {
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno al consultar el historial.',
            error: error.message
        });
    }
}

function agregarFilaPdf(doc, etiqueta, valor, opciones = {}) {
    const y = doc.y;
    const anchoEtiqueta = 180;
    const anchoValor = 310;

    doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#334155')
        .text(etiqueta, 50, y, { width: anchoEtiqueta });

    doc.font('Helvetica')
        .fontSize(10)
        .fillColor(opciones.color || '#0f172a')
        .text(texto(valor), 230, y, { width: anchoValor });

    doc.moveDown(0.7);
}

function obtenerRutaLogoPdfCorte() {
    return path.join(
        __dirname,
        '..',
        'assets',
        'logo-juguetesfun-pdf.png'
    );
}

function dibujarLogoPdfCorte(doc, rutaLogo, x, y, opciones) {
    if (!fs.existsSync(rutaLogo)) {
        return false;
    }

    try {
        doc.image(rutaLogo, x, y, opciones);
        return true;
    } catch (errorLogo) {
        console.warn(
            'No se pudo insertar el logo en el PDF del corte:',
            errorLogo.message
        );
        return false;
    }
}

function dibujarPortadaPdfCorte(doc, {
    idCorte,
    fechaGeneracion,
    jornada,
    puesto,
    fechaBase
}) {
    const rutaLogo = obtenerRutaLogoPdfCorte();
    const anchoPagina = doc.page.width;
    const altoPagina = doc.page.height;

    doc.save();

    doc.rect(0, 0, anchoPagina, altoPagina).fill('#020617');

    doc.fillColor('#031926')
        .circle(88, altoPagina - 105, 125)
        .fill();

    doc.fillColor('#1c1024')
        .circle(anchoPagina - 72, 165, 112)
        .fill();

    doc.roundedRect(40, 36, anchoPagina - 80, 56, 10)
        .lineWidth(1)
        .strokeColor('#1e4054')
        .stroke();

    doc.font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#bfdbfe')
        .text('DOCUMENTACIÓN OFICIAL DEL SISTEMA', 58, 55);

    doc.font('Helvetica')
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('JuguetesFun · Documento operativo', 58, 74);

    const logoAgregado = dibujarLogoPdfCorte(
        doc,
        rutaLogo,
        118,
        125,
        {
            fit: [360, 250],
            align: 'center',
            valign: 'center'
        }
    );

    if (!logoAgregado) {
        doc.font('Helvetica-Bold')
            .fontSize(34)
            .fillColor('#10b981')
            .text('JuguetesFun', 50, 220, {
                width: anchoPagina - 100,
                align: 'center'
            });
    }

    doc.font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#ffffff')
        .text('CORTE DE CAJA', 50, 420, {
            width: anchoPagina - 100,
            align: 'center'
        });

    doc.font('Helvetica')
        .fontSize(11)
        .fillColor('#bae6fd')
        .text(
            'Ventas, gastos, efectivo y resultado de la jornada',
            50,
            458,
            {
                width: anchoPagina - 100,
                align: 'center'
            }
        );

    doc.moveTo(98, 492)
        .lineTo(anchoPagina - 98, 492)
        .lineWidth(5)
        .strokeColor('#10b981')
        .stroke();

    doc.roundedRect(68, 530, anchoPagina - 136, 135, 13)
        .lineWidth(1)
        .fillAndStroke('#031424', '#1e4054');

    doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#10b981')
        .text('INFORMACIÓN DEL CORTE', 88, 552, {
            width: anchoPagina - 176,
            align: 'center'
        });

    doc.font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#ffffff')
        .text(
            texto(jornada, 'Jornada sin nombre'),
            88,
            577,
            {
                width: anchoPagina - 176,
                align: 'center'
            }
        );

    doc.font('Helvetica')
        .fontSize(9)
        .fillColor('#cbd5e1')
        .text(
            `${texto(puesto, 'Sin puesto')} · ${texto(fechaBase, 'Sin fecha')}`,
            88,
            605,
            {
                width: anchoPagina - 176,
                align: 'center'
            }
        );

    doc.font('Helvetica')
        .fontSize(8)
        .fillColor('#94a3b8')
        .text(
            `Folio: ${idCorte} · Generado: ${fechaGeneracion}`,
            88,
            628,
            {
                width: anchoPagina - 176,
                align: 'center'
            }
        );

    doc.font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#f97316')
        .text(
            'JuguetesFun',
            46,
            altoPagina - 72,
            {
                lineBreak: false
            }
        );

    doc.font('Helvetica')
        .fontSize(7)
        .fillColor('#94a3b8')
        .text(
            'Sistema de ventas, inventario y control operativo',
            46,
            altoPagina - 58,
            {
                lineBreak: false
            }
        );

    doc.font('Helvetica')
        .fontSize(7)
        .fillColor('#94a3b8')
        .text(
            'Uso interno y operativo',
            anchoPagina - 196,
            altoPagina - 65,
            {
                width: 150,
                align: 'right',
                lineBreak: false
            }
        );

    doc.restore();
}

function dibujarEncabezadoPdfCorte(doc, {
    idCorte,
    fechaGeneracion,
    titulo = 'Reporte de corte de caja'
}) {
    const rutaLogo = obtenerRutaLogoPdfCorte();
    const anchoPagina = doc.page.width;

    doc.save();

    doc.rect(0, 0, anchoPagina, 78).fill('#ffffff');

    const logoAgregado = dibujarLogoPdfCorte(
        doc,
        rutaLogo,
        50,
        10,
        {
            fit: [105, 52],
            align: 'left',
            valign: 'center'
        }
    );

    if (!logoAgregado) {
        doc.font('Helvetica-Bold')
            .fontSize(15)
            .fillColor('#0f172a')
            .text('JuguetesFun', 50, 28);
    }

    doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0f172a')
        .text(
            texto(titulo).toUpperCase(),
            255,
            19,
            {
                width: anchoPagina - 305,
                align: 'right'
            }
        );

    doc.font('Helvetica')
        .fontSize(7.5)
        .fillColor('#475569')
        .text(
            `Sistema de ventas, inventario y control operativo · Folio ${idCorte}`,
            225,
            36,
            {
                width: anchoPagina - 275,
                align: 'right'
            }
        );

    doc.font('Helvetica')
        .fontSize(7)
        .fillColor('#059669')
        .text(
            `Generado: ${fechaGeneracion}`,
            225,
            51,
            {
                width: anchoPagina - 275,
                align: 'right'
            }
        );

    doc.moveTo(50, 68)
        .lineTo(anchoPagina - 50, 68)
        .lineWidth(0.6)
        .strokeColor('#cbd5e1')
        .stroke();

    doc.restore();
    doc.y = 92;
}

async function descargarPdfCorte(req, res) {
    try {
        const { idCorte } = req.params;

        const { data: corte, error: corteError } = await supabaseAdmin
            .from('cortes_caja')
            .select('*')
            .eq('id_corte', idCorte)
            .single();

        if (corteError || !corte) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Corte de caja no encontrado.'
            });
        }

        const { data: jornada } = await supabaseAdmin
            .from('jornadas')
            .select('*')
            .eq('id_jornada', corte.id_jornada)
            .maybeSingle();

        const { data: puesto } = jornada?.id_puesto
            ? await supabaseAdmin
                .from('puestos')
                .select('nombre')
                .eq('id_puesto', jornada.id_puesto)
                .maybeSingle()
            : { data: null };

        const idResponsable = corte.realizado_por || corte.cerrado_por;

        const { data: responsable } = idResponsable
            ? await supabaseAdmin
                .from('perfiles')
                .select('nombre_completo, username')
                .eq('id_perfil', idResponsable)
                .maybeSingle()
            : { data: null };

        const { data: gastos } = await supabaseAdmin
            .from('gastos_jornada')
            .select('concepto, monto, fecha_hora')
            .eq('id_jornada', corte.id_jornada)
            .order('fecha_hora', { ascending: true });

        const { data: historial } = await supabaseAdmin
            .from('cortes_caja_historial')
            .select('motivo, fecha_modificacion, modificado_por')
            .eq('id_corte', idCorte)
            .order('fecha_modificacion', { ascending: true });

        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            bufferPages: true,
            info: {
                Title: `Corte de caja ${texto(jornada?.nombre_jornada, idCorte)}`,
                Author: 'JuguetesFun'
            }
        });

        const partes = [];
        doc.on('data', (parte) => partes.push(parte));

        const pdfTerminado = new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(partes)));
            doc.on('error', reject);
        });

        const fechaGeneracion = formatoFecha(
            new Date().toISOString()
        );

        const datosEncabezado = {
            idCorte,
            fechaGeneracion,
            titulo: 'Reporte de corte de caja'
        };

        dibujarPortadaPdfCorte(doc, {
            idCorte,
            fechaGeneracion,
            jornada: jornada?.nombre_jornada,
            puesto: puesto?.nombre,
            fechaBase: jornada?.fecha_base
        });

        doc.on('pageAdded', () => {
            dibujarEncabezadoPdfCorte(doc, datosEncabezado);
        });

        doc.addPage();

        doc.font('Helvetica-Bold')
            .fontSize(15)
            .fillColor('#0f172a')
            .text('Información de la jornada');

        doc.moveDown(0.8);

        agregarFilaPdf(doc, 'Jornada', jornada?.nombre_jornada);
        agregarFilaPdf(doc, 'Puesto', puesto?.nombre);
        agregarFilaPdf(doc, 'Fecha base', jornada?.fecha_base);
        agregarFilaPdf(doc, 'Apertura', formatoFecha(jornada?.fecha_hora_inicio));
        agregarFilaPdf(doc, 'Cierre', formatoFecha(jornada?.fecha_hora_cierre_real));
        agregarFilaPdf(
            doc,
            'Responsable del corte',
            responsable?.nombre_completo || responsable?.username
        );
        agregarFilaPdf(doc, 'Fecha del corte', formatoFecha(corte.fecha_hora_corte));

        doc.moveDown(0.8);

        doc.font('Helvetica-Bold')
            .fontSize(15)
            .fillColor('#0f172a')
            .text('Resumen financiero');

        doc.moveDown(0.8);

        agregarFilaPdf(doc, 'Total de ventas', formatoMoneda(corte.total_ventas));
        agregarFilaPdf(doc, 'Efectivo', formatoMoneda(corte.total_efectivo));
        agregarFilaPdf(doc, 'Transferencias', formatoMoneda(corte.total_transferencia));
        agregarFilaPdf(doc, 'Terminal / tarjeta', formatoMoneda(corte.total_terminal));
        agregarFilaPdf(doc, 'Otros pagos', formatoMoneda(corte.total_otros));
        agregarFilaPdf(doc, 'Gastos', formatoMoneda(corte.total_gastos), {
            color: '#dc2626'
        });
        agregarFilaPdf(doc, 'Efectivo esperado', formatoMoneda(corte.efectivo_esperado));
        agregarFilaPdf(doc, 'Efectivo contado', formatoMoneda(corte.efectivo_contado));
        agregarFilaPdf(doc, 'Diferencia', formatoMoneda(corte.diferencia), {
            color: Math.abs(numero(corte.diferencia)) <= 0.01
                ? '#059669'
                : '#dc2626'
        });
        agregarFilaPdf(doc, 'Ganancia bruta', formatoMoneda(corte.ganancia_bruta));
        agregarFilaPdf(doc, 'Ganancia neta', formatoMoneda(corte.ganancia_neta));

        if ((gastos || []).length > 0) {
            doc.addPage();

            doc.font('Helvetica-Bold')
                .fontSize(15)
                .fillColor('#0f172a')
                .text('Gastos de la jornada');

            doc.moveDown();

            for (const gasto of gastos) {
                agregarFilaPdf(
                    doc,
                    texto(gasto.concepto, 'Gasto'),
                    `${formatoMoneda(gasto.monto)} - ${formatoFecha(gasto.fecha_hora)}`
                );
            }
        }

        doc.moveDown();

        doc.font('Helvetica-Bold')
            .fontSize(12)
            .fillColor('#0f172a')
            .text('Observaciones');

        doc.moveDown(0.5);

        doc.font('Helvetica')
            .fontSize(10)
            .fillColor('#334155')
            .text(texto(corte.observaciones, 'Sin observaciones.'), {
                width: 495
            });

        if ((historial || []).length > 0) {
            doc.moveDown();

            doc.font('Helvetica-Bold')
                .fontSize(12)
                .fillColor('#0f172a')
                .text('Historial de modificaciones');

            doc.moveDown(0.5);

            historial.forEach((item, indice) => {
                doc.font('Helvetica')
                    .fontSize(9)
                    .fillColor('#475569')
                    .text(
                        `${indice + 1}. ${formatoFecha(item.fecha_modificacion)} - ${texto(item.motivo)}`
                    );
            });
        }

        if (doc.y > 690) {
            doc.addPage();
        }

        doc.moveDown(3);

        const yFirmas = doc.y;

        doc.moveTo(65, yFirmas)
            .lineTo(260, yFirmas)
            .strokeColor('#64748b')
            .stroke();

        doc.moveTo(335, yFirmas)
            .lineTo(530, yFirmas)
            .strokeColor('#64748b')
            .stroke();

        doc.font('Helvetica')
            .fontSize(9)
            .fillColor('#475569')
            .text('Firma del encargado', 65, yFirmas + 8, {
                width: 195,
                align: 'center'
            });

        doc.text('Firma del administrador', 335, yFirmas + 8, {
            width: 195,
            align: 'center'
        });

        const rangoPaginas = doc.bufferedPageRange();
        const paginasContenido = Math.max(1, rangoPaginas.count - 1);

        for (
            let indicePagina = 1;
            indicePagina < rangoPaginas.count;
            indicePagina += 1
        ) {
            doc.switchToPage(
                rangoPaginas.start + indicePagina
            );

            doc.moveTo(50, doc.page.height - 92)
                .lineTo(doc.page.width - 50, doc.page.height - 92)
                .lineWidth(0.4)
                .strokeColor('#cbd5e1')
                .stroke();

            doc.font('Helvetica')
                .fontSize(7)
                .fillColor('#64748b')
                .text(
                    'JuguetesFun · Sistema de ventas, inventario y control operativo',
                    50,
                    doc.page.height - 82,
                    {
                        width: 350,
                        lineBreak: false
                    }
                );

            doc.text(
                `Página ${indicePagina} de ${paginasContenido}`,
                doc.page.width - 160,
                doc.page.height - 82,
                {
                    width: 110,
                    align: 'right',
                    lineBreak: false
                }
            );
        }

        doc.end();

        const buffer = await pdfTerminado;

        const nombreBase = texto(jornada?.nombre_jornada, 'Corte')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '');

        return res.json({
            ok: true,
            archivo: `Corte_${nombreBase || 'Jornada'}_${jornada?.fecha_base || 'sin_fecha'}.pdf`,
            mime_type: 'application/pdf',
            contenido_base64: buffer.toString('base64')
        });

    } catch (error) {
        console.error('Error al generar PDF del corte:', error);

        return res.status(500).json({
            ok: false,
            mensaje: 'No se pudo generar el PDF del corte de caja.',
            error: error.message
        });
    }
}

module.exports = {
    obtenerJornadasParaCorte,
    obtenerResumenCorte,
    obtenerCortePorJornada,
    registrarGasto,
    eliminarGasto,
    guardarCorteCaja,
    modificarCorteCaja,
    obtenerHistorialCorte,
    descargarPdfCorte
};