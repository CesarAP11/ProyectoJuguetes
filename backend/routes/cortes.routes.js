const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarEncargadoOAdministrador = require('../middleware/verificarEncargadoOAdministrador');

const {
    obtenerJornadasParaCorte,
    obtenerResumenCorte,
    registrarGasto,
    eliminarGasto,
    guardarCorteCaja
} = require('../controllers/cortes.controller');

const router = express.Router();

router.use(verificarToken);
router.use(verificarEncargadoOAdministrador);

router.get('/jornadas', obtenerJornadasParaCorte);
router.get('/jornada/:idJornada/resumen', obtenerResumenCorte);

router.post('/gastos', registrarGasto);
router.delete('/gastos/:idGasto', eliminarGasto);

router.post('/', guardarCorteCaja);

module.exports = router;