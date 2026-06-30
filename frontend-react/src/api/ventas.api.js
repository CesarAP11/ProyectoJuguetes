import { apiRequest } from './apiClient';

export function obtenerCatalogosVentas() {
    return apiRequest('/ventas/catalogos');
}

export function obtenerInventarioPorJornada(idJornada) {
    return apiRequest(`/ventas/jornada/${idJornada}/inventario`);
}

export function registrarVenta(datosVenta) {
    return apiRequest('/ventas', {
        method: 'POST',
        body: JSON.stringify(datosVenta)
    });
}