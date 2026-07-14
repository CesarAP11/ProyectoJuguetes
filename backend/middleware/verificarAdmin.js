const { supabaseAdmin } = require('../services/supabase.service');

async function verificarAdminPrincipal(req, res, next) {
    try {
        const idUsuario = req.usuario.id;

        const { data: perfil, error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .select('id_perfil, nombre_completo, es_admin_principal, activo')
            .eq('id_perfil', idUsuario)
            .single();

        if (perfilError || !perfil) {
            return res.status(403).json({
                ok: false,
                mensaje: 'Perfil no encontrado.'
            });
        }

        if (!perfil.activo) {
            return res.status(403).json({
                ok: false,
                mensaje: 'Usuario desactivado.'
            });
        }

        if (!perfil.es_admin_principal) {
            return res.status(403).json({
                ok: false,
                mensaje: 'Solo el administrador principal puede realizar esta acción.'
            });
        }

        req.perfil = perfil;
        next();

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al verificar administrador principal.',
            error: error.message
        });
    }
}

module.exports = verificarAdminPrincipal;