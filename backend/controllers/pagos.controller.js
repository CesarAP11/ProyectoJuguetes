const { supabaseAdmin } = require('../services/supabase.service');

async function listarMetodosPago(req, res) {
    try {
        const { data, error } = await supabaseAdmin
            .from('metodos_pago')
            .select('id_metodo_pago, nombre, codigo, activo')
            .order('nombre', { ascending: true });

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar métodos de pago.',
                error: error.message
            });
        }

        res.json({
            ok: true,
            metodosPago: data || []
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al consultar métodos de pago.',
            error: error.message
        });
    }
}

async function listarMetodosPagoActivos(req, res) {
    try {
        const { data, error } = await supabaseAdmin
            .from('metodos_pago')
            .select('id_metodo_pago, nombre, codigo, activo')
            .eq('activo', true)
            .order('nombre', { ascending: true });

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar métodos de pago activos.',
                error: error.message
            });
        }

        res.json({
            ok: true,
            metodosPago: data || []
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al consultar métodos de pago activos.',
            error: error.message
        });
    }
}

async function crearMetodoPago(req, res) {
    try {
        const { nombre, codigo } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El nombre del método de pago es obligatorio.'
            });
        }

        if (!codigo || !codigo.trim()) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El código del método de pago es obligatorio.'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('metodos_pago')
            .insert({
                nombre: nombre.trim(),
                codigo: codigo.trim().toLowerCase(),
                activo: true
            })
            .select('id_metodo_pago, nombre, codigo, activo')
            .single();

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo crear el método de pago.',
                error: error.message
            });
        }

        res.status(201).json({
            ok: true,
            mensaje: 'Método de pago creado correctamente.',
            metodoPago: data
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al crear método de pago.',
            error: error.message
        });
    }
}

async function actualizarMetodoPago(req, res) {
    try {
        const { idMetodoPago } = req.params;
        const { nombre, codigo, activo } = req.body;

        if (!idMetodoPago) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió el método de pago.'
            });
        }

        const datosActualizar = {};

        if (nombre !== undefined) {
            if (!nombre.trim()) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El nombre no puede estar vacío.'
                });
            }

            datosActualizar.nombre = nombre.trim();
        }

        if (codigo !== undefined) {
            if (!codigo.trim()) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El código no puede estar vacío.'
                });
            }

            datosActualizar.codigo = codigo.trim().toLowerCase();
        }

        if (activo !== undefined) {
            datosActualizar.activo = Boolean(activo);
        }

        if (Object.keys(datosActualizar).length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No hay datos para actualizar.'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('metodos_pago')
            .update(datosActualizar)
            .eq('id_metodo_pago', idMetodoPago)
            .select('id_metodo_pago, nombre, codigo, activo')
            .single();

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo actualizar el método de pago.',
                error: error.message
            });
        }

        res.json({
            ok: true,
            mensaje: 'Método de pago actualizado correctamente.',
            metodoPago: data
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al actualizar método de pago.',
            error: error.message
        });
    }
}

async function cambiarEstadoMetodoPago(req, res) {
    try {
        const { idMetodoPago } = req.params;
        const { activo } = req.body;

        if (!idMetodoPago) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se recibió el método de pago.'
            });
        }

        if (activo === undefined) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado activo es obligatorio.'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('metodos_pago')
            .update({
                activo: Boolean(activo)
            })
            .eq('id_metodo_pago', idMetodoPago)
            .select('id_metodo_pago, nombre, codigo, activo')
            .single();

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo cambiar el estado del método de pago.',
                error: error.message
            });
        }

        res.json({
            ok: true,
            mensaje: Boolean(activo)
                ? 'Método de pago activado correctamente.'
                : 'Método de pago desactivado correctamente.',
            metodoPago: data
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al cambiar estado del método de pago.',
            error: error.message
        });
    }
}

module.exports = {
    listarMetodosPago,
    listarMetodosPagoActivos,
    obtenerMetodosPago: listarMetodosPago,
    obtenerMetodosPagoActivos: listarMetodosPagoActivos,
    crearMetodoPago,
    actualizarMetodoPago,
    cambiarEstadoMetodoPago
};