import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ children }) {
    const { autenticado, cargando } = useAuth();

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

    return children;
}

export default ProtectedRoute;