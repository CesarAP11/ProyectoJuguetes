const { supabaseAdmin } = require('../services/supabase.service');

async function obtenerCatalogos(req, res) {
    try {
        const [categoriasRes, propietariosRes, puestosRes] = await Promise.all([
            supabaseAdmin
                .from('categorias')
                .select('id_categoria, nombre')
                .eq('activo', true)
                .order('nombre'),

            supabaseAdmin
                .from('propietarios')
                .select('id_propietario, nombre, tipo')
                .eq('activo', true)
                .order('nombre'),

            supabaseAdmin
                .from('puestos')
                .select('id_puesto, nombre, direccion')
                .eq('activo', true)
                .order('nombre')
        ]);

        if (categoriasRes.error || propietariosRes.error || puestosRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al cargar catálogos.',
                error: {
                    categorias: categoriasRes.error?.message || null,
                    propietarios: propietariosRes.error?.message || null,
                    puestos: puestosRes.error?.message || null
                }
            });
        }

        res.json({
            ok: true,
            categorias: categoriasRes.data || [],
            propietarios: propietariosRes.data || [],
            puestos: puestosRes.data || []
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al obtener catálogos.',
            error: error.message
        });
    }
}

async function listarInventario(req, res) {
    try {
        const { data, error } = await supabaseAdmin
            .from('inventario_puesto')
            .select(`
                id_inventario_puesto,
                cantidad_disponible,
                cantidad_reservada,
                precio_venta_sugerido,
                ultima_actualizacion,
                puestos (
                    nombre
                ),
                propietarios (
                    nombre
                ),
                productos (
                    nombre,
                    descripcion,
                    foto_url,
                    foto_path,
                    categorias (
                        nombre
                    )
                ),
                lotes_inventario (
                    id_lote,
                    cantidad_inicial,
                    costo_unitario,
                    precio_venta_sugerido,
                    estado,
                    compras (
                        nombre_compra,
                        fecha_compra
                    )
                )
            `)
            .neq('estado', 'eliminado')
            .order('ultima_actualizacion', { ascending: false });

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al listar inventario.',
                error: error.message
            });
        }

        const inventario = (data || []).map((item) => {
            const costo = Number(item.lotes_inventario?.costo_unitario || 0);
            const precio = Number(item.precio_venta_sugerido || item.lotes_inventario?.precio_venta_sugerido || 0);
            const disponible = Number(item.cantidad_disponible || 0);

            return {
                id_inventario_puesto: item.id_inventario_puesto,
                id_puesto: item.id_puesto,
                producto: item.productos?.nombre || 'Sin nombre',
                descripcion: item.productos?.descripcion || '',
                foto_url: item.productos?.foto_url || null,
                foto_path: item.productos?.foto_path || null,
                categoria: item.productos?.categorias?.nombre || 'Sin categoría',
                propietario: item.propietarios?.nombre || 'Sin propietario',
                puesto: item.puestos?.nombre || 'Sin puesto',
                compra: item.lotes_inventario?.compras?.nombre_compra || 'Sin compra',
                fecha_compra: item.lotes_inventario?.compras?.fecha_compra || null,
                cantidad_inicial: item.lotes_inventario?.cantidad_inicial || 0,
                cantidad_disponible: disponible,
                costo_unitario: costo,
                precio_venta_sugerido: precio,
                ganancia_estimada_unitaria: precio - costo,
                valor_inventario_costo: disponible * costo,
                valor_inventario_venta: disponible * precio,
                estado_lote: item.lotes_inventario?.estado || 'disponible'
            };
        });

        res.json({
            ok: true,
            inventario
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al listar inventario.',
            error: error.message
        });
    }
}

