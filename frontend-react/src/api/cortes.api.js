import { apiRequest } from './apiClient';

export function obtenerJornadasParaCorte() {
    return apiRequest('/cortes/jornadas');
}

export function obtenerResumenCorte(idJornada) {
    return apiRequest(`/cortes/jornada/${idJornada}/resumen`);
}

export function registrarGasto(datosGasto) {
    return apiRequest('/cortes/gastos', {
        method: 'POST',
        body: JSON.stringify(datosGasto)
    });
}

export function eliminarGasto(idGasto) {
    return apiRequest(`/cortes/gastos/${idGasto}`, {
        method: 'DELETE'
    });
}

export function guardarCorteCaja(datosCorte) {
    return apiRequest('/cortes', {
        method: 'POST',
        body: JSON.stringify(datosCorte)
    });
}