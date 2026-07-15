const express = require('express');

const verificarToken = require('../middleware/verificarToken');
const verificarAdministrador = require('../middleware/verificarAdministrador');

const {
    listarUsuarios,
    crearUsuario,
    actualizarRolesUsuario,
    cambiarEstadoUsuario
} = require('../controllers/usuarios.controller');

const router = express.Router();

router.use(verificarToken);
router.use(verificarAdministrador);

router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.put('/:idPerfil/roles', actualizarRolesUsuario);
router.patch('/:idPerfil/estado', cambiarEstadoUsuario);

module.exports = router;