async function registrarEntradaInventario(req, res) {
    try {
        const {
            id_propietario,
            id_puesto,
            id_categoria,
            nombre_producto,
            descripcion,
            nombre_compra,
            fecha_compra,
            cantidad,
            costo_unitario,
            precio_venta_sugerido,
            foto_url,
            foto_path
        } = req.body;

        if (
            !id_propietario ||
            !id_puesto ||
            !id_categoria ||
            !nombre_producto ||
            !nombre_compra ||
            !fecha_compra ||
            Number(cantidad) <= 0 ||
            Number(costo_unitario) < 0 ||
            Number(precio_venta_sugerido) < 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Completa todos los campos obligatorios del inventario.'
            });
        }

        const cantidadNumero = Number(cantidad);
        const costoNumero = Number(costo_unitario);
        const precioNumero = Number(precio_venta_sugerido);
        const subtotalCompra = cantidadNumero * costoNumero;

        let producto = null;

        const { data: productoExistente, error: buscarProductoError } = await supabaseAdmin
            .from('productos')
            .select('id_producto, nombre')
            .ilike('nombre', nombre_producto.trim())
            .maybeSingle();

        if (buscarProductoError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar producto.',
                error: buscarProductoError.message
            });
        }

        if (productoExistente) {
            producto = productoExistente;

            const datosActualizarProducto = {
                id_categoria,
                descripcion: descripcion || null,
                activo: true
            };

            if (foto_url) {
                datosActualizarProducto.foto_url = foto_url;
                datosActualizarProducto.foto_path = foto_path || null;
            }

            const { error: actualizarProductoError } = await supabaseAdmin
                .from('productos')
                .update(datosActualizarProducto)
                .eq('id_producto', producto.id_producto);

            if (actualizarProductoError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudo actualizar el producto.',
                    error: actualizarProductoError.message
                });
            }

        } else {
            const { data: productoNuevo, error: productoError } = await supabaseAdmin
                .from('productos')
                .insert({
                    id_categoria,
                    nombre: nombre_producto.trim(),
                    descripcion: descripcion || null,
                    foto_url: foto_url || null,
                    foto_path: foto_path || null,
                    activo: true
                })
                .select('id_producto, nombre')
                .single();

            if (productoError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudo crear el producto.',
                    error: productoError.message
                });
            }

            producto = productoNuevo;
        }

        let compra = null;

        const { data: compraExistente, error: buscarCompraError } = await supabaseAdmin
            .from('compras')
            .select('id_compra, total_compra')
            .eq('id_propietario', id_propietario)
            .eq('nombre_compra', nombre_compra.trim())
            .maybeSingle();

        if (buscarCompraError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar compra.',
                error: buscarCompraError.message
            });
        }

        if (compraExistente) {
            compra = compraExistente;

            const nuevoTotal = Number(compra.total_compra || 0) + subtotalCompra;

            const { error: actualizarCompraError } = await supabaseAdmin
                .from('compras')
                .update({
                    total_compra: nuevoTotal
                })
                .eq('id_compra', compra.id_compra);

            if (actualizarCompraError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudo actualizar la compra.',
                    error: actualizarCompraError.message
                });
            }

        } else {
            const { data: compraNueva, error: compraError } = await supabaseAdmin
                .from('compras')
                .insert({
                    id_propietario,
                    nombre_compra: nombre_compra.trim(),
                    fecha_compra,
                    total_compra: subtotalCompra
                })
                .select('id_compra, total_compra')
                .single();

            if (compraError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudo crear la compra.',
                    error: compraError.message
                });
            }

            compra = compraNueva;
        }

        const { data: lote, error: loteError } = await supabaseAdmin
            .from('lotes_inventario')
            .insert({
                id_compra: compra.id_compra,
                id_producto: producto.id_producto,
                id_propietario,
                cantidad_inicial: cantidadNumero,
                cantidad_disponible: cantidadNumero,
                costo_unitario: costoNumero,
                precio_venta_sugerido: precioNumero,
                estado: 'disponible'
            })
            .select('id_lote')
            .single();

        if (loteError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo crear el lote de inventario.',
                error: loteError.message
            });
        }

        const { data: inventarioPuesto, error: inventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .insert({
                id_puesto,
                id_producto: producto.id_producto,
                id_lote: lote.id_lote,
                id_propietario,
                cantidad_disponible: cantidadNumero,
                precio_venta_sugerido: precioNumero
            })
            .select('id_inventario_puesto')
            .single();

        if (inventarioError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo registrar el inventario en el puesto.',
                error: inventarioError.message
            });
        }

        res.status(201).json({
            ok: true,
            mensaje: 'Inventario registrado correctamente.',
            datos: {
                id_producto: producto.id_producto,
                id_compra: compra.id_compra,
                id_lote: lote.id_lote,
                id_inventario_puesto: inventarioPuesto.id_inventario_puesto,
                foto_url: foto_url || null
            }
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al registrar inventario.',
            error: error.message
        });
    }
}

