import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import PublicRoute from '../components/layout/PublicRoute';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Inventario from '../pages/Inventario';
import Ventas from '../pages/Ventas';
import Jornadas from '../pages/Jornadas';
import Reportes from '../pages/Reportes';
import Usuarios from '../pages/Usuarios';
import Cortes from '../pages/Cortes';

import { useAuth } from '../context/AuthContext';
import {
    MODULOS,
    obtenerRutaInicial
} from '../config/permisos';

function RutaInicial() {
    const { perfil } = useAuth();

    return <Navigate to={obtenerRutaInicial(perfil)} replace />;
}

function protegerModulo(modulo, componente) {
    return (
        <ProtectedRoute modulo={modulo}>
            {componente}
        </ProtectedRoute>
    );
}

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<RutaInicial />} />

                <Route
                    path="dashboard"
                    element={protegerModulo(
                        MODULOS.DASHBOARD,
                        <Dashboard />
                    )}
                />

                <Route
                    path="ventas"
                    element={protegerModulo(
                        MODULOS.VENTAS,
                        <Ventas />
                    )}
                />

                <Route
                    path="inventario"
                    element={protegerModulo(
                        MODULOS.INVENTARIO,
                        <Inventario />
                    )}
                />

                <Route
                    path="jornadas"
                    element={protegerModulo(
                        MODULOS.JORNADAS,
                        <Jornadas />
                    )}
                />

                <Route
                    path="reportes"
                    element={protegerModulo(
                        MODULOS.REPORTES,
                        <Reportes />
                    )}
                />

                <Route
                    path="usuarios"
                    element={protegerModulo(
                        MODULOS.USUARIOS,
                        <Usuarios />
                    )}
                />

                <Route
                    path="cortes"
                    element={protegerModulo(
                        MODULOS.CORTES,
                        <Cortes />
                    )}
                />

                <Route path="*" element={<RutaInicial />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default AppRoutes;
