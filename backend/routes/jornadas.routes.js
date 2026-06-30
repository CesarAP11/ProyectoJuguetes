const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarEncargadoOAdministrador = require('../middleware/verificarEncargadoOAdministrador');

const {
    obtenerCatalogosJornadas,
    listarJornadas,
    abrirJornada,
    cerrarJornada
} = require('../controllers/jornadas.controller');

const router = express.Router();

router.use(verificarToken);
router.use(verificarEncargadoOAdministrador);

router.get('/catalogos', obtenerCatalogosJornadas);
router.get('/', listarJornadas);
router.post('/', abrirJornada);
router.patch('/:idJornada/cerrar', cerrarJornada);

module.exports = router;