async function eliminarInventario(req, res) {
    try {
        const { idInventario } = req.params;
        const { motivo } = req.body;

        if (!idInventario) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió el inventario a eliminar.'
            });
        }

        if (!motivo || !motivo.trim()) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Es obligatorio escribir un motivo de eliminación.'
            });
        }

        const { data: inventario, error: inventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .select('*')
            .eq('id_inventario_puesto', idInventario)
            .single();

        if (inventarioError || !inventario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Inventario no encontrado.'
            });
        }

        if (inventario.estado === 'eliminado') {
            return res.status(400).json({
                ok: false,
                mensaje: 'Este inventario ya fue eliminado anteriormente.'
            });
        }

        const [
            productoRes,
            propietarioRes,
            puestoRes,
            loteRes
        ] = await Promise.all([
            supabaseAdmin
                .from('productos')
                .select('id_producto, nombre, descripcion, foto_url')
                .eq('id_producto', inventario.id_producto)
                .maybeSingle(),

            supabaseAdmin
                .from('propietarios')
                .select('id_propietario, nombre')
                .eq('id_propietario', inventario.id_propietario)
                .maybeSingle(),

            supabaseAdmin
                .from('puestos')
                .select('id_puesto, nombre')
                .eq('id_puesto', inventario.id_puesto)
                .maybeSingle(),

            supabaseAdmin
                .from('lotes_inventario')
                .select('id_lote, cantidad_inicial, cantidad_disponible, costo_unitario, precio_venta_sugerido, estado')
                .eq('id_lote', inventario.id_lote)
                .maybeSingle()
        ]);

        if (productoRes.error || propietarioRes.error || puestoRes.error || loteRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo consultar la información relacionada del inventario.',
                error: {
                    producto: productoRes.error?.message || null,
                    propietario: propietarioRes.error?.message || null,
                    puesto: puestoRes.error?.message || null,
                    lote: loteRes.error?.message || null
                }
            });
        }

        const producto = productoRes.data;
        const propietario = propietarioRes.data;
        const puesto = puestoRes.data;
        const lote = loteRes.data;

        const snapshot = {
            inventario,
            producto,
            propietario,
            puesto,
            lote
        };

        const { error: bajaError } = await supabaseAdmin
            .from('bajas_inventario')
            .insert({
                id_inventario_puesto: inventario.id_inventario_puesto,
                id_producto: inventario.id_producto,
                id_lote: inventario.id_lote,
                id_propietario: inventario.id_propietario,
                id_puesto: inventario.id_puesto,

                producto_nombre: producto?.nombre || 'Sin nombre',
                propietario_nombre: propietario?.nombre || 'Sin propietario',
                puesto_nombre: puesto?.nombre || 'Sin puesto',

                cantidad_disponible_anterior: Number(inventario.cantidad_disponible || 0),
                cantidad_reservada_anterior: Number(inventario.cantidad_reservada || 0),

                costo_unitario: Number(lote?.costo_unitario || 0),
                precio_venta_sugerido: Number(inventario.precio_venta_sugerido || lote?.precio_venta_sugerido || 0),

                motivo: motivo.trim(),
                eliminado_por: req.usuario.id,
                datos_snapshot: snapshot
            });

        if (bajaError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo registrar la baja del inventario.',
                error: bajaError.message
            });
        }

        const { error: updateInventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .update({
                estado: 'eliminado',
                cantidad_disponible: 0,
                cantidad_reservada: 0,
                eliminado_por: req.usuario.id,
                fecha_eliminacion: new Date().toISOString(),
                motivo_eliminacion: motivo.trim(),
                ultima_actualizacion: new Date().toISOString()
            })
            .eq('id_inventario_puesto', idInventario);

        if (updateInventarioError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'La baja se registró, pero no se pudo ocultar el inventario.',
                error: updateInventarioError.message
            });
        }

        if (inventario.id_lote) {
            await supabaseAdmin
                .from('lotes_inventario')
                .update({
                    cantidad_disponible: 0,
                    estado: 'eliminado',
                    ultima_actualizacion: new Date().toISOString()
                })
                .eq('id_lote', inventario.id_lote);
        }

        res.json({
            ok: true,
            mensaje: 'Inventario eliminado correctamente y registrado en historial.'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al eliminar inventario.',
            error: error.message
        });
    }
}

