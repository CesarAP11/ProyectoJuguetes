import { apiRequest } from './apiClient';

export function obtenerJornadasParaCorte() {
    return apiRequest('/cortes/jornadas');
}

export function obtenerResumenCorte(idJornada) {
    return apiRequest(`/cortes/jornada/${idJornada}/resumen`);
}

export function obtenerCortePorJornada(idJornada) {
    return apiRequest(`/cortes/jornada/${idJornada}`);
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

export function modificarCorteCaja(idCorte, datosCorte) {
    return apiRequest(`/cortes/${idCorte}`, {
        method: 'PATCH',
        body: JSON.stringify(datosCorte)
    });
}

export function obtenerHistorialCorte(idCorte) {
    return apiRequest(`/cortes/${idCorte}/historial`);
}

export async function descargarPdfCorte(idCorte) {
    const respuesta = await apiRequest(`/cortes/${idCorte}/pdf`);

    if (!respuesta?.contenido_base64) {
        throw new Error('El servidor no devolvió el contenido del PDF.');
    }

    const binario = atob(respuesta.contenido_base64);
    const bytes = new Uint8Array(binario.length);

    for (let indice = 0; indice < binario.length; indice += 1) {
        bytes[indice] = binario.charCodeAt(indice);
    }

    const blob = new Blob([bytes], {
        type: respuesta.mime_type || 'application/pdf'
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = respuesta.archivo || 'Corte_de_caja.pdf';

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);

    return respuesta;
}
