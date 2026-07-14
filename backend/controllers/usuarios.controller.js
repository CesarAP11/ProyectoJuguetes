const { supabaseAdmin } = require('../services/supabase.service');

function normalizarRolesSolicitados(roles) {
    if (!Array.isArray(roles)) {
        return [];
    }

    return [
        ...new Set(
            roles
                .map((rol) => String(rol).trim().toLowerCase())
                .filter(Boolean)
        )
    ];
}

function obtenerRolRelacionado(registro) {
    if (!registro || !registro.roles) {
        return null;
    }

    if (Array.isArray(registro.roles)) {
        return registro.roles[0] || null;
    }

    return registro.roles;
}

async function consultarRolesValidos(nombresRoles) {
    const { data, error } = await supabaseAdmin
        .from('roles')
        .select('id_rol, nombre, descripcion')
        .in('nombre', nombresRoles);

    if (error) {
        return {
            roles: [],
            error
        };
    }

    return {
        roles: data || [],
        error: null
    };
}

async function listarUsuarios(req, res) {
    try {
        const [
            perfilesResultado,
            rolesResultado,
            perfilRolesResultado
        ] = await Promise.all([
            supabaseAdmin
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
                .order('nombre_completo', { ascending: true }),

            supabaseAdmin
                .from('roles')
                .select(`
                    id_rol,
                    nombre,
                    descripcion
                `)
                .order('nombre', { ascending: true }),

            supabaseAdmin
                .from('perfil_roles')
                .select(`
                    id_perfil,
                    id_rol,
                    roles (
                        id_rol,
                        nombre,
                        descripcion
                    )
                `)
        ]);

        if (perfilesResultado.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al listar perfiles.',
                error: perfilesResultado.error.message
            });
        }

        if (rolesResultado.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al consultar el catálogo de roles.',
                error: rolesResultado.error.message
            });
        }

        if (perfilRolesResultado.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al listar los roles de los usuarios.',
                error: perfilRolesResultado.error.message
            });
        }

        const perfiles = perfilesResultado.data || [];
        const catalogoRoles = rolesResultado.data || [];
        const registrosPerfilRoles = perfilRolesResultado.data || [];

        const mapaRolesPorPerfil = new Map();

        registrosPerfilRoles.forEach((registro) => {
            const rolRelacionado = obtenerRolRelacionado(registro);

            if (!rolRelacionado?.nombre) {
                return;
            }

            const rolesPerfil = mapaRolesPorPerfil.get(registro.id_perfil) || [];

            rolesPerfil.push({
                id_rol: rolRelacionado.id_rol || registro.id_rol,
                nombre: rolRelacionado.nombre,
                descripcion: rolRelacionado.descripcion || ''
            });

            mapaRolesPorPerfil.set(registro.id_perfil, rolesPerfil);
        });

        const usuarios = perfiles.map((perfil) => {
            const rolesDelUsuario = mapaRolesPorPerfil.get(perfil.id_perfil) || [];

            const nombresRoles = rolesDelUsuario.map((rol) => rol.nombre);

            return {
                id_perfil: perfil.id_perfil,
                nombre_completo: perfil.nombre_completo,
                username: perfil.username,
                email: perfil.email,
                telefono: perfil.telefono,
                es_admin_principal: Boolean(perfil.es_admin_principal),
                activo: Boolean(perfil.activo),

                roles: rolesDelUsuario,

                vendedor: nombresRoles.includes('vendedor'),
                encargado: nombresRoles.includes('encargado'),
                administrador: nombresRoles.includes('administrador')
            };
        });

        res.json({
            ok: true,
            usuarios,
            roles: catalogoRoles
        });

    } catch (error) {
        console.error('Error interno al listar usuarios:', error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al listar usuarios.',
            error: error.message
        });
    }
}

