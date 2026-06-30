import { apiRequest } from './apiClient';

export function obtenerCatalogosInventario() {
    return apiRequest('/productos/catalogos');
}

export function obtenerInventario() {
    return apiRequest('/productos/inventario');
}

export function registrarEntradaInventario(datosInventario) {
    return apiRequest('/productos/inventario', {
        method: 'POST',
        body: JSON.stringify(datosInventario)
    });
}

export function actualizarFotoInventario(idInventario, datosFoto) {
    return apiRequest(`/productos/inventario/${idInventario}/foto`, {
        method: 'PATCH',
        body: JSON.stringify(datosFoto)
    });
}

export function cambiarPuestoInventario(idInventario, datosCambio) {
    return apiRequest(`/productos/inventario/${idInventario}/puesto`, {
        method: 'PATCH',
        body: JSON.stringify(datosCambio)
    });
}

export function resurtirInventario(idInventario, datosResurtido) {
    return apiRequest(`/productos/inventario/${idInventario}/resurtir`, {
        method: 'PATCH',
        body: JSON.stringify(datosResurtido)
    });
}

export function eliminarInventario(idInventario, motivo) {
    return apiRequest(`/productos/inventario/${idInventario}`, {
        method: 'DELETE',
        body: JSON.stringify({ motivo })
    });
}

export function cambiarPrecioVentaInventario(idInventario, datosPrecio) {
    return apiRequest(`/productos/inventario/${idInventario}/precio`, {
        method: 'PATCH',
        body: JSON.stringify(datosPrecio)
    });
}

export function cambiarCostoUnitarioInventario(idInventario, datosCosto) {
    return apiRequest(`/productos/inventario/${idInventario}/costo`, {
        method: 'PATCH',
        body: JSON.stringify(datosCosto)
    });
}