import { apiRequest } from './apiClient';

export function loginRequest(usuario, password) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            usuario,
            password
        })
    });
}

export function obtenerPerfilRequest() {
    return apiRequest('/auth/perfil');
}