import { NavLink } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import {
    MODULOS_MENU,
    tienePermisoModulo
} from '../../config/permisos';

function ContenidoSidebar({ onCerrar }) {
    const { perfil } = useAuth();

    return (
        <>
            <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                    <img
                        src="/images/logo-juguetesfun.png"
                        alt="Logo de JuguetesFun"
                        className="h-full w-full scale-125 object-contain"
                        draggable="false"
                    />
                </div>

                <div className="min-w-0">
                    <h1 className="truncate text-xl font-bold text-white">
                        JuguetesFun
                    </h1>

                    <p className="text-sm text-slate-500">
                        Sistema de ventas
                    </p>
                </div>
            </div>

            <nav className="space-y-2">
                {MODULOS_MENU.map((enlace) => {
                    const habilitado = tienePermisoModulo(
                        perfil,
                        enlace.id
                    );

                    if (!habilitado) {
                        return (
                            <button
                                key={enlace.ruta}
                                type="button"
                                disabled
                                aria-disabled="true"
                                title="Módulo no disponible para tus roles"
                                className="flex w-full cursor-not-allowed items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left text-sm font-medium text-slate-600 opacity-70"
                            >
                                <span>{enlace.texto}</span>

                                <span
                                    aria-hidden="true"
                                    className="text-xs"
                                >
                                    🔒
                                </span>
                            </button>
                        );
                    }

                    return (
                        <NavLink
                            key={enlace.ruta}
                            to={enlace.ruta}
                            onClick={onCerrar}
                            className={({ isActive }) =>
                                `flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-emerald-500 text-slate-950'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            <span>{enlace.texto}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-500">
                Los módulos con candado requieren otro rol.
            </div>
        </>
    );
}

function Sidebar({ abierto, onCerrar }) {
    return (
        <>
            <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 overflow-y-auto border-r border-slate-800 bg-slate-950 p-5 lg:block">
                <ContenidoSidebar />
            </aside>

            {abierto && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Cerrar menú"
                        onClick={onCerrar}
                        className="absolute inset-0 bg-black/60"
                    />

                    <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto border-r border-slate-800 bg-slate-950 p-5 shadow-2xl">
                        <div className="mb-5 flex justify-end">
                            <button
                                type="button"
                                onClick={onCerrar}
                                className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                            >
                                Cerrar
                            </button>
                        </div>

                        <ContenidoSidebar onCerrar={onCerrar} />
                    </aside>
                </div>
            )}
        </>
    );
}

export default Sidebar;