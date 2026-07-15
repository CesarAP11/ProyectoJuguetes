import { Link } from 'react-router-dom';

import {
    obtenerNombreModulo,
    obtenerRutaInicial
} from '../config/permisos';

import { useAuth } from '../context/AuthContext';

function AccesoRestringido({ modulo }) {
    const { perfil } = useAuth();

    return (
        <section className="grid min-h-[65vh] place-items-center">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-slate-700 bg-slate-950 text-3xl">
                    🔒
                </div>

                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Acceso restringido
                </p>

                <h1 className="mt-3 text-3xl font-bold text-white">
                    {obtenerNombreModulo(modulo)} no está habilitado
                </h1>

                <p className="mx-auto mt-4 max-w-xl text-slate-400">
                    Tu cuenta puede ver este módulo en el menú, pero el rol asignado
                    no permite abrirlo ni utilizar sus funciones.
                </p>

                <Link
                    to={obtenerRutaInicial(perfil)}
                    className="mt-7 inline-flex rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-400"
                >
                    Ir a un módulo permitido
                </Link>
            </div>
        </section>
    );
}

export default AccesoRestringido;
