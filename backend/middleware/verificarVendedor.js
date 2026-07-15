const { supabaseAdmin } = require('../services/supabase.service');

function obtenerNombreRol(registro) {
    const relacion = registro?.roles;

    if (Array.isArray(relacion)) {
        return relacion[0]?.nombre || '';
    }

    return relacion?.nombre || '';
}

async function verificarVendedor(req, res, next) {
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
            req.perfil = {
                ...perfil,
                roles: ['administrador']
            };

            req.roles = ['administrador'];
            req.esSoloVendedor = false;

            return next();
        }

        const { data: registrosRoles, error: rolesError } = await supabaseAdmin
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

        const roles = [
            ...new Set(
                (registrosRoles || [])
                    .map(obtenerNombreRol)
                    .map((rol) => String(rol).trim().toLowerCase())
                    .filter(Boolean)
            )
        ];

        const puedeVender = roles.some((rol) => {
            return ['vendedor', 'encargado', 'administrador'].includes(rol);
        });

        if (!puedeVender) {
            return res.status(403).json({
                ok: false,
                mensaje: 'No tienes permiso para acceder a este recurso.'
            });
        }

        req.perfil = {
            ...perfil,
            roles
        };

        req.roles = roles;
        req.esSoloVendedor =
            roles.includes('vendedor') &&
            !roles.includes('encargado') &&
            !roles.includes('administrador');

        return next();

    } catch (error) {
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al verificar permisos.',
            error: error.message
        });
    }
}

module.exports = verificarVendedor;
