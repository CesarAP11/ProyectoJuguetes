import { NavLink } from 'react-router-dom';

const enlaces = [
    { texto: 'Dashboard', ruta: '/dashboard' },
    { texto: 'Ventas', ruta: '/ventas' },
    { texto: 'Inventario', ruta: '/inventario' },
    { texto: 'Jornadas', ruta: '/jornadas' },
    { texto: 'Reportes', ruta: '/reportes' },
    { texto: 'Usuarios', ruta: '/usuarios' },
    { texto: 'Cortes', ruta: '/cortes' }
];

function ContenidoSidebar({ onCerrar }) {
    return (
        <>
            <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 font-bold text-slate-950">
                    JF
                </div>

                <div>
                    <h1 className="text-xl font-bold text-white">JuguetesFun</h1>
                    <p className="text-sm text-slate-500">Sistema de ventas</p>
                </div>
            </div>

            <nav className="space-y-2">
                {enlaces.map((enlace) => (
                    <NavLink
                        key={enlace.ruta}
                        to={enlace.ruta}
                        onClick={onCerrar}
                        className={({ isActive }) =>
                            `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                                isActive
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        {enlace.texto}
                    </NavLink>
                ))}
            </nav>
        </>
    );
}

function Sidebar({ abierto, onCerrar }) {
    return (
        <>
            <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-slate-800 bg-slate-950 p-5 lg:block">
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

                    <aside className="relative h-full w-72 max-w-[85vw] border-r border-slate-800 bg-slate-950 p-5 shadow-2xl">
                        <div className="mb-5 flex justify-end">
                            <button
                                type="button"
                                onClick={onCerrar}
                                className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
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