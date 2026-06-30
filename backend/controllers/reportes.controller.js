const { supabaseAdmin } = require('../services/supabase.service');

function numero(valor) {
    return Number(valor || 0);
}

function crearGrupoBase(nombre) {
    return {
        nombre,
        ventasSet: new Set(),
        ventas: 0,
        piezas: 0,
        total: 0,
        costo_total: 0,
        ganancia: 0
    };
}

function cerrarGrupo(grupo) {
    return {
        ...grupo,
        ventas: grupo.ventasSet.size,
        ventasSet: undefined
    };
}

async function obtenerResumenReportes(req, res) {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        let queryJornadas = supabaseAdmin
            .from('jornadas')
            .select('id_jornada, nombre_jornada, fecha_base, id_puesto, estado');

        if (fecha_inicio) {
            queryJornadas = queryJornadas.gte('fecha_base', fecha_inicio);
        }

        if (fecha_fin) {
            queryJornadas = queryJornadas.lte('fecha_base', fecha_fin);
        }

        const { data: jornadas, error: jornadasError } = await queryJornadas
            .order('fecha_base', { ascending: false });

        if (jornadasError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar jornadas.',
                error: jornadasError.message
            });
        }

        const idsJornadas = (jornadas || []).map((jornada) => jornada.id_jornada);

        if (idsJornadas.length === 0) {
            return res.json({
                ok: true,
                resumen: {
                    total_ventas: 0,
                    piezas_vendidas: 0,
                    monto_total: 0,
                    costo_total: 0,
                    ganancia_total: 0
                },
                porPuesto: [],
                porPropietario: [],
                porVendedor: [],
                porMetodoPago: [],
                productosTop: [],
                detalleVentas: []
            });
        }

        const { data: ventas, error: ventasError } = await supabaseAdmin
            .from('ventas')
            .select('id_venta, id_jornada, id_vendedor, fecha_venta, total_venta, estado')
            .in('id_jornada', idsJornadas)
            .neq('estado', 'cancelada')
            .order('fecha_venta', { ascending: false });

        if (ventasError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar ventas.',
                error: ventasError.message
            });
        }

        const idsVentas = (ventas || []).map((venta) => venta.id_venta);

        if (idsVentas.length === 0) {
            return res.json({
                ok: true,
                resumen: {
                    total_ventas: 0,
                    piezas_vendidas: 0,
                    monto_total: 0,
                    costo_total: 0,
                    ganancia_total: 0
                },
                porPuesto: [],
                porPropietario: [],
                porVendedor: [],
                porMetodoPago: [],
                productosTop: [],
                detalleVentas: []
            });
        }

        const { data: detalles, error: detallesError } = await supabaseAdmin
            .from('detalle_ventas')
            .select(`
                id_detalle_venta,
                id_venta,
                id_inventario_puesto,
                id_producto,
                id_lote,
                id_propietario_snapshot,
                cantidad,
                precio_unitario_venta,
                costo_unitario_snapshot,
                subtotal
            `)
            .in('id_venta', idsVentas);

        if (detallesError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar detalle de ventas.',
                error: detallesError.message
            });
        }
        const { data: pagos, error: pagosError } = await supabaseAdmin
            .from('pagos_venta')
            .select('*')
            .in('id_venta', idsVentas);

        if (pagosError) {
    console.error('Error al consultar pagos:', pagosError);

    return res.status(500).json({
        ok: false,
        mensaje: 'Error al consultar pagos.',
        error: pagosError.message,
        detalle: pagosError
    });
}

        const idsProductos = [...new Set((detalles || []).map((item) => item.id_producto).filter(Boolean))];
        const idsPropietarios = [...new Set((detalles || []).map((item) => item.id_propietario_snapshot).filter(Boolean))];
        const idsVendedores = [...new Set((ventas || []).map((item) => item.id_vendedor).filter(Boolean))];
        const idsPuestos = [...new Set((jornadas || []).map((item) => item.id_puesto).filter(Boolean))];
        const idsMetodosPago = [
            ...new Set(
                (pagos || [])
                    .map((item) => item.id_metodo_pago)
                    .filter(Boolean)
            )
        ];

        const [
            productosRes,
            propietariosRes,
            vendedoresRes,
            puestosRes,
            metodosPagoRes
        ] = await Promise.all([
            idsProductos.length > 0
                ? supabaseAdmin
                    .from('productos')
                    .select(`
                        id_producto,
                        nombre,
                        descripcion,
                        foto_url,
                        foto_path,
                        id_categoria,
                        categorias (
                            id_categoria,
                            nombre
                        )
                    `)
                    .in('id_producto', idsProductos)
                : { data: [], error: null },

            idsPropietarios.length > 0
                ? supabaseAdmin
                    .from('propietarios')
                    .select('id_propietario, nombre')
                    .in('id_propietario', idsPropietarios)
                : { data: [], error: null },

            idsVendedores.length > 0
                ? supabaseAdmin
                    .from('perfiles')
                    .select('id_perfil, nombre_completo, username')
                    .in('id_perfil', idsVendedores)
                : { data: [], error: null },

            idsPuestos.length > 0
                ? supabaseAdmin
                    .from('puestos')
                    .select('id_puesto, nombre')
                    .in('id_puesto', idsPuestos)
                : { data: [], error: null },

            idsMetodosPago.length > 0
                ? supabaseAdmin
                    .from('metodos_pago')
                    .select('id_metodo_pago, nombre, codigo')
                    .in('id_metodo_pago', idsMetodosPago)
                : { data: [], error: null }
        ]);

        if (productosRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar productos.',
                error: productosRes.error.message
            });
        }

        if (propietariosRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar propietarios.',
                error: propietariosRes.error.message
            });
        }

        if (vendedoresRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar vendedores.',
                error: vendedoresRes.error.message
            });
        }

        if (puestosRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar puestos.',
                error: puestosRes.error.message
            });
        }

        if (metodosPagoRes.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar métodos de pago.',
                error: metodosPagoRes.error.message
            });
        }

        const mapaJornadas = new Map();
        const mapaVentas = new Map();
        const mapaProductos = new Map();
        const mapaPropietarios = new Map();
        const mapaVendedores = new Map();
        const mapaPuestos = new Map();
        const mapaMetodosPago = new Map();

        (jornadas || []).forEach((jornada) => {
            mapaJornadas.set(jornada.id_jornada, jornada);
        });

        (ventas || []).forEach((venta) => {
            mapaVentas.set(venta.id_venta, venta);
        });

        (productosRes.data || []).forEach((producto) => {
            mapaProductos.set(producto.id_producto, producto);
        });

        (propietariosRes.data || []).forEach((propietario) => {
            mapaPropietarios.set(propietario.id_propietario, propietario);
        });

        (vendedoresRes.data || []).forEach((vendedor) => {
            mapaVendedores.set(vendedor.id_perfil, vendedor);
        });

        (puestosRes.data || []).forEach((puesto) => {
            mapaPuestos.set(puesto.id_puesto, puesto);
        });

        (metodosPagoRes.data || []).forEach((metodo) => {
            mapaMetodosPago.set(metodo.id_metodo_pago, metodo);
        });

        const resumen = {
            total_ventas: ventas.length,
            piezas_vendidas: 0,
            monto_total: 0,
            costo_total: 0,
            ganancia_total: 0
        };

        const gruposPuesto = new Map();
        const gruposPropietario = new Map();
        const gruposVendedor = new Map();
        const gruposProducto = new Map();
        const gruposMetodoPago = new Map();

        const detalleVentas = [];

        for (const detalle of detalles || []) {
            const venta = mapaVentas.get(detalle.id_venta);
            const jornada = venta ? mapaJornadas.get(venta.id_jornada) : null;
            const puesto = jornada ? mapaPuestos.get(jornada.id_puesto) : null;
            const producto = mapaProductos.get(detalle.id_producto);
            const propietario = mapaPropietarios.get(detalle.id_propietario_snapshot);
            const vendedor = venta ? mapaVendedores.get(venta.id_vendedor) : null;

            const cantidad = numero(detalle.cantidad);
            const precioUnitario = numero(detalle.precio_unitario_venta);
            const costoUnitario = numero(detalle.costo_unitario_snapshot);
            const subtotal = cantidad * precioUnitario;
            const costoTotal = cantidad * costoUnitario;
            const ganancia = subtotal - costoTotal;

            resumen.piezas_vendidas += cantidad;
            resumen.monto_total += subtotal;
            resumen.costo_total += costoTotal;
            resumen.ganancia_total += ganancia;

            const nombrePuesto = puesto?.nombre || 'Sin puesto';
            const nombrePropietario = propietario?.nombre || 'Sin propietario';
            const nombreVendedor = vendedor?.nombre_completo || vendedor?.username || 'Sin vendedor';
            const nombreProducto = producto?.nombre || 'Sin producto';
            const categoriaProducto = producto?.categorias?.nombre || 'Sin categoría';

            if (!gruposPuesto.has(nombrePuesto)) {
                gruposPuesto.set(nombrePuesto, crearGrupoBase(nombrePuesto));
            }

            const grupoPuesto = gruposPuesto.get(nombrePuesto);
            grupoPuesto.ventasSet.add(detalle.id_venta);
            grupoPuesto.piezas += cantidad;
            grupoPuesto.total += subtotal;
            grupoPuesto.costo_total += costoTotal;
            grupoPuesto.ganancia += ganancia;

            if (!gruposPropietario.has(nombrePropietario)) {
                gruposPropietario.set(nombrePropietario, crearGrupoBase(nombrePropietario));
            }

            const grupoPropietario = gruposPropietario.get(nombrePropietario);
            grupoPropietario.ventasSet.add(detalle.id_venta);
            grupoPropietario.piezas += cantidad;
            grupoPropietario.total += subtotal;
            grupoPropietario.costo_total += costoTotal;
            grupoPropietario.ganancia += ganancia;

            if (!gruposVendedor.has(nombreVendedor)) {
                gruposVendedor.set(nombreVendedor, crearGrupoBase(nombreVendedor));
            }

            const grupoVendedor = gruposVendedor.get(nombreVendedor);
            grupoVendedor.ventasSet.add(detalle.id_venta);
            grupoVendedor.piezas += cantidad;
            grupoVendedor.total += subtotal;
            grupoVendedor.costo_total += costoTotal;
            grupoVendedor.ganancia += ganancia;

            const claveProducto = `${detalle.id_producto || 'sin-producto'}-${detalle.id_propietario_snapshot || 'sin-propietario'}`;

            if (!gruposProducto.has(claveProducto)) {
                gruposProducto.set(claveProducto, {
                    id_producto: detalle.id_producto,
                    producto: nombreProducto,
                    descripcion: producto?.descripcion || '',
                    foto_url: producto?.foto_url || null,
                    foto_path: producto?.foto_path || null,
                    categoria: categoriaProducto,
                    propietario: nombrePropietario,
                    piezas: 0,
                    cantidad_vendida: 0,
                    total: 0,
                    total_vendido: 0,
                    costo_total: 0,
                    ganancia: 0,
                    ganancia_total: 0
                });
            }

            const grupoProducto = gruposProducto.get(claveProducto);
            grupoProducto.piezas += cantidad;
            grupoProducto.cantidad_vendida += cantidad;
            grupoProducto.total += subtotal;
            grupoProducto.total_vendido += subtotal;
            grupoProducto.costo_total += costoTotal;
            grupoProducto.ganancia += ganancia;
            grupoProducto.ganancia_total += ganancia;

            detalleVentas.push({
                id_detalle_venta: detalle.id_detalle_venta,
                id_venta: detalle.id_venta,
                id_producto: detalle.id_producto,
                id_propietario: detalle.id_propietario_snapshot,
                id_jornada: venta?.id_jornada || null,
                id_vendedor: venta?.id_vendedor || null,

                foto_url: producto?.foto_url || null,
                foto_path: producto?.foto_path || null,
                producto: nombreProducto,
                descripcion: producto?.descripcion || '',
                categoria: categoriaProducto,
                propietario: nombrePropietario,
                vendedor: nombreVendedor,
                puesto: nombrePuesto,
                jornada: jornada?.nombre_jornada || 'Sin jornada',

                fecha_venta: venta?.fecha_venta || null,
                cantidad_vendida: cantidad,
                cantidad,
                precio_unitario_venta: precioUnitario,
                costo_unitario_snapshot: costoUnitario,
                subtotal,
                total_vendido: subtotal,
                costo_total: costoTotal,
                ganancia
            });
        }

        for (const pago of pagos || []) {
            const venta = mapaVentas.get(pago.id_venta);

            if (!venta) {
                continue;
            }

            const metodo = pago.id_metodo_pago
                ? mapaMetodosPago.get(pago.id_metodo_pago)
                : null;

            const nombreMetodo =
                metodo?.nombre ||
                pago.metodo_pago ||
                pago.nombre_metodo ||
                pago.codigo ||
                'Sin método';

            const monto = numero(pago.monto);

            if (!gruposMetodoPago.has(nombreMetodo)) {
                gruposMetodoPago.set(nombreMetodo, {
                    metodo_pago: nombreMetodo,
                    metodo: nombreMetodo,
                    nombre: nombreMetodo,
                    pagos: 0,
                    cantidad_pagos: 0,
                    total: 0,
                    monto_total: 0,
                    total_pagado: 0
                });
            }

            const grupoMetodo = gruposMetodoPago.get(nombreMetodo);
            grupoMetodo.pagos += 1;
            grupoMetodo.cantidad_pagos += 1;
            grupoMetodo.total += monto;
            grupoMetodo.monto_total += monto;
            grupoMetodo.total_pagado += monto;
        }

        const porPuesto = Array.from(gruposPuesto.values())
            .map((grupo) => {
                const cerrado = cerrarGrupo(grupo);

                return {
                    puesto: cerrado.nombre,
                    nombre_puesto: cerrado.nombre,
                    ventas: cerrado.ventas,
                    total_ventas: cerrado.ventas,
                    piezas: cerrado.piezas,
                    total: cerrado.total,
                    monto_total: cerrado.total,
                    total_vendido: cerrado.total,
                    costo_total: cerrado.costo_total,
                    ganancia: cerrado.ganancia,
                    ganancia_total: cerrado.ganancia
                };
            })
            .sort((a, b) => b.total - a.total);

        const porPropietario = Array.from(gruposPropietario.values())
            .map((grupo) => {
                const cerrado = cerrarGrupo(grupo);

                return {
                    propietario: cerrado.nombre,
                    nombre_propietario: cerrado.nombre,
                    ventas: cerrado.ventas,
                    total_ventas: cerrado.ventas,
                    piezas: cerrado.piezas,
                    cantidad: cerrado.piezas,
                    cantidad_vendida: cerrado.piezas,
                    total: cerrado.total,
                    monto_total: cerrado.total,
                    total_vendido: cerrado.total,
                    costo_total: cerrado.costo_total,
                    ganancia: cerrado.ganancia,
                    ganancia_total: cerrado.ganancia
                };
            })
            .sort((a, b) => b.total - a.total);

        const porVendedor = Array.from(gruposVendedor.values())
            .map((grupo) => {
                const cerrado = cerrarGrupo(grupo);

                return {
                    vendedor: cerrado.nombre,
                    nombre_vendedor: cerrado.nombre,
                    ventas: cerrado.ventas,
                    total_ventas: cerrado.ventas,
                    piezas: cerrado.piezas,
                    total: cerrado.total,
                    monto_total: cerrado.total,
                    total_vendido: cerrado.total,
                    costo_total: cerrado.costo_total,
                    ganancia: cerrado.ganancia,
                    ganancia_total: cerrado.ganancia
                };
            })
            .sort((a, b) => b.total - a.total);

        const productosTop = Array.from(gruposProducto.values())
            .sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);

        const porMetodoPago = Array.from(gruposMetodoPago.values())
            .sort((a, b) => b.total - a.total);

        detalleVentas.sort((a, b) => {
            return new Date(b.fecha_venta || 0) - new Date(a.fecha_venta || 0);
        });

        res.json({
            ok: true,
            filtros: {
                fecha_inicio: fecha_inicio || null,
                fecha_fin: fecha_fin || null
            },
            resumen,
            porPuesto,
            porPropietario,
            porVendedor,
            porMetodoPago,
            productosTop,
            detalleVentas
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al generar reportes.',
            error: error.message
        });
    }
}

module.exports = {
    obtenerResumenReportes
};