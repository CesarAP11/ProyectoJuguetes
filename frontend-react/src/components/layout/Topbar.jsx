import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { obtenerEtiquetaRoles } from '../../config/permisos';

function Topbar({ onAbrirSidebar }) {
    const { perfil, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    async function handleCerrarSesion() {
        await cerrarSesion();
        navigate('/login', { replace: true });
    }

    return (
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <button
                    type="button"
                    onClick={onAbrirSidebar}
                    aria-label="Abrir menú"
                    className="rounded-xl border border-slate-700 px-3 py-2 text-white transition hover:bg-slate-800 lg:hidden"
                >
                    ☰
                </button>

                <div>
                    <h2 className="text-lg font-bold text-white">
                        Panel de control
                    </h2>

                    <p className="text-sm text-slate-400">
                        Administración de JuguetesFun
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden text-right sm:block">
                        <p className="font-semibold text-white">
                            {perfil?.nombre_completo ||
                                perfil?.username}
                        </p>

                        <p className="text-sm text-slate-400">
                            {obtenerEtiquetaRoles(perfil)}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleCerrarSesion}
                        className="rounded-xl border border-red-500 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500 hover:text-white"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Topbar;