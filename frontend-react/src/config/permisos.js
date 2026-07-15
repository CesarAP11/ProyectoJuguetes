export const MODULOS = Object.freeze({
    DASHBOARD: 'dashboard',
    VENTAS: 'ventas',
    INVENTARIO: 'inventario',
    JORNADAS: 'jornadas',
    REPORTES: 'reportes',
    USUARIOS: 'usuarios',
    CORTES: 'cortes'
});

export const MODULOS_MENU = Object.freeze([
    {
        id: MODULOS.DASHBOARD,
        texto: 'Dashboard',
        ruta: '/dashboard'
    },
    {
        id: MODULOS.VENTAS,
        texto: 'Ventas',
        ruta: '/ventas'
    },
    {
        id: MODULOS.INVENTARIO,
        texto: 'Inventario',
        ruta: '/inventario'
    },
    {
        id: MODULOS.JORNADAS,
        texto: 'Jornadas',
        ruta: '/jornadas'
    },
    {
        id: MODULOS.REPORTES,
        texto: 'Reportes',
        ruta: '/reportes'
    },
    {
        id: MODULOS.USUARIOS,
        texto: 'Usuarios',
        ruta: '/usuarios'
    },
    {
        id: MODULOS.CORTES,
        texto: 'Cortes',
        ruta: '/cortes'
    }
]);

const ROLES_POR_MODULO = Object.freeze({
    [MODULOS.DASHBOARD]: ['administrador'],
    [MODULOS.VENTAS]: ['vendedor', 'encargado', 'administrador'],
    [MODULOS.INVENTARIO]: ['vendedor', 'encargado', 'administrador'],
    [MODULOS.JORNADAS]: ['encargado', 'administrador'],
    [MODULOS.REPORTES]: ['administrador'],
    [MODULOS.USUARIOS]: ['administrador'],
    [MODULOS.CORTES]: ['encargado', 'administrador']
});

const ETIQUETAS_ROLES = Object.freeze({
    vendedor: 'Vendedor',
    encargado: 'Encargado',
    administrador: 'Administrador'
});

function normalizarRol(rol) {
    if (!rol) {
        return '';
    }

    if (typeof rol === 'string') {
        return rol.trim().toLowerCase();
    }

    if (Array.isArray(rol)) {
        return normalizarRol(rol[0]);
    }

    if (rol.nombre) {
        return String(rol.nombre).trim().toLowerCase();
    }

    if (rol.rol) {
        return String(rol.rol).trim().toLowerCase();
    }

    if (rol.roles) {
        return normalizarRol(rol.roles);
    }

    return '';
}

export function obtenerRolesPerfil(perfil) {
    if (!perfil || !Array.isArray(perfil.roles)) {
        return [];
    }

    return [
        ...new Set(
            perfil.roles
                .map(normalizarRol)
                .filter(Boolean)
        )
    ];
}

export function esAdministradorPrincipal(perfil) {
    return Boolean(perfil?.es_admin_principal);
}

export function tieneRol(perfil, rolesPermitidos = []) {
    if (esAdministradorPrincipal(perfil)) {
        return true;
    }

    const rolesPerfil = obtenerRolesPerfil(perfil);

    return rolesPermitidos.some((rol) => {
        return rolesPerfil.includes(String(rol).trim().toLowerCase());
    });
}

export function tienePermisoModulo(perfil, modulo) {
    if (esAdministradorPrincipal(perfil)) {
        return true;
    }

    const rolesPermitidos = ROLES_POR_MODULO[modulo] || [];

    return tieneRol(perfil, rolesPermitidos);
}

export function puedeGestionarInventario(perfil) {
    return tieneRol(perfil, ['encargado', 'administrador']);
}

export function obtenerRutaInicial(perfil) {
    if (tienePermisoModulo(perfil, MODULOS.DASHBOARD)) {
        return '/dashboard';
    }

    const primerModuloPermitido = MODULOS_MENU.find((modulo) => {
        return tienePermisoModulo(perfil, modulo.id);
    });

    return primerModuloPermitido?.ruta || '/ventas';
}

export function obtenerNombreModulo(modulo) {
    return MODULOS_MENU.find((item) => item.id === modulo)?.texto || 'Módulo';
}

export function obtenerEtiquetaRoles(perfil) {
    if (esAdministradorPrincipal(perfil)) {
        return 'Administrador principal';
    }

    const roles = obtenerRolesPerfil(perfil);

    if (roles.length === 0) {
        return 'Sin rol asignado';
    }

    return roles
        .map((rol) => ETIQUETAS_ROLES[rol] || rol)
        .join(' · ');
}
