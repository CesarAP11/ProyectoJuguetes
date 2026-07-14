const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarAdministrador = require('../middleware/verificarAdministrador');

const {
    listarMetodosPago,
    listarMetodosPagoActivos,
    crearMetodoPago,
    actualizarMetodoPago,
    cambiarEstadoMetodoPago
} = require('../controllers/pagos.controller');

const router = express.Router();

router.use(verificarToken);

// Cualquier usuario autenticado puede ver los métodos activos (los usa la pantalla de Ventas)
router.get('/activos', listarMetodosPagoActivos);

// Gestionar métodos de pago es una acción administrativa
router.get('/', verificarAdministrador, listarMetodosPago);
router.post('/', verificarAdministrador, crearMetodoPago);
router.put('/:idMetodoPago', verificarAdministrador, actualizarMetodoPago);
router.patch('/:idMetodoPago/estado', verificarAdministrador, cambiarEstadoMetodoPago);

module.exports = router;