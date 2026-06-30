const { supabaseAdmin } = require('./supabase.service');

async function crearUsuarioAuth({ email, password, nombre_completo, username }) {
    try {
        if (!email || !password) {
            return {
                ok: false,
                mensaje: 'Email y contraseña son obligatorios para crear usuario.'
            };
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                nombre_completo: nombre_completo || '',
                username: username || ''
            }
        });

        if (error) {
            return {
                ok: false,
                mensaje: 'No se pudo crear el usuario en Supabase Auth.',
                error: error.message
            };
        }

        return {
            ok: true,
            usuario: data.user
        };

    } catch (error) {
        return {
            ok: false,
            mensaje: 'Error interno al crear usuario en Auth.',
            error: error.message
        };
    }
}

async function obtenerUsuarioAuth(idUsuario) {
    try {
        if (!idUsuario) {
            return {
                ok: false,
                mensaje: 'No se recibió el ID del usuario.'
            };
        }

        const { data, error } = await supabaseAdmin.auth.admin.getUserById(idUsuario);

        if (error) {
            return {
                ok: false,
                mensaje: 'No se pudo obtener el usuario de Auth.',
                error: error.message
            };
        }

        return {
            ok: true,
            usuario: data.user
        };

    } catch (error) {
        return {
            ok: false,
            mensaje: 'Error interno al obtener usuario de Auth.',
            error: error.message
        };
    }
}

async function actualizarUsuarioAuth(idUsuario, datosActualizar) {
    try {
        if (!idUsuario) {
            return {
                ok: false,
                mensaje: 'No se recibió el ID del usuario.'
            };
        }

        if (!datosActualizar || Object.keys(datosActualizar).length === 0) {
            return {
                ok: false,
                mensaje: 'No hay datos para actualizar.'
            };
        }

        const datosAuth = {};

        if (datosActualizar.email) {
            datosAuth.email = datosActualizar.email;
            datosAuth.email_confirm = true;
        }

        if (datosActualizar.password) {
            datosAuth.password = datosActualizar.password;
        }

        if (datosActualizar.nombre_completo || datosActualizar.username) {
            datosAuth.user_metadata = {
                nombre_completo: datosActualizar.nombre_completo || '',
                username: datosActualizar.username || ''
            };
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            idUsuario,
            datosAuth
        );

        if (error) {
            return {
                ok: false,
                mensaje: 'No se pudo actualizar el usuario en Auth.',
                error: error.message
            };
        }

        return {
            ok: true,
            usuario: data.user
        };

    } catch (error) {
        return {
            ok: false,
            mensaje: 'Error interno al actualizar usuario en Auth.',
            error: error.message
        };
    }
}

async function actualizarPasswordAuth(idUsuario, nuevaPassword) {
    try {
        if (!idUsuario) {
            return {
                ok: false,
                mensaje: 'No se recibió el ID del usuario.'
            };
        }

        if (!nuevaPassword || nuevaPassword.length < 6) {
            return {
                ok: false,
                mensaje: 'La contraseña debe tener al menos 6 caracteres.'
            };
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            idUsuario,
            {
                password: nuevaPassword
            }
        );

        if (error) {
            return {
                ok: false,
                mensaje: 'No se pudo actualizar la contraseña.',
                error: error.message
            };
        }

        return {
            ok: true,
            usuario: data.user
        };

    } catch (error) {
        return {
            ok: false,
            mensaje: 'Error interno al actualizar contraseña.',
            error: error.message
        };
    }
}

async function eliminarUsuarioAuth(idUsuario) {
    try {
        if (!idUsuario) {
            return {
                ok: false,
                mensaje: 'No se recibió el ID del usuario.'
            };
        }

        const { data, error } = await supabaseAdmin.auth.admin.deleteUser(idUsuario);

        if (error) {
            return {
                ok: false,
                mensaje: 'No se pudo eliminar el usuario de Auth.',
                error: error.message
            };
        }

        return {
            ok: true,
            data
        };

    } catch (error) {
        return {
            ok: false,
            mensaje: 'Error interno al eliminar usuario de Auth.',
            error: error.message
        };
    }
}

module.exports = {
    crearUsuarioAuth,
    obtenerUsuarioAuth,
    actualizarUsuarioAuth,
    actualizarPasswordAuth,
    eliminarUsuarioAuth
};