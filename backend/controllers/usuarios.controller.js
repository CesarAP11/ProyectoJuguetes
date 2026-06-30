const { supabaseAdmin } = require('../services/supabase.service');

async function listarUsuarios(req, res) {
    try {
        const { data: perfiles, error: perfilesError } = await supabaseAdmin
            .from('perfiles')
            .select(`
                id_perfil,
                nombre_completo,
                username,
                email,
                telefono,
                es_admin_principal,
                activo
            `)
            .order('nombre_completo', { ascending: true });

        if (perfilesError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al listar perfiles.',
                error: perfilesError.message
            });
        }

        const { data: perfilRoles, error: rolesError } = await supabaseAdmin
            .from('perfil_roles')
            .select(`
                id_perfil,
                roles (
                    nombre
                )
            `);

        if (rolesError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al listar roles de usuarios.',
                error: rolesError.message
            });
        }

        const usuarios = perfiles.map((perfil) => {
            const rolesDelUsuario = perfilRoles
                .filter((registro) => registro.id_perfil === perfil.id_perfil)
                .map((registro) => registro.roles.nombre);

            return {
                id_perfil: perfil.id_perfil,
                nombre_completo: perfil.nombre_completo,
                username: perfil.username,
                email: perfil.email,
                telefono: perfil.telefono,
                es_admin_principal: perfil.es_admin_principal,
                activo: perfil.activo,
                vendedor: rolesDelUsuario.includes('vendedor'),
                encargado: rolesDelUsuario.includes('encargado'),
                administrador: rolesDelUsuario.includes('administrador')
            };
        });

        res.json({
            ok: true,
            usuarios
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al listar usuarios.',
            error: error.message
        });
    }
}

async function crearUsuario(req, res) {
    try {
        const {
            nombre_completo,
            username,
            email,
            telefono,
            password,
            roles
        } = req.body;

        if (!nombre_completo || !username || !email || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Nombre, username, email y contraseña son obligatorios.'
            });
        }

        if (!Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Selecciona al menos un rol.'
            });
        }

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                nombre_completo,
                username
            }
        });

        if (authError) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se pudo crear el usuario en Authentication.',
                error: authError.message
            });
        }

        const idPerfil = authData.user.id;

        const { error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .insert({
                id_perfil: idPerfil,
                nombre_completo,
                username,
                email,
                telefono: telefono || null,
                es_admin_principal: false,
                debe_cambiar_password: true,
                activo: true
            });

        if (perfilError) {
            await supabaseAdmin.auth.admin.deleteUser(idPerfil);

            return res.status(400).json({
                ok: false,
                mensaje: 'No se pudo crear el perfil del usuario.',
                error: perfilError.message
            });
        }

        const { data: rolesBD, error: rolesError } = await supabaseAdmin
            .from('roles')
            .select('id_rol, nombre')
            .in('nombre', roles);

        if (rolesError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron consultar los roles.',
                error: rolesError.message
            });
        }

        const registrosRoles = rolesBD.map((rol) => ({
            id_perfil: idPerfil,
            id_rol: rol.id_rol,
            asignado_por: req.usuario.id
        }));

        const { error: asignarError } = await supabaseAdmin
            .from('perfil_roles')
            .insert(registrosRoles);

        if (asignarError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Usuario creado, pero no se pudieron asignar roles.',
                error: asignarError.message
            });
        }

        res.status(201).json({
            ok: true,
            mensaje: 'Usuario creado correctamente.'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al crear usuario.',
            error: error.message
        });
    }
}

async function actualizarRolesUsuario(req, res) {
    try {
        const { idPerfil } = req.params;
        const { roles } = req.body;

        if (!Array.isArray(roles)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Los roles deben enviarse como arreglo.'
            });
        }

        const { data: perfil, error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .select('id_perfil, es_admin_principal')
            .eq('id_perfil', idPerfil)
            .single();

        if (perfilError || !perfil) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Usuario no encontrado.'
            });
        }

        if (perfil.es_admin_principal) {
            return res.status(403).json({
                ok: false,
                mensaje: 'No se pueden modificar los permisos del administrador principal.'
            });
        }

        const { error: eliminarError } = await supabaseAdmin
            .from('perfil_roles')
            .delete()
            .eq('id_perfil', idPerfil);

        if (eliminarError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron eliminar los roles anteriores.',
                error: eliminarError.message
            });
        }

        if (roles.length > 0) {
            const { data: rolesBD, error: rolesError } = await supabaseAdmin
                .from('roles')
                .select('id_rol, nombre')
                .in('nombre', roles);

            if (rolesError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudieron consultar los nuevos roles.',
                    error: rolesError.message
                });
            }

            const registrosRoles = rolesBD.map((rol) => ({
                id_perfil: idPerfil,
                id_rol: rol.id_rol,
                asignado_por: req.usuario.id
            }));

            const { error: insertarError } = await supabaseAdmin
                .from('perfil_roles')
                .insert(registrosRoles);

            if (insertarError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudieron asignar los nuevos roles.',
                    error: insertarError.message
                });
            }
        }

        res.json({
            ok: true,
            mensaje: 'Permisos actualizados correctamente.'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al actualizar roles.',
            error: error.message
        });
    }
}

async function cambiarEstadoUsuario(req, res) {
    try {
        const { idPerfil } = req.params;
        const { activo } = req.body;

        const { data: perfil, error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .select('id_perfil, es_admin_principal')
            .eq('id_perfil', idPerfil)
            .single();

        if (perfilError || !perfil) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Usuario no encontrado.'
            });
        }

        if (perfil.es_admin_principal) {
            return res.status(403).json({
                ok: false,
                mensaje: 'No se puede desactivar al administrador principal.'
            });
        }

        const { error } = await supabaseAdmin
            .from('perfiles')
            .update({ activo: Boolean(activo) })
            .eq('id_perfil', idPerfil);

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo cambiar el estado del usuario.',
                error: error.message
            });
        }

        res.json({
            ok: true,
            mensaje: 'Estado actualizado correctamente.'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al cambiar estado.',
            error: error.message
        });
    }
}

module.exports = {
    listarUsuarios,
    crearUsuario,
    actualizarRolesUsuario,
    cambiarEstadoUsuario
};