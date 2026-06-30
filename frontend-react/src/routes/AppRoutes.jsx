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
                <Route index element={<Navigate to="/ventas" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="ventas" element={<Ventas />} />
                <Route path="inventario" element={<Inventario />} />
                <Route path="jornadas" element={<Jornadas />} />
                <Route path="reportes" element={<Reportes />} />
                <Route path="usuarios" element={<Usuarios />} />
                <Route path="cortes" element={<Cortes />} />
            </Route>

            <Route path="*" element={<Navigate to="/ventas" replace />} />
        </Routes>
    );
}

export default AppRoutes;