async function actualizarFotoInventario(req, res) {
    try {
        const { idInventario } = req.params;
        const { foto_url, foto_path } = req.body;

        if (!idInventario) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió el inventario.'
            });
        }

        if (!foto_url || !foto_path) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió la foto del producto.'
            });
        }

        const { data: inventario, error: inventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .select('id_inventario_puesto, id_producto')
            .eq('id_inventario_puesto', idInventario)
            .single();

        if (inventarioError || !inventario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Inventario no encontrado.'
            });
        }

        const { error: productoError } = await supabaseAdmin
            .from('productos')
            .update({
                foto_url,
                foto_path
            })
            .eq('id_producto', inventario.id_producto);

        if (productoError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo actualizar la foto del producto.',
                error: productoError.message
            });
        }

        res.json({
            ok: true,
            mensaje: 'Foto actualizada correctamente.'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al actualizar foto.',
            error: error.message
        });
    }
}

async function cambiarPuestoInventario(req, res) {
    try {
        const { idInventario } = req.params;
        const { id_puesto_nuevo, motivo } = req.body;

        if (!idInventario) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió el inventario.'
            });
        }

        if (!id_puesto_nuevo) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Selecciona el nuevo puesto.'
            });
        }

        const { data: inventario, error: inventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .select('*')
            .eq('id_inventario_puesto', idInventario)
            .single();

        if (inventarioError || !inventario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Inventario no encontrado.'
            });
        }

        if (inventario.estado === 'eliminado') {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se puede mover un inventario eliminado.'
            });
        }

        if (inventario.id_puesto === id_puesto_nuevo) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El producto ya está en ese puesto.'
            });
        }

        const [
            productoRes,
            propietarioRes,
            puestoAnteriorRes,
            puestoNuevoRes
        ] = await Promise.all([
            supabaseAdmin
                .from('productos')
                .select('id_producto, nombre, descripcion')
                .eq('id_producto', inventario.id_producto)
                .maybeSingle(),

            supabaseAdmin
                .from('propietarios')
                .select('id_propietario, nombre')
                .eq('id_propietario', inventario.id_propietario)
                .maybeSingle(),

            supabaseAdmin
                .from('puestos')
                .select('id_puesto, nombre')
                .eq('id_puesto', inventario.id_puesto)
                .maybeSingle(),

            supabaseAdmin
                .from('puestos')
                .select('id_puesto, nombre')
                .eq('id_puesto', id_puesto_nuevo)
                .maybeSingle()
        ]);

        if (productoRes.error || propietarioRes.error || puestoAnteriorRes.error || puestoNuevoRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo consultar la información relacionada.',
                error: {
                    producto: productoRes.error?.message || null,
                    propietario: propietarioRes.error?.message || null,
                    puestoAnterior: puestoAnteriorRes.error?.message || null,
                    puestoNuevo: puestoNuevoRes.error?.message || null
                }
            });
        }

        const producto = productoRes.data;
        const propietario = propietarioRes.data;
        const puestoAnterior = puestoAnteriorRes.data;
        const puestoNuevo = puestoNuevoRes.data;

        if (!puestoNuevo) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El nuevo puesto no existe.'
            });
        }

        const motivoFinal = motivo?.trim() || `Cambio automático de puesto a ${puestoNuevo.nombre}`;

        const snapshot = {
            inventario,
            producto,
            propietario,
            puesto_anterior: puestoAnterior,
            puesto_nuevo: puestoNuevo,
            motivo: motivoFinal
        };

        const { error: historialError } = await supabaseAdmin
            .from('cambios_puesto_inventario')
            .insert({
                id_inventario_puesto: inventario.id_inventario_puesto,
                id_producto: inventario.id_producto,
                id_propietario: inventario.id_propietario,

                id_puesto_anterior: inventario.id_puesto,
                id_puesto_nuevo,

                puesto_anterior_nombre: puestoAnterior?.nombre || 'Sin puesto anterior',
                puesto_nuevo_nombre: puestoNuevo?.nombre || 'Sin puesto nuevo',

                producto_nombre: producto?.nombre || 'Sin producto',
                propietario_nombre: propietario?.nombre || 'Sin propietario',

                cantidad_movida: Number(inventario.cantidad_disponible || 0),
                motivo: motivoFinal,

                cambiado_por: req.usuario.id,
                datos_snapshot: snapshot
            });

        if (historialError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo registrar el cambio de puesto.',
                error: historialError.message
            });
        }

        const { error: updateError } = await supabaseAdmin
            .from('inventario_puesto')
            .update({
                id_puesto: id_puesto_nuevo,
                ultima_actualizacion: new Date().toISOString()
            })
            .eq('id_inventario_puesto', idInventario);

        if (updateError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'El cambio se registró, pero no se pudo actualizar el puesto.',
                error: updateError.message
            });
        }

        res.json({
            ok: true,
            mensaje: `Inventario movido correctamente de ${puestoAnterior?.nombre || 'puesto anterior'} a ${puestoNuevo.nombre}.`
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al cambiar puesto del inventario.',
            error: error.message
        });
    }
}

