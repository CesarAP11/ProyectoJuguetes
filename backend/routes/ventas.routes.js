const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarVendedor = require('../middleware/verificarVendedor');

const {
    obtenerCatalogosVentas,
    listarInventarioPorJornada,
    registrarVenta
} = require('../controllers/ventas.controller');

const router = express.Router();

router.use(verificarToken);
router.use(verificarVendedor);

router.get('/catalogos', obtenerCatalogosVentas);

/*
    Ruta principal usada por React:
    GET /api/ventas/jornada/:idJornada/inventario
*/
router.get('/jornada/:idJornada/inventario', listarInventarioPorJornada);

/*
    Ruta alternativa por si tu frontend viejo usaba:
    GET /api/ventas/inventario/:idJornada
*/
router.get('/inventario/:idJornada', listarInventarioPorJornada);

router.post('/', registrarVenta);

module.exports = router;