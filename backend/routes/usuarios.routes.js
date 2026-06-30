const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarAdminPrincipal = require('../middleware/verificarAdmin');

const {
    listarUsuarios,
    crearUsuario,
    actualizarRolesUsuario,
    cambiarEstadoUsuario
} = require('../controllers/usuarios.controller');

const router = express.Router();

router.use(verificarToken);
router.use(verificarAdminPrincipal);

router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.put('/:idPerfil/roles', actualizarRolesUsuario);
router.patch('/:idPerfil/estado', cambiarEstadoUsuario);

module.exports = router;