const { supabaseAdmin } = require('../services/supabase.service');

async function verificarToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Token no enviado.'
            });
        }

        const token = authHeader.replace('Bearer ', '').trim();

        const { data, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                ok: false,
                mensaje: 'Token inválido o sesión expirada.'
            });
        }

        req.usuario = data.user;
        next();

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al verificar sesión.',
            error: error.message
        });
    }
}

module.exports = verificarToken;