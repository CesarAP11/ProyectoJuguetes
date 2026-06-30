const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarAdministrador = require('../middleware/verificarAdministrador');

const {
    obtenerResumenReportes
} = require('../controllers/reportes.controller');

const router = express.Router();

router.use(verificarToken);
router.use(verificarAdministrador);

router.get('/resumen', obtenerResumenReportes);

module.exports = router;