const CAMPOS_SENSIBLES = [
    'costo',
    'ganancia',
    'utilidad',
    'margen',
    'compra',
    'proveedor'
];

function esCampoSensible(nombreCampo) {
    const nombre = String(nombreCampo || '').trim().toLowerCase();

    return CAMPOS_SENSIBLES.some((fragmento) => {
        return nombre.includes(fragmento);
    });
}

function limpiarRegistroInventario(registro) {
    if (!registro || typeof registro !== 'object' || Array.isArray(registro)) {
        return registro;
    }

    return Object.fromEntries(
        Object.entries(registro).filter(([campo]) => {
            return !esCampoSensible(campo);
        })
    );
}

function filtrarInventarioPorRol(req, res, next) {
    if (!req.esSoloVendedor) {
        return next();
    }

    const responderJson = res.json.bind(res);

    res.json = (contenido) => {
        if (!contenido || !Array.isArray(contenido.inventario)) {
            return responderJson(contenido);
        }

        return responderJson({
            ...contenido,
            inventario: contenido.inventario.map(limpiarRegistroInventario),
            modo_consulta: true
        });
    };

    return next();
}

module.exports = filtrarInventarioPorRol;
