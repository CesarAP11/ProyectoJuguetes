import { useEffect, useState } from 'react';

import {
    obtenerUsuarios,
    crearUsuario,
    actualizarRolesUsuario,
    cambiarEstadoUsuario
} from '../api/usuarios.api';

const rolesBase = [
    {
        nombre: 'vendedor',
        descripcion: 'Puede registrar ventas.'
    },
    {
        nombre: 'encargado',
        descripcion: 'Puede gestionar jornadas y cortes.'
    },
    {
        nombre: 'administrador',
        descripcion: 'Puede gestionar inventario, reportes y usuarios.'
    }
];

const estadoInicialFormulario = {
    nombre_completo: '',
    username: '',
    email: '',
    password: '123456789',
    roles: []
};

function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [rolesDisponibles, setRolesDisponibles] = useState(rolesBase);

    const [formulario, setFormulario] = useState(estadoInicialFormulario);
    const [rolesEditando, setRolesEditando] = useState({});

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [accionando, setAccionando] = useState(false);

    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('success');

    useEffect(() => {
        cargarUsuarios();
    }, []);

    async function cargarUsuarios() {
        try {
            setCargando(true);
            setMensaje('');

            const data = await obtenerUsuarios();

            const listaUsuarios = data.usuarios || [];
            const listaRoles = data.roles || rolesBase;

            setUsuarios(listaUsuarios);
            setRolesDisponibles(normalizarRolesDisponibles(listaRoles));

            const rolesIniciales = {};

            listaUsuarios.forEach((usuario) => {
                rolesIniciales[usuario.id_perfil] = obtenerNombresRoles(usuario.roles);
            });

            setRolesEditando(rolesIniciales);

        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            mostrarMensaje('danger', error.message || 'No se pudieron cargar los usuarios.');

        } finally {
            setCargando(false);
        }
    }

    function normalizarRolesDisponibles(listaRoles) {
        if (!listaRoles || listaRoles.length === 0) {
            return rolesBase;
        }

        return listaRoles.map((rol) => {
            if (typeof rol === 'string') {
                return {
                    nombre: rol,
                    descripcion: ''
                };
            }

            return {
                id_rol: rol.id_rol,
                nombre: rol.nombre,
                descripcion: rol.descripcion || ''
            };
        });
    }

    function obtenerNombresRoles(roles) {
        if (!roles || roles.length === 0) {
            return [];
        }

        return roles.map((rol) => {
            if (typeof rol === 'string') {
                return rol;
            }

            return rol.nombre;
        }).filter(Boolean);
    }

    function mostrarMensaje(tipo, texto) {
        setTipoMensaje(tipo);
        setMensaje(texto);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setFormulario((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    function handleRolFormulario(nombreRol) {
        setFormulario((prev) => {
            const yaExiste = prev.roles.includes(nombreRol);

            return {
                ...prev,
                roles: yaExiste
                    ? prev.roles.filter((rol) => rol !== nombreRol)
                    : [...prev.roles, nombreRol]
            };
        });
    }

    function handleRolEdicion(idPerfil, nombreRol) {
        setRolesEditando((prev) => {
            const rolesActuales = prev[idPerfil] || [];
            const yaExiste = rolesActuales.includes(nombreRol);

            return {
                ...prev,
                [idPerfil]: yaExiste
                    ? rolesActuales.filter((rol) => rol !== nombreRol)
                    : [...rolesActuales, nombreRol]
            };
        });
    }

    function limpiarFormulario() {
        setFormulario(estadoInicialFormulario);
    }

    async function handleCrearUsuario(event) {
        event.preventDefault();

        try {
            setGuardando(true);
            setMensaje('');

            if (!formulario.nombre_completo.trim()) {
                mostrarMensaje('danger', 'Escribe el nombre completo.');
                return;
            }

            if (!formulario.username.trim()) {
                mostrarMensaje('danger', 'Escribe el nombre de usuario.');
                return;
            }

            if (!formulario.email.trim()) {
                mostrarMensaje('danger', 'Escribe el correo electrónico.');
                return;
            }

            if (!formulario.password || formulario.password.length < 6) {
                mostrarMensaje('danger', 'La contraseña debe tener al menos 6 caracteres.');
                return;
            }

            if (formulario.roles.length === 0) {
                mostrarMensaje('danger', 'Selecciona al menos un rol.');
                return;
            }

            const confirmar = confirm(
                `¿Confirmas crear el usuario "${formulario.username}"?\n\nContraseña inicial: ${formulario.password}`
            );

            if (!confirmar) {
                return;
            }

            const respuesta = await crearUsuario({
                nombre_completo: formulario.nombre_completo.trim(),
                username: formulario.username.trim(),
                email: formulario.email.trim(),
                password: formulario.password,
                roles: formulario.roles
            });

            mostrarMensaje('success', respuesta.mensaje || 'Usuario creado correctamente.');

            limpiarFormulario();
            await cargarUsuarios();

        } catch (error) {
            console.error('Error al crear usuario:', error);
            mostrarMensaje('danger', error.message || 'No se pudo crear el usuario.');

        } finally {
            setGuardando(false);
        }
    }

    async function handleGuardarRoles(usuario) {
        try {
            const roles = rolesEditando[usuario.id_perfil] || [];

            if (roles.length === 0) {
                mostrarMensaje('danger', 'El usuario debe tener al menos un rol.');
                return;
            }

            const confirmar = confirm(
                `¿Confirmas actualizar los roles de "${usuario.username}"?`
            );

            if (!confirmar) {
                return;
            }

            setAccionando(true);
            setMensaje('');

            const respuesta = await actualizarRolesUsuario(usuario.id_perfil, roles);

            mostrarMensaje('success', respuesta.mensaje || 'Roles actualizados correctamente.');

            await cargarUsuarios();

        } catch (error) {
            console.error('Error al actualizar roles:', error);
            mostrarMensaje('danger', error.message || 'No se pudieron actualizar los roles.');

        } finally {
            setAccionando(false);
        }
    }

    async function handleCambiarEstado(usuario) {
        try {
            const nuevoEstado = !usuario.activo;

            const confirmar = confirm(
                nuevoEstado
                    ? `¿Confirmas activar a "${usuario.username}"?`
                    : `¿Confirmas desactivar a "${usuario.username}"?`
            );

            if (!confirmar) {
                return;
            }

            setAccionando(true);
            setMensaje('');

            const respuesta = await cambiarEstadoUsuario(usuario.id_perfil, nuevoEstado);

            mostrarMensaje(
                'success',
                respuesta.mensaje || (nuevoEstado ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.')
            );

            await cargarUsuarios();

        } catch (error) {
            console.error('Error al cambiar estado:', error);
            mostrarMensaje('danger', error.message || 'No se pudo cambiar el estado del usuario.');

        } finally {
            setAccionando(false);
        }
    }

    function obtenerClaseEstado(activo) {
        return activo
            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500 bg-red-500/10 text-red-300';
    }

    function obtenerTextoRol(rol) {
        if (rol === 'vendedor') {
            return 'Vendedor';
        }

        if (rol === 'encargado') {
            return 'Encargado';
        }

        if (rol === 'administrador') {
            return 'Administrador';
        }

        return rol;
    }

    return (
        <section>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Usuarios</h1>
                    <p className="mt-2 text-slate-400">
                        Administración de usuarios y roles del sistema.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarUsuarios}
                    disabled={guardando || accionando}
                    className="rounded-xl border border-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-60"
                >
                    Recargar usuarios
                </button>
            </div>

            {mensaje && (
                <div
                    className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
                        tipoMensaje === 'success'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-red-500 bg-red-500/10 text-red-300'
                    }`}
                >
                    {mensaje}
                </div>
            )}

            {accionando && (
                <div className="mb-6 rounded-2xl border border-sky-500 bg-sky-500/10 px-5 py-4 text-sm text-sky-300">
                    Procesando acción...
                </div>
            )}

            <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-5 text-xl font-bold text-white">Crear usuario</h2>

                <form onSubmit={handleCrearUsuario} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm text-slate-300">
                            Nombre completo
                        </label>

                        <input
                            type="text"
                            name="nombre_completo"
                            value={formulario.nombre_completo}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Ej. Amanda..."
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">
                            Usuario
                        </label>

                        <input
                            type="text"
                            name="username"
                            value={formulario.username}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Ej. Amanda"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">
                            Correo electrónico
                        </label>

                        <input
                            type="email"
                            name="email"
                            value={formulario.email}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="correo@ejemplo.com"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">
                            Contraseña inicial
                        </label>

                        <input
                            type="text"
                            name="password"
                            value={formulario.password}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <label className="mb-2 block text-sm text-slate-300">
                            Roles
                        </label>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {rolesDisponibles.map((rol) => (
                                <label
                                    key={rol.nombre}
                                    className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
                                        formulario.roles.includes(rol.nombre)
                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formulario.roles.includes(rol.nombre)}
                                        onChange={() => handleRolFormulario(rol.nombre)}
                                        className="mr-2"
                                    />

                                    <span className="font-semibold">
                                        {obtenerTextoRol(rol.nombre)}
                                    </span>

                                    {rol.descripcion && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            {rol.descripcion}
                                        </p>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:col-span-3">
                        <button
                            type="submit"
                            disabled={guardando || accionando}
                            className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                            {guardando ? 'Creando usuario...' : 'Crear usuario'}
                        </button>

                        <button
                            type="button"
                            onClick={limpiarFormulario}
                            disabled={guardando || accionando}
                            className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-60"
                        >
                            Limpiar
                        </button>
                    </div>
                </form>
            </div>

            {cargando ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
                    Cargando usuarios...
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1300px] text-left text-sm">
                            <thead className="bg-slate-950 text-slate-300">
                                <tr>
                                    <th className="px-5 py-4">Usuario</th>
                                    <th className="px-5 py-4">Correo</th>
                                    <th className="px-5 py-4">Roles actuales</th>
                                    <th className="px-5 py-4">Editar roles</th>
                                    <th className="px-5 py-4">Estado</th>
                                    <th className="px-5 py-4">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-800">
                                {usuarios.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-5 py-10 text-center text-slate-400">
                                            No hay usuarios registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    usuarios.map((usuario) => {
                                        const rolesUsuario = obtenerNombresRoles(usuario.roles);
                                        const rolesSeleccionados = rolesEditando[usuario.id_perfil] || [];

                                        return (
                                            <tr
                                                key={usuario.id_perfil}
                                                className="text-slate-300 transition hover:bg-slate-800/60"
                                            >
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-white">
                                                        {usuario.nombre_completo || 'Sin nombre'}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        @{usuario.username || 'sin_usuario'}
                                                    </p>

                                                    {usuario.es_admin_principal && (
                                                        <span className="mt-2 inline-block rounded-full border border-yellow-500 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                                                            Admin principal
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {usuario.email || 'Sin correo'}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {rolesUsuario.length === 0 ? (
                                                            <span className="text-xs text-slate-500">
                                                                Sin roles
                                                            </span>
                                                        ) : (
                                                            rolesUsuario.map((rol) => (
                                                                <span
                                                                    key={rol}
                                                                    className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300"
                                                                >
                                                                    {obtenerTextoRol(rol)}
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {rolesDisponibles.map((rol) => (
                                                            <label
                                                                key={rol.nombre}
                                                                className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition ${
                                                                    rolesSeleccionados.includes(rol.nombre)
                                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                                                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-800'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={rolesSeleccionados.includes(rol.nombre)}
                                                                    onChange={() =>
                                                                        handleRolEdicion(usuario.id_perfil, rol.nombre)
                                                                    }
                                                                    className="mr-2"
                                                                    disabled={usuario.es_admin_principal}
                                                                />

                                                                {obtenerTextoRol(rol.nombre)}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${obtenerClaseEstado(usuario.activo)}`}
                                                    >
                                                        {usuario.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={accionando || usuario.es_admin_principal}
                                                            onClick={() => handleGuardarRoles(usuario)}
                                                            className="rounded-lg border border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-40"
                                                        >
                                                            Guardar roles
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={accionando || usuario.es_admin_principal}
                                                            onClick={() => handleCambiarEstado(usuario)}
                                                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-40 ${
                                                                usuario.activo
                                                                    ? 'border-red-500 text-red-300 hover:bg-red-500 hover:text-white'
                                                                    : 'border-sky-500 text-sky-300 hover:bg-sky-500 hover:text-white'
                                                            }`}
                                                        >
                                                            {usuario.activo ? 'Desactivar' : 'Activar'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Usuarios;