async function resurtirInventario(req, res) {
    try {
        const { idInventario } = req.params;
        const { cantidad, costo_unitario, precio_venta_sugerido } = req.body;

        const cantidadResurtida = Number(cantidad);

        if (!idInventario) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió el inventario.'
            });
        }

        if (!cantidadResurtida || cantidadResurtida <= 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La cantidad a resurtir debe ser mayor a 0.'
            });
        }

        const { data: inventario, error: inventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .select('*')
            .eq('id_inventario_puesto', idInventario)
            .single();

        if (inventarioError || !inventario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Inventario no encontrado.'
            });
        }

        if (inventario.estado === 'eliminado') {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se puede resurtir un inventario eliminado.'
            });
        }

        const [
            productoRes,
            propietarioRes,
            puestoRes,
            loteRes
        ] = await Promise.all([
            supabaseAdmin
                .from('productos')
                .select('id_producto, nombre, descripcion')
                .eq('id_producto', inventario.id_producto)
                .maybeSingle(),

            supabaseAdmin
                .from('propietarios')
                .select('id_propietario, nombre')
                .eq('id_propietario', inventario.id_propietario)
                .maybeSingle(),

            supabaseAdmin
                .from('puestos')
                .select('id_puesto, nombre')
                .eq('id_puesto', inventario.id_puesto)
                .maybeSingle(),

            supabaseAdmin
                .from('lotes_inventario')
                .select('*')
                .eq('id_lote', inventario.id_lote)
                .maybeSingle()
        ]);

        if (productoRes.error || propietarioRes.error || puestoRes.error || loteRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo consultar la información relacionada.',
                error: {
                    producto: productoRes.error?.message || null,
                    propietario: propietarioRes.error?.message || null,
                    puesto: puestoRes.error?.message || null,
                    lote: loteRes.error?.message || null
                }
            });
        }

        const producto = productoRes.data;
        const propietario = propietarioRes.data;
        const puesto = puestoRes.data;
        const lote = loteRes.data;

        const cantidadAnterior = Number(inventario.cantidad_disponible || 0);
        const cantidadFinal = cantidadAnterior + cantidadResurtida;

        const costoFinal = costo_unitario !== undefined && costo_unitario !== ''
            ? Number(costo_unitario)
            : Number(lote?.costo_unitario || 0);

        const precioFinal = precio_venta_sugerido !== undefined && precio_venta_sugerido !== ''
            ? Number(precio_venta_sugerido)
            : Number(inventario.precio_venta_sugerido || lote?.precio_venta_sugerido || 0);

        const snapshot = {
            inventario,
            producto,
            propietario,
            puesto,
            lote,
            cantidad_resurtida: cantidadResurtida,
            cantidad_anterior: cantidadAnterior,
            cantidad_final: cantidadFinal
        };

        const { error: historialError } = await supabaseAdmin
            .from('resurtidos_inventario')
            .insert({
                id_inventario_puesto: inventario.id_inventario_puesto,
                id_producto: inventario.id_producto,
                id_lote: inventario.id_lote,
                id_propietario: inventario.id_propietario,
                id_puesto: inventario.id_puesto,

                producto_nombre: producto?.nombre || 'Sin producto',
                propietario_nombre: propietario?.nombre || 'Sin propietario',
                puesto_nombre: puesto?.nombre || 'Sin puesto',

                cantidad_anterior: cantidadAnterior,
                cantidad_resurtida: cantidadResurtida,
                cantidad_final: cantidadFinal,

                costo_unitario: costoFinal,
                precio_venta_sugerido: precioFinal,

                resurtido_por: req.usuario.id,
                datos_snapshot: snapshot
            });

        if (historialError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo registrar el resurtido.',
                error: historialError.message
            });
        }

        const { error: updateInventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .update({
                cantidad_disponible: cantidadFinal,
                precio_venta_sugerido: precioFinal,
                estado: 'activo',
                ultima_actualizacion: new Date().toISOString()
            })
            .eq('id_inventario_puesto', idInventario);

        if (updateInventarioError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'El resurtido se registró, pero no se pudo actualizar inventario.',
                error: updateInventarioError.message
            });
        }

        if (inventario.id_lote) {
            await supabaseAdmin
                .from('lotes_inventario')
                .update({
                    cantidad_inicial: Number(lote?.cantidad_inicial || 0) + cantidadResurtida,
                    cantidad_disponible: Number(lote?.cantidad_disponible || 0) + cantidadResurtida,
                    costo_unitario: costoFinal,
                    precio_venta_sugerido: precioFinal,
                    estado: 'disponible',
                    ultima_actualizacion: new Date().toISOString()
                })
                .eq('id_lote', inventario.id_lote);
        }

        res.json({
            ok: true,
            mensaje: `Se resurtieron ${cantidadResurtida} piezas correctamente. Existencia actual: ${cantidadFinal}.`
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al resurtir inventario.',
            error: error.message
        });
    }
}

