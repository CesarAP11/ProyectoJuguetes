const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarEncargadoOAdministrador = require('../middleware/verificarEncargadoOAdministrador');
const verificarAdminPrincipal = require('../middleware/verificarAdmin');

const {
    obtenerJornadasParaCorte,
    obtenerResumenCorte,
    obtenerCortePorJornada,
    registrarGasto,
    eliminarGasto,
    guardarCorteCaja,
    modificarCorteCaja,
    obtenerHistorialCorte,
    descargarPdfCorte
} = require('../controllers/cortes.controller');

const router = express.Router();

router.use(verificarToken);
router.use(verificarEncargadoOAdministrador);

router.get('/jornadas', obtenerJornadasParaCorte);
router.get('/jornada/:idJornada/resumen', obtenerResumenCorte);
router.get('/jornada/:idJornada', obtenerCortePorJornada);

router.post('/gastos', registrarGasto);
router.delete('/gastos/:idGasto', eliminarGasto);

router.get('/:idCorte/pdf', descargarPdfCorte);
router.get('/:idCorte/historial', obtenerHistorialCorte);
router.patch('/:idCorte', verificarAdminPrincipal, modificarCorteCaja);

router.post('/', guardarCorteCaja);

module.exports = router;