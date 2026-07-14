import { apiRequest } from './apiClient';

export function obtenerCatalogosJornadas() {
    return apiRequest('/jornadas/catalogos');
}

export function obtenerJornadas() {
    return apiRequest('/jornadas');
}

export function abrirJornada(datosJornada) {
    return apiRequest('/jornadas', {
        method: 'POST',
        body: JSON.stringify(datosJornada)
    });
}

export function cerrarJornada(idJornada, datosCierre = {}) {
    return apiRequest(`/jornadas/${idJornada}/cerrar`, {
        method: 'PATCH',
        body: JSON.stringify(datosCierre)
    });
}

export function crearPuesto(datosPuesto) {
    return apiRequest('/jornadas/puestos', {
        method: 'POST',
        body: JSON.stringify(datosPuesto)
    });
}