async function cambiarPrecioVentaInventario(req, res) {
    try {
        const { idInventario } = req.params;
        const { precio_venta_sugerido } = req.body;

        if (!idInventario) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió el inventario.'
            });
        }

        if (
            precio_venta_sugerido === undefined ||
            precio_venta_sugerido === null ||
            precio_venta_sugerido === '' ||
            Number(precio_venta_sugerido) < 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Ingresa un precio de venta válido.'
            });
        }

        const precioNuevo = Number(precio_venta_sugerido);

        const { data: inventario, error: inventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .select('*')
            .eq('id_inventario_puesto', idInventario)
            .single();

        if (inventarioError || !inventario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Inventario no encontrado.'
            });
        }

        if (inventario.estado === 'eliminado') {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se puede cambiar el precio de un inventario eliminado.'
            });
        }

        const { error: updateInventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .update({
                precio_venta_sugerido: precioNuevo,
                ultima_actualizacion: new Date().toISOString()
            })
            .eq('id_inventario_puesto', idInventario);

        if (updateInventarioError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo actualizar el precio en inventario.',
                error: updateInventarioError.message
            });
        }

        if (inventario.id_lote) {
            const { error: updateLoteError } = await supabaseAdmin
                .from('lotes_inventario')
                .update({
                    precio_venta_sugerido: precioNuevo,
                    ultima_actualizacion: new Date().toISOString()
                })
                .eq('id_lote', inventario.id_lote);

            if (updateLoteError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Se actualizó el inventario, pero no se pudo actualizar el lote.',
                    error: updateLoteError.message
                });
            }
        }

        res.json({
            ok: true,
            mensaje: 'Precio de venta actualizado correctamente.',
            precio_venta_sugerido: precioNuevo
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al cambiar precio de venta.',
            error: error.message
        });
    }
}

