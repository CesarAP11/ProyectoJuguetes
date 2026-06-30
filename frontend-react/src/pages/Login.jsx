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
            setMensaje(error.message || 'No se pudo iniciar sesión.');
        } finally {
            setCargando(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
            <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-2xl flex items-center justify-center">
                        JF
                    </div>

                    <h1 className="text-3xl font-bold">JuguetesFun</h1>
                    <p className="text-slate-400 mt-2">Inicia sesión para continuar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-2 text-sm text-slate-300">Usuario</label>
                        <input
                            type="text"
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Ej. Cesar AP"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm text-slate-300">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Tu contraseña"
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
                        className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-60"
                    >
                        {cargando ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </section>
        </main>
    );
}

export default Login;