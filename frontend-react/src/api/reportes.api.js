import { apiRequest } from './apiClient';

export function obtenerResumenReportes(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.fecha_inicio) {
        params.append('fecha_inicio', filtros.fecha_inicio);
    }

    if (filtros.fecha_fin) {
        params.append('fecha_fin', filtros.fecha_fin);
    }

    const query = params.toString();

    return apiRequest(`/reportes/resumen${query ? `?${query}` : ''}`);
}