import { createContext, useContext, useEffect, useState } from 'react';
import { loginRequest, obtenerPerfilRequest } from '../api/auth.api';
import { supabaseClient } from '../api/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [perfil, setPerfil] = useState(null);
    const [cargando, setCargando] = useState(true);

    async function cargarPerfil() {
        try {
            const token = localStorage.getItem('tokenJuguetesFun');
            const refreshToken = localStorage.getItem('refreshTokenJuguetesFun');

            if (!token) {
                setPerfil(null);
                return;
            }

            if (token && refreshToken) {
                await supabaseClient.auth.setSession({
                    access_token: token,
                    refresh_token: refreshToken
                });
            }

            const data = await obtenerPerfilRequest();
            setPerfil(data.perfil);

        } catch (error) {
            console.error('Error al cargar perfil:', error);

            localStorage.removeItem('tokenJuguetesFun');
            localStorage.removeItem('refreshTokenJuguetesFun');

            await supabaseClient.auth.signOut();

            setPerfil(null);

        } finally {
            setCargando(false);
        }
    }

    async function iniciarSesion(usuario, password) {
        const data = await loginRequest(usuario, password);

        localStorage.setItem('tokenJuguetesFun', data.session.access_token);
        localStorage.setItem('refreshTokenJuguetesFun', data.session.refresh_token);

        await supabaseClient.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });

        setPerfil(data.perfil);

        return data;
    }

    async function cerrarSesion() {
        localStorage.removeItem('tokenJuguetesFun');
        localStorage.removeItem('refreshTokenJuguetesFun');

        await supabaseClient.auth.signOut();

        setPerfil(null);
    }

    useEffect(() => {
        cargarPerfil();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                perfil,
                cargando,
                iniciarSesion,
                cerrarSesion,
                autenticado: Boolean(perfil)
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}