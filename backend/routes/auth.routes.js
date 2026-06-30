const express = require('express');

const verificarToken = require('../middleware/verificarToken');

const {
    obtenerEmailPorUsername,
    iniciarSesion,
    obtenerPerfilActual,
    verificarSesion,
    cerrarSesion
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', iniciarSesion);

router.post('/email-por-username', obtenerEmailPorUsername);
router.post('/buscar-email', obtenerEmailPorUsername);

router.get('/perfil', verificarToken, obtenerPerfilActual);
router.get('/me', verificarToken, obtenerPerfilActual);
router.get('/verificar', verificarToken, verificarSesion);

router.post('/logout', verificarToken, cerrarSesion);

module.exports = router;