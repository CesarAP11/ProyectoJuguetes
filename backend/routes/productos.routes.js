const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarVendedor = require('../middleware/verificarVendedor');
const filtrarInventarioPorRol = require('../middleware/filtrarInventarioPorRol');
const verificarEncargadoOAdministrador = require('../middleware/verificarEncargadoOAdministrador');
const verificarAdminPrincipal = require('../middleware/verificarAdmin');

const {
    obtenerCatalogos,
    listarInventario,
    registrarEntradaInventario,
    eliminarInventario,
    actualizarFotoInventario,
    cambiarPuestoInventario,
    resurtirInventario,
    cambiarPrecioVentaInventario,
    cambiarCostoUnitarioInventario
} = require('../controllers/productos.controller');

const router = express.Router();

router.use(verificarToken);

// Vendedor, encargado, administrador y admin principal pueden consultar.
router.get('/catalogos', verificarVendedor, obtenerCatalogos);
router.get(
    '/inventario',
    verificarVendedor,
    filtrarInventarioPorRol,
    listarInventario
);

// Solo encargado, administrador y admin principal pueden modificar.
router.post(
    '/inventario',
    verificarEncargadoOAdministrador,
    registrarEntradaInventario
);

router.patch(
    '/inventario/:idInventario/foto',
    verificarEncargadoOAdministrador,
    actualizarFotoInventario
);

router.patch(
    '/inventario/:idInventario/puesto',
    verificarEncargadoOAdministrador,
    cambiarPuestoInventario
);

router.patch(
    '/inventario/:idInventario/resurtir',
    verificarEncargadoOAdministrador,
    resurtirInventario
);

router.patch(
    '/inventario/:idInventario/precio',
    verificarEncargadoOAdministrador,
    cambiarPrecioVentaInventario
);

router.patch(
    '/inventario/:idInventario/costo',
    verificarEncargadoOAdministrador,
    cambiarCostoUnitarioInventario
);

// Eliminar inventario continúa reservado al administrador principal.
router.delete(
    '/inventario/:idInventario',
    verificarAdminPrincipal,
    eliminarInventario
);

module.exports = router;
