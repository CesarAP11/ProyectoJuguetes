const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarAdministrador = require('../middleware/verificarAdministrador');
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

router.get('/catalogos', verificarAdministrador, obtenerCatalogos);
router.get('/inventario', verificarAdministrador, listarInventario);
router.post('/inventario', verificarAdministrador, registrarEntradaInventario);

router.patch('/inventario/:idInventario/foto', verificarAdministrador, actualizarFotoInventario);
router.patch('/inventario/:idInventario/puesto', verificarAdministrador, cambiarPuestoInventario);
router.patch('/inventario/:idInventario/resurtir', verificarAdministrador, resurtirInventario);
router.patch('/inventario/:idInventario/precio', verificarAdministrador, cambiarPrecioVentaInventario);
router.patch('/inventario/:idInventario/costo', verificarAdministrador, cambiarCostoUnitarioInventario);

router.delete('/inventario/:idInventario', verificarAdminPrincipal, eliminarInventario);

module.exports = router;