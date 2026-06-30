require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const productosRoutes = require('./routes/productos.routes');
const jornadasRoutes = require('./routes/jornadas.routes');
const ventasRoutes = require('./routes/ventas.routes');
const reportesRoutes = require('./routes/reportes.routes');
const cortesRoutes = require('./routes/cortes.routes');
const pagosRoutes = require('./routes/pagos.routes');

const app = express();

const PORT = process.env.PORT || 3000;

const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origen no permitido por CORS: ' + origin));
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.json({
        ok: true,
        mensaje: 'Backend de JuguetesFun funcionando correctamente'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/jornadas', jornadasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/cortes', cortesRoutes);
app.use('/api/pagos', pagosRoutes);

app.use((req, res) => {
    res.status(404).json({
        ok: false,
        mensaje: 'Ruta no encontrada.'
    });
});

app.use((error, req, res, next) => {
    console.error('Error general del servidor:', error);

    res.status(500).json({
        ok: false,
        mensaje: 'Error interno del servidor.',
        error: error.message
    });
});

app.listen(PORT, () => {
    console.log(`Servidor JuguetesFun corriendo en puerto ${PORT}`);
});