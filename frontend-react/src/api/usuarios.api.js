import { apiRequest } from './apiClient';

export function obtenerUsuarios() {
    return apiRequest('/usuarios');
}

export function crearUsuario(datosUsuario) {
    return apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify(datosUsuario)
    });
}

export function actualizarRolesUsuario(idPerfil, roles) {
    return apiRequest(`/usuarios/${idPerfil}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roles })
    });
}

export function cambiarEstadoUsuario(idPerfil, activo) {
    return apiRequest(`/usuarios/${idPerfil}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ activo })
    });
}