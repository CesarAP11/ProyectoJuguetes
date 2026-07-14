import { apiRequest } from './apiClient';

export function obtenerMetodosPagoActivosRequest() {
    return apiRequest('/pagos/activos');
}

export function obtenerMetodosPagoRequest() {
    return apiRequest('/pagos');
}

export function crearMetodoPagoRequest(datos) {
    return apiRequest('/pagos', {
        method: 'POST',
        body: JSON.stringify(datos)
    });
}

export function actualizarMetodoPagoRequest(idMetodoPago, datos) {
    return apiRequest(`/pagos/${idMetodoPago}`, {
        method: 'PUT',
        body: JSON.stringify(datos)
    });
}

export function cambiarEstadoMetodoPagoRequest(idMetodoPago, activo) {
    return apiRequest(`/pagos/${idMetodoPago}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ activo })
    });
}