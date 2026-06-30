const { supabaseAdmin } = require('../services/supabase.service');

async function obtenerCatalogosVentas(req, res) {
    try {
        const { data: jornadas, error: jornadasError } = await supabaseAdmin
            .from('jornadas')
            .select(`
                id_jornada,
                nombre_jornada,
                fecha_base,
                id_puesto,
                puestos (
                    nombre
                )
            `)
            .eq('estado', 'abierta')
            .order('fecha_creacion', { ascending: false });

        if (jornadasError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al cargar jornadas abiertas.',
                error: jornadasError.message
            });
        }

        const { data: metodosPago, error: metodosError } = await supabaseAdmin
            .from('metodos_pago')
            .select('id_metodo_pago, nombre, codigo, activo')
            .eq('activo', true)
            .order('nombre', { ascending: true });

        if (metodosError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al cargar métodos de pago.',
                error: metodosError.message
            });
        }

        const jornadasFormateadas = (jornadas || []).map((jornada) => ({
            id_jornada: jornada.id_jornada,
            nombre_jornada: jornada.nombre_jornada,
            fecha_base: jornada.fecha_base,
            id_puesto: jornada.id_puesto,
            puesto: jornada.puestos?.nombre || 'Sin puesto'
        }));

        res.json({
            ok: true,
            jornadas: jornadasFormateadas,
            metodosPago: metodosPago || []
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al cargar catálogos de venta.',
            error: error.message
        });
    }
}

async function listarInventarioPorJornada(req, res) {
    try {
        const { idJornada } = req.params;

        const { data: jornada, error: jornadaError } = await supabaseAdmin
            .from('jornadas')
            .select('id_jornada, id_puesto, estado')
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
                mensaje: 'La jornada seleccionada no está abierta.'
            });
        }

        const { data: inventarioBase, error: inventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .select('*')
            .eq('id_puesto', jornada.id_puesto)
            .eq('estado', 'activo')
            .gt('cantidad_disponible', 0)
            .order('ultima_actualizacion', { ascending: false });

        if (inventarioError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar inventario.',
                error: inventarioError.message
            });
        }

        if (!inventarioBase || inventarioBase.length === 0) {
            return res.json({
                ok: true,
                inventario: []
            });
        }

        const idsProductos = [...new Set(inventarioBase.map(item => item.id_producto))];
        const idsPropietarios = [...new Set(inventarioBase.map(item => item.id_propietario))];
        const idsLotes = [...new Set(inventarioBase.map(item => item.id_lote))];

        const [productosRes, propietariosRes, lotesRes] = await Promise.all([
            supabaseAdmin
                .from('productos')
                .select('id_producto, nombre, descripcion, id_categoria, foto_url, foto_path')
                .in('id_producto', idsProductos),

            supabaseAdmin
                .from('propietarios')
                .select('id_propietario, nombre')
                .in('id_propietario', idsPropietarios),

            supabaseAdmin
                .from('lotes_inventario')
                .select('id_lote, costo_unitario, precio_venta_sugerido')
                .in('id_lote', idsLotes)
        ]);

        if (productosRes.error || propietariosRes.error || lotesRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar datos relacionados del inventario.',
                error: {
                    productos: productosRes.error?.message || null,
                    propietarios: propietariosRes.error?.message || null,
                    lotes: lotesRes.error?.message || null
                }
            });
        }

        const mapaProductos = new Map((productosRes.data || []).map(item => [item.id_producto, item]));
        const mapaPropietarios = new Map((propietariosRes.data || []).map(item => [item.id_propietario, item]));
        const mapaLotes = new Map((lotesRes.data || []).map(item => [item.id_lote, item]));

        const inventario = inventarioBase.map((item) => {
            const producto = mapaProductos.get(item.id_producto);
            const propietario = mapaPropietarios.get(item.id_propietario);
            const lote = mapaLotes.get(item.id_lote);

            return {
                id_inventario_puesto: item.id_inventario_puesto,
                producto: producto?.nombre || 'Sin nombre',
                descripcion: producto?.descripcion || '',
                foto_url: producto?.foto_url || null,
                foto_path: producto?.foto_path || null,
                propietario: propietario?.nombre || 'Sin propietario',
                cantidad_disponible: Number(item.cantidad_disponible || 0),
                precio_venta_sugerido: Number(item.precio_venta_sugerido || lote?.precio_venta_sugerido || 0)
            };
        });

        res.json({
            ok: true,
            inventario
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al listar inventario de venta.',
            error: error.message
        });
    }
}

