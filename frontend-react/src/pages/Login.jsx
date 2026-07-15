import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

function Login() {
    const navigate = useNavigate();
    const { iniciarSesion } = useAuth();

    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [cargando, setCargando] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setCargando(true);
            setMensaje('');

            await iniciarSesion(usuario, password);

            navigate('/ventas', { replace: true });
        } catch (error) {
            setMensaje(
                error.message || 'No se pudo iniciar sesión.'
            );
        } finally {
            setCargando(false);
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
            <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="pointer-events-none absolute bottom-[-140px] right-[-100px] h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

            <section className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
                <div className="relative flex h-52 items-center justify-center overflow-hidden border-b border-slate-800 bg-slate-950">
                    <img
                        src="/images/logo-juguetesfun.png"
                        alt="Logo de JuguetesFun"
                        className="h-full w-full scale-110 object-cover object-center"
                        draggable="false"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                </div>

                <div className="p-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-white">
                            Bienvenido
                        </h1>

                        <p className="mt-2 text-slate-400">
                            Inicia sesión para continuar
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="usuario"
                                className="mb-2 block text-sm font-medium text-slate-300"
                            >
                                Usuario
                            </label>

                            <input
                                id="usuario"
                                type="text"
                                value={usuario}
                                onChange={(event) =>
                                    setUsuario(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                placeholder="Ej. Cesar AP"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium text-slate-300"
                            >
                                Contraseña
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                placeholder="Tu contraseña"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {mensaje && (
                            <div className="rounded-xl border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {mensaje}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={cargando}
                            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {cargando
                                ? 'Entrando...'
                                : 'Iniciar sesión'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-slate-600">
                        Sistema de administración JuguetesFun
                    </p>
                </div>
            </section>
        </main>
    );
}

export default Login;