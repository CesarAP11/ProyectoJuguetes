import { Navigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { tienePermisoModulo } from '../../config/permisos';
import AccesoRestringido from '../../pages/AccesoRestringido';

function ProtectedRoute({ children, modulo = null }) {
    const { autenticado, cargando, perfil } = useAuth();

    if (cargando) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
                Cargando sesión...
            </div>
        );
    }

    if (!autenticado) {
        return <Navigate to="/login" replace />;
    }

    if (modulo && !tienePermisoModulo(perfil, modulo)) {
        return <AccesoRestringido modulo={modulo} />;
    }

    return children;
}

export default ProtectedRoute;