async function restaurarInventarioPorError(detallesInsertados, idVenta) {
    try {
        for (const detalle of detallesInsertados) {
            const { data: inv } = await supabaseAdmin
                .from('inventario_puesto')
                .select('cantidad_disponible')
                .eq('id_inventario_puesto', detalle.id_inventario_puesto)
                .single();

            if (inv) {
                await supabaseAdmin
                    .from('inventario_puesto')
                    .update({
                        cantidad_disponible: Number(inv.cantidad_disponible || 0) + Number(detalle.cantidad || 0),
                        ultima_actualizacion: new Date().toISOString()
                    })
                    .eq('id_inventario_puesto', detalle.id_inventario_puesto);
            }
        }

        await supabaseAdmin
            .from('movimientos_inventario')
            .delete()
            .eq('id_venta', idVenta);

        await supabaseAdmin
            .from('detalle_ventas')
            .delete()
            .eq('id_venta', idVenta);

        await supabaseAdmin
            .from('pagos_venta')
            .delete()
            .eq('id_venta', idVenta);

        await supabaseAdmin
            .from('ventas')
            .delete()
            .eq('id_venta', idVenta);

    } catch (error) {
        console.error('Error al restaurar inventario:', error.message);
    }
}

async function registrarVenta(req, res) {
    let idVentaCreada = null;
    const detallesInsertados = [];

    try {
        const { id_jornada, productos, pagos, observaciones } = req.body;

        if (!id_jornada) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Selecciona una jornada.'
            });
        }

        if (!Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Agrega al menos un producto a la venta.'
            });
        }

        if (!Array.isArray(pagos) || pagos.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Agrega al menos un método de pago.'
            });
        }

        const { data: jornada, error: jornadaError } = await supabaseAdmin
            .from('jornadas')
            .select('id_jornada, estado')
            .eq('id_jornada', id_jornada)
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
                mensaje: 'No se puede vender en una jornada cerrada.'
            });
        }

        const totalProductos = productos.reduce((suma, item) => {
            return suma + (Number(item.cantidad) * Number(item.precio_unitario_venta));
        }, 0);

        const totalPagos = pagos.reduce((suma, item) => {
            return suma + Number(item.monto);
        }, 0);

        if (totalProductos <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El total de la venta debe ser mayor a 0.'
            });
        }

        if (Math.abs(totalProductos - totalPagos) > 0.01) {
            return res.status(400).json({
                ok: false,
                mensaje: `El total de pagos (${totalPagos}) no coincide con el total de venta (${totalProductos}).`
            });
        }

        const { data: venta, error: ventaError } = await supabaseAdmin
            .from('ventas')
            .insert({
                id_jornada,
                id_vendedor: req.usuario.id,
                fecha_venta: new Date().toISOString(),
                total_venta: 0,
                estado: 'pagada',
                observaciones: observaciones || null
            })
            .select('id_venta')
            .single();

        if (ventaError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo crear la venta.',
                error: ventaError.message
            });
        }

        idVentaCreada = venta.id_venta;

        for (const producto of productos) {
            const cantidad = Number(producto.cantidad);
            const precio = Number(producto.precio_unitario_venta);

            if (!producto.id_inventario_puesto || cantidad <= 0 || precio < 0) {
                await restaurarInventarioPorError(detallesInsertados, idVentaCreada);

                return res.status(400).json({
                    ok: false,
                    mensaje: 'Producto inválido en la venta.'
                });
            }

            const { data: detalle, error: detalleError } = await supabaseAdmin
                .from('detalle_ventas')
                .insert({
                    id_venta: idVentaCreada,
                    id_inventario_puesto: producto.id_inventario_puesto,
                    id_producto: producto.id_producto || null,
                    id_lote: producto.id_lote || null,
                    id_propietario_snapshot: producto.id_propietario_snapshot || null,
                    cantidad,
                    precio_unitario_venta: precio,
                    costo_unitario_snapshot: 0
                })
                .select('id_detalle_venta, id_inventario_puesto, cantidad')
                .single();

            if (detalleError) {
                await restaurarInventarioPorError(detallesInsertados, idVentaCreada);

                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudo registrar un producto de la venta.',
                    error: detalleError.message
                });
            }

            detallesInsertados.push(detalle);
        }

        for (const pago of pagos) {
            if (!pago.id_metodo_pago || Number(pago.monto) <= 0) {
                await restaurarInventarioPorError(detallesInsertados, idVentaCreada);

                return res.status(400).json({
                    ok: false,
                    mensaje: 'Pago inválido.'
                });
            }

            const { error: pagoError } = await supabaseAdmin
                .from('pagos_venta')
                .insert({
                    id_venta: idVentaCreada,
                    id_metodo_pago: pago.id_metodo_pago,
                    metodo_pago: pago.codigo,
                    monto: Number(pago.monto),
                    referencia: pago.referencia || null,
                    confirmado: true,
                    notas: pago.notas || null
                });

            if (pagoError) {
                await restaurarInventarioPorError(detallesInsertados, idVentaCreada);

                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudo registrar el pago.',
                    error: pagoError.message
                });
            }
        }

        const { data: ventaFinal } = await supabaseAdmin
            .from('ventas')
            .select('id_venta, total_venta')
            .eq('id_venta', idVentaCreada)
            .single();

        res.status(201).json({
            ok: true,
            mensaje: 'Venta registrada correctamente.',
            venta: ventaFinal
        });

    } catch (error) {
        if (idVentaCreada) {
            await restaurarInventarioPorError(detallesInsertados, idVentaCreada);
        }

        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al registrar venta.',
            error: error.message
        });
    }
}

module.exports = {
    obtenerCatalogosVentas,
    listarInventarioPorJornada,
    registrarVenta
};