async function crearUsuario(req, res) {
    let idUsuarioCreado = null;

    try {
        const {
            nombre_completo,
            username,
            email,
            telefono,
            password,
            roles
        } = req.body;

        const nombreLimpio = nombre_completo?.trim();
        const usernameLimpio = username?.trim();
        const emailLimpio = email?.trim().toLowerCase();
        const rolesSolicitados = normalizarRolesSolicitados(roles);

        if (!nombreLimpio || !usernameLimpio || !emailLimpio || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Nombre, usuario, correo y contraseña son obligatorios.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La contraseña debe tener al menos 6 caracteres.'
            });
        }

        if (rolesSolicitados.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Selecciona al menos un rol.'
            });
        }

        const consultaRoles = await consultarRolesValidos(rolesSolicitados);

        if (consultaRoles.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron consultar los roles.',
                error: consultaRoles.error.message
            });
        }

        const rolesEncontrados = consultaRoles.roles;
        const nombresEncontrados = rolesEncontrados.map((rol) => rol.nombre);

        const rolesInvalidos = rolesSolicitados.filter(
            (nombreRol) => !nombresEncontrados.includes(nombreRol)
        );

        if (rolesInvalidos.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: `Los siguientes roles no existen: ${rolesInvalidos.join(', ')}.`
            });
        }

        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
                email: emailLimpio,
                password,
                email_confirm: true,
                user_metadata: {
                    nombre_completo: nombreLimpio,
                    username: usernameLimpio
                }
            });

        if (authError || !authData.user) {
            return res.status(400).json({
                ok: false,
                mensaje: 'No se pudo crear el usuario en Authentication.',
                error: authError?.message || 'No se recibió el usuario creado.'
            });
        }

        idUsuarioCreado = authData.user.id;

        const { error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .insert({
                id_perfil: idUsuarioCreado,
                nombre_completo: nombreLimpio,
                username: usernameLimpio,
                email: emailLimpio,
                telefono: telefono?.trim() || null,
                es_admin_principal: false,
                debe_cambiar_password: true,
                activo: true
            });

        if (perfilError) {
            await supabaseAdmin.auth.admin.deleteUser(idUsuarioCreado);

            return res.status(400).json({
                ok: false,
                mensaje: 'No se pudo crear el perfil del usuario.',
                error: perfilError.message
            });
        }

        const registrosRoles = rolesEncontrados.map((rol) => ({
            id_perfil: idUsuarioCreado,
            id_rol: rol.id_rol,
            asignado_por: req.usuario.id
        }));

        const { error: asignarError } = await supabaseAdmin
            .from('perfil_roles')
            .insert(registrosRoles);

        if (asignarError) {
            await supabaseAdmin
                .from('perfiles')
                .delete()
                .eq('id_perfil', idUsuarioCreado);

            await supabaseAdmin.auth.admin.deleteUser(idUsuarioCreado);

            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron asignar los roles al usuario.',
                error: asignarError.message
            });
        }

        res.status(201).json({
            ok: true,
            mensaje: 'Usuario creado correctamente.'
        });

    } catch (error) {
        console.error('Error interno al crear usuario:', error);

        if (idUsuarioCreado) {
            await supabaseAdmin
                .from('perfiles')
                .delete()
                .eq('id_perfil', idUsuarioCreado);

            await supabaseAdmin.auth.admin.deleteUser(idUsuarioCreado);
        }

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
        const rolesSolicitados = normalizarRolesSolicitados(req.body.roles);

        if (rolesSolicitados.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El usuario debe tener al menos un rol.'
            });
        }

        const { data: perfil, error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .select('id_perfil, username, es_admin_principal')
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

        const consultaRoles = await consultarRolesValidos(rolesSolicitados);

        if (consultaRoles.error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron consultar los nuevos roles.',
                error: consultaRoles.error.message
            });
        }

        const rolesEncontrados = consultaRoles.roles;
        const nombresEncontrados = rolesEncontrados.map((rol) => rol.nombre);

        const rolesInvalidos = rolesSolicitados.filter(
            (nombreRol) => !nombresEncontrados.includes(nombreRol)
        );

        if (rolesInvalidos.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: `Los siguientes roles no existen: ${rolesInvalidos.join(', ')}.`
            });
        }

        const { data: rolesAnteriores, error: rolesAnterioresError } =
            await supabaseAdmin
                .from('perfil_roles')
                .select('id_rol, asignado_por')
                .eq('id_perfil', idPerfil);

        if (rolesAnterioresError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron consultar los roles anteriores.',
                error: rolesAnterioresError.message
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

        const registrosNuevos = rolesEncontrados.map((rol) => ({
            id_perfil: idPerfil,
            id_rol: rol.id_rol,
            asignado_por: req.usuario.id
        }));

        const { error: insertarError } = await supabaseAdmin
            .from('perfil_roles')
            .insert(registrosNuevos);

        if (insertarError) {
            const registrosRestaurar = (rolesAnteriores || []).map((registro) => ({
                id_perfil: idPerfil,
                id_rol: registro.id_rol,
                asignado_por: registro.asignado_por || req.usuario.id
            }));

            if (registrosRestaurar.length > 0) {
                await supabaseAdmin
                    .from('perfil_roles')
                    .insert(registrosRestaurar);
            }

            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron asignar los nuevos roles.',
                error: insertarError.message
            });
        }

        res.json({
            ok: true,
            mensaje: 'Roles actualizados correctamente.',
            roles: rolesEncontrados
        });

    } catch (error) {
        console.error('Error interno al actualizar roles:', error);

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

        if (typeof activo !== 'boolean') {
            return res.status(400).json({
                ok: false,
                mensaje: 'El estado del usuario debe ser verdadero o falso.'
            });
        }

        const { data: perfil, error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .select('id_perfil, username, es_admin_principal')
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
            .update({
                activo
            })
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
            mensaje: activo
                ? 'Usuario activado correctamente.'
                : 'Usuario desactivado correctamente.'
        });

    } catch (error) {
        console.error('Error interno al cambiar estado:', error);

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