async function cambiarCostoUnitarioInventario(req, res) {
    try {
        const { idInventario } = req.params;
        const { costo_unitario } = req.body;

        if (!idInventario) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió el inventario.'
            });
        }

        if (
            costo_unitario === undefined ||
            costo_unitario === null ||
            costo_unitario === '' ||
            Number(costo_unitario) < 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Ingresa un costo unitario válido.'
            });
        }

        const costoNuevo = Number(costo_unitario);

        const { data: inventario, error: inventarioError } = await supabaseAdmin
            .from('inventario_puesto')
            .select('*')
            .eq('id_inventario_puesto', idInventario)
            .single();

        if (inventarioError || !inventario) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Inventario no encontrado.'
            });
        }

        if (inventario.estado === 'eliminado') {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se puede cambiar el costo de un inventario eliminado.'
            });
        }

        if (!inventario.id_lote) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Este inventario no tiene lote relacionado.'
            });
        }

        const { data: lote, error: loteError } = await supabaseAdmin
            .from('lotes_inventario')
            .select('*')
            .eq('id_lote', inventario.id_lote)
            .single();

        if (loteError || !lote) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Lote de inventario no encontrado.'
            });
        }

        const costoAnterior = Number(lote.costo_unitario || 0);

        const { error: updateLoteError } = await supabaseAdmin
            .from('lotes_inventario')
            .update({
                costo_unitario: costoNuevo,
                ultima_actualizacion: new Date().toISOString()
            })
            .eq('id_lote', inventario.id_lote);

        if (updateLoteError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo actualizar el costo unitario.',
                error: updateLoteError.message
            });
        }

        if (lote.id_compra) {
            const { data: lotesCompra, error: lotesCompraError } = await supabaseAdmin
                .from('lotes_inventario')
                .select('cantidad_inicial, costo_unitario')
                .eq('id_compra', lote.id_compra);

            if (!lotesCompraError && lotesCompra) {
                const nuevoTotalCompra = lotesCompra.reduce((total, item) => {
                    return total + Number(item.cantidad_inicial || 0) * Number(item.costo_unitario || 0);
                }, 0);

                await supabaseAdmin
                    .from('compras')
                    .update({
                        total_compra: nuevoTotalCompra
                    })
                    .eq('id_compra', lote.id_compra);
            }
        }

        await supabaseAdmin
            .from('movimientos_inventario')
            .insert({
                id_inventario_puesto: inventario.id_inventario_puesto,
                id_producto: inventario.id_producto,
                id_lote: inventario.id_lote,
                id_propietario: inventario.id_propietario,
                id_puesto: inventario.id_puesto,
                tipo_movimiento: 'ajuste_costo',
                cantidad: 0,
                stock_anterior: Number(inventario.cantidad_disponible || 0),
                stock_nuevo: Number(inventario.cantidad_disponible || 0),
                descripcion: `Ajuste de costo unitario. Costo anterior: ${costoAnterior}. Costo nuevo: ${costoNuevo}.`,
                registrado_por: req.usuario.id
            });

        res.json({
            ok: true,
            mensaje: 'Costo unitario actualizado correctamente.',
            costo_unitario: costoNuevo
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al cambiar costo unitario.',
            error: error.message
        });
    }
}

module.exports = {
    obtenerCatalogos,
    listarInventario,
    registrarEntradaInventario,
    eliminarInventario,
    actualizarFotoInventario,
    cambiarPuestoInventario,
    resurtirInventario,
    cambiarPrecioVentaInventario,
    cambiarCostoUnitarioInventario
};