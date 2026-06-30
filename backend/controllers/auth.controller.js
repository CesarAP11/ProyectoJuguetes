const { supabase, supabaseAdmin } = require('../services/supabase.service');

async function obtenerEmailPorUsername(req, res) {
    try {
        const { username } = req.body;

        if (!username || !username.trim()) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El nombre de usuario es obligatorio.'
            });
        }

        const { data, error } = await supabaseAdmin.rpc('obtener_email_por_username', {
            _username: username.trim()
        });

        if (error) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudo buscar el usuario.',
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Usuario no encontrado.'
            });
        }

        res.json({
            ok: true,
            email: data
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al buscar usuario.',
            error: error.message
        });
    }
}

async function iniciarSesion(req, res) {
    try {
        const { usuario, username, email, password } = req.body;

        const identificador = email || usuario || username;

        if (!identificador || !password) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Usuario y contraseña son obligatorios.'
            });
        }

        let emailLogin = identificador.trim();

        if (!emailLogin.includes('@')) {
            const { data: emailEncontrado, error: emailError } = await supabaseAdmin.rpc('obtener_email_por_username', {
                _username: emailLogin
            });

            if (emailError) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'No se pudo buscar el usuario.',
                    error: emailError.message
                });
            }

            if (!emailEncontrado) {
                return res.status(404).json({
                    ok: false,
                    mensaje: 'Usuario no encontrado.'
                });
            }

            emailLogin = emailEncontrado;
        }

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: emailLogin,
            password
        });

        if (loginError || !loginData?.user) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Usuario o contraseña incorrectos.',
                error: loginError?.message || null
            });
        }

        const { data: perfil, error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .select('id_perfil, nombre_completo, username, es_admin_principal, activo')
            .eq('id_perfil', loginData.user.id)
            .single();

        if (perfilError || !perfil) {
            return res.status(404).json({
                ok: false,
                mensaje: 'No se encontró el perfil del usuario.',
                error: perfilError?.message || null
            });
        }

        if (!perfil.activo) {
            return res.status(403).json({
                ok: false,
                mensaje: 'Este usuario está desactivado.'
            });
        }

        const { data: rolesData, error: rolesError } = await supabaseAdmin
            .from('perfil_roles')
            .select(`
                roles (
                    id_rol,
                    nombre
                )
            `)
            .eq('id_perfil', loginData.user.id);

        if (rolesError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron cargar los roles del usuario.',
                error: rolesError.message
            });
        }

        const roles = (rolesData || [])
            .map((item) => item.roles)
            .filter(Boolean);

        res.json({
            ok: true,
            mensaje: 'Inicio de sesión correcto.',
            usuario: loginData.user,
            session: loginData.session,
            perfil: {
                ...perfil,
                roles
            }
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al iniciar sesión.',
            error: error.message
        });
    }
}

async function obtenerPerfilActual(req, res) {
    try {
        const idUsuario = req.usuario.id;

        const { data: perfil, error: perfilError } = await supabaseAdmin
            .from('perfiles')
            .select('id_perfil, nombre_completo, username, es_admin_principal, activo')
            .eq('id_perfil', idUsuario)
            .single();

        if (perfilError || !perfil) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Perfil no encontrado.',
                error: perfilError?.message || null
            });
        }

        const { data: rolesData, error: rolesError } = await supabaseAdmin
            .from('perfil_roles')
            .select(`
                roles (
                    id_rol,
                    nombre
                )
            `)
            .eq('id_perfil', idUsuario);

        if (rolesError) {
            return res.status(500).json({
                ok: false,
                mensaje: 'No se pudieron consultar los roles.',
                error: rolesError.message
            });
        }

        const roles = (rolesData || [])
            .map((item) => item.roles)
            .filter(Boolean);

        res.json({
            ok: true,
            perfil: {
                ...perfil,
                roles
            }
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error interno al consultar perfil.',
            error: error.message
        });
    }
}

async function verificarSesion(req, res) {
    res.json({
        ok: true,
        mensaje: 'Sesión válida.',
        usuario: req.usuario
    });
}

async function cerrarSesion(req, res) {
    res.json({
        ok: true,
        mensaje: 'Sesión cerrada correctamente. Cierra también la sesión desde el frontend con supabaseClient.auth.signOut().'
    });
}

module.exports = {
    obtenerEmailPorUsername,
    iniciarSesion,
    obtenerPerfilActual,
    verificarSesion,
    cerrarSesion
};