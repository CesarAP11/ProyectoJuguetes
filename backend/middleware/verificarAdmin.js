const { supabaseAdmin } = require('../services/supabase.service');

async function verificarAdministrador(req, res, next) {
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

        if (perfil.es_admin_principal) {
            req.perfil = perfil;
            return next();
        }

        const { data: roles, error: rolesError } = await supabaseAdmin
            .from('perfil_roles')
            .select(`
                roles (
                    nombre
                )
            `)
            .eq('id_perfil', idUsuario);

        if (rolesError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron verificar los roles.',
                error: rolesError.message
            });
        }

        const esAdministrador = roles.some((registro) => {
            return registro.roles.nombre === 'administrador';
        });

        if (!esAdministrador) {
            return res.status(403).json({
                ok: false,
                mensaje: 'Solo administradores pueden realizar esta acción.'
            });
        }

        req.perfil = perfil;
        next();

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al verificar administrador.',
            error: error.message
        });
    }
}

module.exports = verificarAdministrador;