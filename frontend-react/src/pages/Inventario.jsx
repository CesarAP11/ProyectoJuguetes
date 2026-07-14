import { useEffect, useRef, useState } from 'react';

import {
    obtenerCatalogosInventario,
    obtenerInventario,
    registrarEntradaInventario,
    actualizarFotoInventario,
    cambiarPuestoInventario,
    resurtirInventario,
    eliminarInventario,
    cambiarPrecioVentaInventario,
    cambiarCostoUnitarioInventario
} from '../api/productos.api';

import { subirFotoProducto } from '../api/storage.api';
import { useAuth } from '../context/AuthContext';

const estadoInicialFormulario = {
    id_propietario: '',
    id_puesto: '',
    id_categoria: '',
    nombre_producto: '',
    descripcion: '',
    nombre_compra: '',
    fecha_compra: '',
    cantidad: '',
    costo_unitario: '',
    precio_venta_sugerido: '',
    foto: null
};

function Inventario() {
    const { perfil } = useAuth();

    const inputFotoActualizarRef = useRef(null);

    const [inventario, setInventario] = useState([]);
    const [propietarios, setPropietarios] = useState([]);
    const [puestos, setPuestos] = useState([]);
    const [categorias, setCategorias] = useState([]);

    const [formulario, setFormulario] = useState(estadoInicialFormulario);
    const [previewFoto, setPreviewFoto] = useState('');

    const [puestosSeleccionados, setPuestosSeleccionados] = useState({});
    const [idInventarioFoto, setIdInventarioFoto] = useState(null);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [accionando, setAccionando] = useState(false);

    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('success');

    async function cargarDatosIniciales() {
        try {
            setCargando(true);
            setMensaje('');

            const [catalogosData, inventarioData] = await Promise.all([
                obtenerCatalogosInventario(),
                obtenerInventario()
            ]);

            setPropietarios(catalogosData.propietarios || []);
            setPuestos(catalogosData.puestos || []);
            setCategorias(catalogosData.categorias || []);

            const inventarioCargado = inventarioData.inventario || [];
            setInventario(inventarioCargado);

            prepararPuestosSeleccionados(inventarioCargado);

        } catch (error) {
            console.error('Error al cargar datos de inventario:', error);
            mostrarMensaje('danger', error.message || 'No se pudo cargar el inventario.');

        } finally {
            setCargando(false);
        }
    }

    async function cargarInventario() {
        try {
            setMensaje('');

            const data = await obtenerInventario();
            const inventarioCargado = data.inventario || [];

            setInventario(inventarioCargado);
            prepararPuestosSeleccionados(inventarioCargado);

        } catch (error) {
            console.error('Error al cargar inventario:', error);
            mostrarMensaje('danger', error.message || 'No se pudo cargar el inventario.');
        }
    }

    function prepararPuestosSeleccionados(listaInventario) {
        const valores = {};

        listaInventario.forEach((item) => {
            valores[item.id_inventario_puesto] = item.id_puesto || '';
        });

        setPuestosSeleccionados(valores);
    }

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    function mostrarMensaje(tipo, texto) {
        setTipoMensaje(tipo);
        setMensaje(texto);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setFormulario((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    function handleFotoChange(event) {
        const archivo = event.target.files[0];

        setFormulario((prev) => ({
            ...prev,
            foto: archivo || null
        }));

        if (archivo) {
            setPreviewFoto(URL.createObjectURL(archivo));
        } else {
            setPreviewFoto('');
        }
    }

    function limpiarFormulario() {
        setFormulario(estadoInicialFormulario);
        setPreviewFoto('');

        const inputFoto = document.getElementById('fotoProductoReact');
        if (inputFoto) {
            inputFoto.value = '';
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setGuardando(true);
            setMensaje('');

            if (!formulario.id_propietario) {
                mostrarMensaje('danger', 'Selecciona el propietario.');
                return;
            }

            if (!formulario.id_puesto) {
                mostrarMensaje('danger', 'Selecciona el puesto.');
                return;
            }

            if (!formulario.id_categoria) {
                mostrarMensaje('danger', 'Selecciona la categoría.');
                return;
            }

            if (!formulario.nombre_producto.trim()) {
                mostrarMensaje('danger', 'Escribe el nombre del producto.');
                return;
            }

            if (!formulario.nombre_compra.trim()) {
                mostrarMensaje('danger', 'Escribe el nombre de la compra.');
                return;
            }

            if (!formulario.fecha_compra) {
                mostrarMensaje('danger', 'Selecciona la fecha de compra.');
                return;
            }

            if (Number(formulario.cantidad) <= 0) {
                mostrarMensaje('danger', 'La cantidad debe ser mayor a 0.');
                return;
            }

            if (Number(formulario.costo_unitario) < 0) {
                mostrarMensaje('danger', 'El costo unitario no puede ser negativo.');
                return;
            }

            if (Number(formulario.precio_venta_sugerido) < 0) {
                mostrarMensaje('danger', 'El precio de venta no puede ser negativo.');
                return;
            }

            const fotoSubida = await subirFotoProducto(formulario.foto);

            const datosEnviar = {
                id_propietario: formulario.id_propietario,
                id_puesto: formulario.id_puesto,
                id_categoria: formulario.id_categoria,

                nombre_producto: formulario.nombre_producto.trim(),
                nombre: formulario.nombre_producto.trim(),
                descripcion: formulario.descripcion.trim(),

                nombre_compra: formulario.nombre_compra.trim(),
                fecha_compra: formulario.fecha_compra,

                cantidad: Number(formulario.cantidad),
                costo_unitario: Number(formulario.costo_unitario),
                precio_venta_sugerido: Number(formulario.precio_venta_sugerido),

                foto_url: fotoSubida.foto_url,
                foto_path: fotoSubida.foto_path
            };

            const respuesta = await registrarEntradaInventario(datosEnviar);

            mostrarMensaje('success', respuesta.mensaje || 'Producto registrado correctamente.');

            limpiarFormulario();
            await cargarInventario();

        } catch (error) {
            console.error('Error al registrar inventario:', error);
            mostrarMensaje('danger', error.message || 'No se pudo registrar el producto.');

        } finally {
            setGuardando(false);
        }
    }

    function abrirSelectorFoto(idInventario) {
        setIdInventarioFoto(idInventario);

        if (inputFotoActualizarRef.current) {
            inputFotoActualizarRef.current.value = '';
            inputFotoActualizarRef.current.click();
        }
    }

    async function handleActualizarFoto(event) {
        try {
            const archivo = event.target.files[0];

            if (!archivo || !idInventarioFoto) {
                return;
            }

            setAccionando(true);
            setMensaje('');

            const fotoSubida = await subirFotoProducto(archivo);

            const respuesta = await actualizarFotoInventario(idInventarioFoto, {
                foto_url: fotoSubida.foto_url,
                foto_path: fotoSubida.foto_path
            });

            mostrarMensaje('success', respuesta.mensaje || 'Foto actualizada correctamente.');

            setIdInventarioFoto(null);
            await cargarInventario();

        } catch (error) {
            console.error('Error al actualizar foto:', error);
            mostrarMensaje('danger', error.message || 'No se pudo actualizar la foto.');

        } finally {
            setAccionando(false);
        }
    }

    async function handleCambiarPuesto(item) {
        try {
            const idInventario = item.id_inventario_puesto;
            const idPuestoNuevo = puestosSeleccionados[idInventario];

            if (!idPuestoNuevo) {
                mostrarMensaje('danger', 'Selecciona un puesto válido.');
                return;
            }

            if (idPuestoNuevo === item.id_puesto) {
                mostrarMensaje('danger', 'El producto ya está en ese puesto.');
                return;
            }

            const puestoNuevo = puestos.find((puesto) => puesto.id_puesto === idPuestoNuevo);

            const confirmar = confirm(
                `¿Seguro que deseas mover "${item.producto}" al puesto "${puestoNuevo?.nombre || 'seleccionado'}"?`
            );

            if (!confirmar) {
                return;
            }

            setAccionando(true);
            setMensaje('');

            const respuesta = await cambiarPuestoInventario(idInventario, {
                id_puesto_nuevo: idPuestoNuevo,
                motivo: `Cambio automático de puesto a ${puestoNuevo?.nombre || 'nuevo puesto'}`
            });

            mostrarMensaje('success', respuesta.mensaje || 'Puesto actualizado correctamente.');

            await cargarInventario();

        } catch (error) {
            console.error('Error al cambiar puesto:', error);
            mostrarMensaje('danger', error.message || 'No se pudo cambiar el puesto.');

        } finally {
            setAccionando(false);
        }
    }

    async function handleResurtir(item) {
        try {
            const cantidad = prompt(`¿Cuántas piezas quieres resurtir de "${item.producto}"?`);

            if (!cantidad || Number(cantidad) <= 0) {
                mostrarMensaje('danger', 'Ingresa una cantidad válida para resurtir.');
                return;
            }

            const costo = prompt(
                `Costo unitario para "${item.producto}":`,
                Number(item.costo_unitario || 0)
            );

            if (costo === null || costo === '' || Number(costo) < 0) {
                mostrarMensaje('danger', 'Ingresa un costo válido.');
                return;
            }

            const precio = prompt(
                `Precio de venta para "${item.producto}":`,
                Number(item.precio_venta_sugerido || 0)
            );

            if (precio === null || precio === '' || Number(precio) < 0) {
                mostrarMensaje('danger', 'Ingresa un precio válido.');
                return;
            }

            const confirmar = confirm(
                `¿Confirmas resurtir "${item.producto}"?\n\nCantidad: ${cantidad}\nCosto unitario: ${formatoMoneda(costo)}\nPrecio venta: ${formatoMoneda(precio)}`
            );

            if (!confirmar) {
                return;
            }

            setAccionando(true);
            setMensaje('');

            const respuesta = await resurtirInventario(item.id_inventario_puesto, {
                cantidad: Number(cantidad),
                costo_unitario: Number(costo),
                precio_venta_sugerido: Number(precio)
            });

            mostrarMensaje('success', respuesta.mensaje || 'Inventario resurtido correctamente.');

            await cargarInventario();

        } catch (error) {
            console.error('Error al resurtir inventario:', error);
            mostrarMensaje('danger', error.message || 'No se pudo resurtir el inventario.');

        } finally {
            setAccionando(false);
        }
    }

    async function handleCambiarCosto(item) {
        try {
            const costoActual = Number(item.costo_unitario || 0);

            const costoNuevo = prompt(
                `Nuevo costo unitario para "${item.producto}":`,
                costoActual
            );

            if (costoNuevo === null) {
                return;
            }

            if (costoNuevo === '' || Number(costoNuevo) < 0) {
                mostrarMensaje('danger', 'Ingresa un costo unitario válido.');
                return;
            }

            const confirmar = confirm(
                `¿Confirmas cambiar el costo unitario de "${item.producto}"?\n\nCosto anterior: ${formatoMoneda(costoActual)}\nCosto nuevo: ${formatoMoneda(costoNuevo)}`
            );

            if (!confirmar) {
                return;
            }

            setAccionando(true);
            setMensaje('');

            const respuesta = await cambiarCostoUnitarioInventario(item.id_inventario_puesto, {
                costo_unitario: Number(costoNuevo)
            });

            mostrarMensaje('success', respuesta.mensaje || 'Costo actualizado correctamente.');

            await cargarInventario();

        } catch (error) {
            console.error('Error al cambiar costo unitario:', error);
            mostrarMensaje('danger', error.message || 'No se pudo cambiar el costo unitario.');

        } finally {
            setAccionando(false);
        }
    }

    async function handleCambiarPrecio(item) {
        try {
            const precioActual = Number(item.precio_venta_sugerido || 0);

            const precioNuevo = prompt(
                `Nuevo precio de venta para "${item.producto}":`,
                precioActual
            );

            if (precioNuevo === null) {
                return;
            }

            if (precioNuevo === '' || Number(precioNuevo) < 0) {
                mostrarMensaje('danger', 'Ingresa un precio de venta válido.');
                return;
            }

            const confirmar = confirm(
                `¿Confirmas cambiar el precio de venta de "${item.producto}"?\n\nPrecio anterior: ${formatoMoneda(precioActual)}\nPrecio nuevo: ${formatoMoneda(precioNuevo)}`
            );

            if (!confirmar) {
                return;
            }

            setAccionando(true);
            setMensaje('');

            const respuesta = await cambiarPrecioVentaInventario(item.id_inventario_puesto, {
                precio_venta_sugerido: Number(precioNuevo)
            });

            mostrarMensaje('success', respuesta.mensaje || 'Precio actualizado correctamente.');

            await cargarInventario();

        } catch (error) {
            console.error('Error al cambiar precio de venta:', error);
            mostrarMensaje('danger', error.message || 'No se pudo cambiar el precio de venta.');

        } finally {
            setAccionando(false);
        }
    }

    async function handleEliminar(item) {
        try {
            const confirmar = confirm(
                `¿Seguro que deseas eliminar "${item.producto}" del inventario?\n\nEsta acción quedará registrada.`
            );

            if (!confirmar) {
                return;
            }

            const motivo = prompt('Escribe el motivo de eliminación:');

            if (!motivo || !motivo.trim()) {
                mostrarMensaje('danger', 'El motivo es obligatorio para eliminar inventario.');
                return;
            }

            setAccionando(true);
            setMensaje('');

            const respuesta = await eliminarInventario(item.id_inventario_puesto, motivo.trim());

            mostrarMensaje('success', respuesta.mensaje || 'Inventario eliminado correctamente.');

            await cargarInventario();

        } catch (error) {
            console.error('Error al eliminar inventario:', error);
            mostrarMensaje('danger', error.message || 'No se pudo eliminar el inventario.');

        } finally {
            setAccionando(false);
        }
    }

    function handlePuestoSeleccionado(idInventario, idPuesto) {
        setPuestosSeleccionados((prev) => ({
            ...prev,
            [idInventario]: idPuesto
        }));
    }

    function formatoMoneda(valor) {
        return Number(valor || 0).toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });
    }

    function calcularGanancia(item) {
        const precio = Number(item.precio_venta_sugerido || 0);
        const costo = Number(item.costo_unitario || 0);

        return precio - costo;
    }

    return (
        <section>
            <input
                ref={inputFotoActualizarRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleActualizarFoto}
            />

            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Inventario</h1>
                    <p className="mt-2 text-slate-400">
                        Registro y consulta general de productos de JuguetesFun.
                    </p>
                </div>

                <button
                    onClick={cargarDatosIniciales}
                    disabled={accionando}
                    className="rounded-xl border border-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-60"
                >
                    Recargar inventario
                </button>
            </div>

            {mensaje && (
                <div
                    className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${tipoMensaje === 'success'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-red-500 bg-red-500/10 text-red-300'
                        }`}
                >
                    {mensaje}
                </div>
            )}

            {accionando && (
                <div className="mb-6 rounded-2xl border border-sky-500 bg-sky-500/10 px-5 py-4 text-sm text-sky-300">
                    Procesando acción...
                </div>
            )}

            <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-5 text-xl font-bold text-white">Registrar producto</h2>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Propietario</label>
                        <select
                            name="id_propietario"
                            value={formulario.id_propietario}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        >
                            <option value="">Selecciona propietario</option>
                            {propietarios.map((item) => (
                                <option key={item.id_propietario} value={item.id_propietario}>
                                    {item.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Puesto</label>
                        <select
                            name="id_puesto"
                            value={formulario.id_puesto}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        >
                            <option value="">Selecciona puesto</option>
                            {puestos.map((item) => (
                                <option key={item.id_puesto} value={item.id_puesto}>
                                    {item.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Categoría</label>
                        <select
                            name="id_categoria"
                            value={formulario.id_categoria}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        >
                            <option value="">Selecciona categoría</option>
                            {categorias.map((item) => (
                                <option key={item.id_categoria} value={item.id_categoria}>
                                    {item.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Producto</label>
                        <input
                            type="text"
                            name="nombre_producto"
                            value={formulario.nombre_producto}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Ej. Balón, muñeca, carrito..."
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Nombre de compra</label>
                        <input
                            type="text"
                            name="nombre_compra"
                            value={formulario.nombre_compra}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Ej. Compra diciembre"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Fecha de compra</label>
                        <input
                            type="date"
                            name="fecha_compra"
                            value={formulario.fecha_compra}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Cantidad</label>
                        <input
                            type="number"
                            min="1"
                            name="cantidad"
                            value={formulario.cantidad}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Costo unitario</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="costo_unitario"
                            value={formulario.costo_unitario}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Precio de venta</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="precio_venta_sugerido"
                            value={formulario.precio_venta_sugerido}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="0.00"
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <label className="mb-2 block text-sm text-slate-300">Descripción</label>
                        <textarea
                            name="descripcion"
                            value={formulario.descripcion}
                            onChange={handleChange}
                            className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                            placeholder="Descripción opcional del producto"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Foto del producto</label>
                        <input
                            id="fotoProductoReact"
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleFotoChange}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-semibold file:text-slate-950"
                        />

                        <div className="mt-3">
                            {previewFoto ? (
                                <img
                                    src={previewFoto}
                                    alt="Vista previa"
                                    className="h-32 w-full rounded-xl border border-slate-700 object-contain"
                                />
                            ) : (
                                <div className="grid h-32 place-items-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
                                    Sin foto seleccionada
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:col-span-3">
                        <button
                            type="submit"
                            disabled={guardando || accionando}
                            className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                            {guardando ? 'Guardando...' : 'Registrar producto'}
                        </button>

                    </div>
                </form>
            </div>

            {cargando ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
                    Cargando inventario...
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1500px] text-left text-sm">
                            <thead className="bg-slate-950 text-slate-300">
                                <tr>
                                    <th className="px-5 py-4">Foto</th>
                                    <th className="px-5 py-4">Producto</th>
                                    <th className="px-5 py-4">Propietario</th>
                                    <th className="px-5 py-4">Puesto</th>
                                    <th className="px-5 py-4">Compra</th>
                                    <th className="px-5 py-4">Disponible</th>
                                    <th className="px-5 py-4">Costo</th>
                                    <th className="px-5 py-4">Venta</th>
                                    <th className="px-5 py-4">Ganancia</th>
                                    <th className="px-5 py-4">Estado</th>
                                    <th className="px-5 py-4">Acciones</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-800">
                                {inventario.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" className="px-5 py-10 text-center text-slate-400">
                                            No hay productos registrados en inventario.
                                        </td>
                                    </tr>
                                ) : (
                                    inventario.map((item) => (
                                        <tr
                                            key={item.id_inventario_puesto}
                                            className="text-slate-300 transition hover:bg-slate-800/60"
                                        >
                                            <td className="px-5 py-4">
                                                {item.foto_url ? (
                                                    <img
                                                        src={item.foto_url}
                                                        alt={item.producto}
                                                        className="h-16 w-16 rounded-xl border border-slate-700 object-cover"
                                                    />
                                                ) : (
                                                    <div className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-slate-700 text-center text-[11px] text-slate-500">
                                                        Sin foto
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-white">
                                                    {item.producto || 'Sin producto'}
                                                </p>
                                                <p className="mt-1 max-w-xs text-xs text-slate-500">
                                                    {item.descripcion || 'Sin descripción'}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                {item.propietario || 'Sin propietario'}
                                            </td>

                                            <td className="px-5 py-4">
                                                {item.puesto || 'Sin puesto'}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p>{item.compra || 'Sin compra'}</p>
                                                <p className="text-xs text-slate-500">
                                                    {item.fecha_compra || ''}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-400">
                                                    {item.cantidad_disponible || 0}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                {formatoMoneda(item.costo_unitario)}
                                            </td>

                                            <td className="px-5 py-4">
                                                {formatoMoneda(item.precio_venta_sugerido)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="font-bold text-emerald-400">
                                                    {formatoMoneda(calcularGanancia(item))}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                                                    {item.estado || 'activo'}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex min-w-[360px] flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={accionando}
                                                        onClick={() => abrirSelectorFoto(item.id_inventario_puesto)}
                                                        className="rounded-lg border border-sky-500 px-3 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-500 hover:text-white disabled:opacity-60"
                                                    >
                                                        Foto
                                                    </button>

                                                    <select
                                                        value={puestosSeleccionados[item.id_inventario_puesto] || ''}
                                                        onChange={(event) =>
                                                            handlePuestoSeleccionado(
                                                                item.id_inventario_puesto,
                                                                event.target.value
                                                            )
                                                        }
                                                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                                                    >
                                                        <option value="">Puesto</option>
                                                        {puestos.map((puesto) => (
                                                            <option key={puesto.id_puesto} value={puesto.id_puesto}>
                                                                {puesto.nombre}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <button
                                                        type="button"
                                                        disabled={accionando}
                                                        onClick={() => handleCambiarPuesto(item)}
                                                        className="rounded-lg border border-yellow-500 px-3 py-2 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500 hover:text-slate-950 disabled:opacity-60"
                                                    >
                                                        Cambiar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={accionando}
                                                        onClick={() => handleResurtir(item)}
                                                        className="rounded-lg border border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-60"
                                                    >
                                                        Resurtir
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={accionando}
                                                        onClick={() => handleCambiarPrecio(item)}
                                                        className="rounded-lg border border-purple-500 px-3 py-2 text-xs font-semibold text-purple-300 transition hover:bg-purple-500 hover:text-white disabled:opacity-60"
                                                    >
                                                        Precio
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={accionando}
                                                        onClick={() => handleCambiarCosto(item)}
                                                        className="rounded-lg border border-orange-500 px-3 py-2 text-xs font-semibold text-orange-300 transition hover:bg-orange-500 hover:text-slate-950 disabled:opacity-60"
                                                    >
                                                        Costo
                                                    </button>

                                                    {perfil?.es_admin_principal && (
                                                        <button
                                                            type="button"
                                                            disabled={accionando}
                                                            onClick={() => handleEliminar(item)}
                                                            className="rounded-lg border border-red-500 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-60"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}
export default Inventario;
