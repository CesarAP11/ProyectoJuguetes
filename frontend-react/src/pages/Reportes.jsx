import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { obtenerResumenReportes } from '../api/reportes.api';

function fechaHoy() {
    const fecha = new Date();
    return fecha.toISOString().split('T')[0];
}

function fechaHaceDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha.toISOString().split('T')[0];
}

function textoPdf(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '');
}

function nombreArchivoReporte(fechaInicio, fechaFin) {
    const inicio = fechaInicio || 'inicio';
    const fin = fechaFin || 'fin';

    return `JuguetesFun-Reporte-${inicio}-a-${fin}.pdf`;
}

async function convertirImagenADataUrl(url) {
    if (!url) {
        return '';
    }

    try {
        const respuesta = await fetch(url, {
            mode: 'cors',
            cache: 'force-cache'
        });

        if (!respuesta.ok) {
            throw new Error(`No se pudo descargar la imagen: ${respuesta.status}`);
        }

        const blob = await respuesta.blob();
        const urlTemporal = URL.createObjectURL(blob);

        try {
            const imagen = await new Promise((resolve, reject) => {
                const elemento = new Image();

                elemento.onload = () => resolve(elemento);
                elemento.onerror = () => reject(
                    new Error('No se pudo procesar la imagen del producto.')
                );
                elemento.src = urlTemporal;
            });

            const maximo = 360;
            const escala = Math.min(
                1,
                maximo / Math.max(imagen.naturalWidth, imagen.naturalHeight)
            );

            const ancho = Math.max(
                1,
                Math.round(imagen.naturalWidth * escala)
            );
            const alto = Math.max(
                1,
                Math.round(imagen.naturalHeight * escala)
            );

            const canvas = document.createElement('canvas');
            canvas.width = ancho;
            canvas.height = alto;

            const contexto = canvas.getContext('2d');

            if (!contexto) {
                throw new Error('No se pudo preparar la imagen para el PDF.');
            }

            contexto.fillStyle = '#ffffff';
            contexto.fillRect(0, 0, ancho, alto);
            contexto.drawImage(imagen, 0, 0, ancho, alto);

            return canvas.toDataURL('image/jpeg', 0.86);
        } finally {
            URL.revokeObjectURL(urlTemporal);
        }
    } catch (error) {
        console.warn('No se pudo incluir una imagen en el PDF:', error);
        return '';
    }
}

function Reportes() {
    const [fechaInicio, setFechaInicio] = useState(fechaHaceDias(7));
    const [fechaFin, setFechaFin] = useState(fechaHoy());

    const [resumen, setResumen] = useState(null);
    const [porPuesto, setPorPuesto] = useState([]);
    const [porPropietario, setPorPropietario] = useState([]);
    const [porVendedor, setPorVendedor] = useState([]);
    const [porMetodoPago, setPorMetodoPago] = useState([]);
    const [productosTop, setProductosTop] = useState([]);
    const [detalleVentas, setDetalleVentas] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [generandoPdf, setGenerandoPdf] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('success');

    useEffect(() => {
        cargarReportes();
    }, []);

    async function cargarReportes() {
        try {
            setCargando(true);
            setMensaje('');

            if (!fechaInicio) {
                mostrarMensaje('danger', 'Selecciona la fecha inicial.');
                return;
            }

            if (!fechaFin) {
                mostrarMensaje('danger', 'Selecciona la fecha final.');
                return;
            }

            if (fechaFin < fechaInicio) {
                mostrarMensaje('danger', 'La fecha final no puede ser menor a la fecha inicial.');
                return;
            }

            const data = await obtenerResumenReportes({
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            });

            setResumen(data.resumen || null);
            setPorPuesto(data.porPuesto || []);
            setPorPropietario(data.porPropietario || []);
            setPorVendedor(data.porVendedor || []);
            setPorMetodoPago(data.porMetodoPago || []);
            setProductosTop(data.productosTop || []);
            setDetalleVentas(data.detalleVentas || []);

        } catch (error) {
            console.error('Error al cargar reportes:', error);
            mostrarMensaje('danger', error.message || 'No se pudieron cargar los reportes.');

        } finally {
            setCargando(false);
        }
    }

    function mostrarMensaje(tipo, texto) {
        setTipoMensaje(tipo);
        setMensaje(texto);
    }

    function formatoMoneda(valor) {
        return Number(valor || 0).toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });
    }

    function formatoNumero(valor) {
        return Number(valor || 0).toLocaleString('es-MX');
    }

    function formatoFechaHora(fecha) {
        if (!fecha) {
            return '-';
        }

        return new Date(fecha).toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function obtenerValor(item, campos, valorDefault = 0) {
        for (const campo of campos) {
            if (item[campo] !== undefined && item[campo] !== null) {
                return item[campo];
            }
        }

        return valorDefault;
    }

    async function descargarReportePdf() {
        if (cargando || generandoPdf) {
            return;
        }

        if (!resumen) {
            mostrarMensaje(
                'danger',
                'Primero consulta un rango de fechas para generar el PDF.'
            );
            return;
        }

        try {
            setGenerandoPdf(true);
            setMensaje('');

            const documento = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const anchoPagina = documento.internal.pageSize.getWidth();
            const altoPagina = documento.internal.pageSize.getHeight();
            const margen = 12;
            const periodo = `${fechaInicio} al ${fechaFin}`;
            const fechaGeneracion = new Date().toLocaleString('es-MX');
            const cacheImagenes = new Map();

            async function obtenerImagen(url) {
                if (!url) {
                    return '';
                }

                if (cacheImagenes.has(url)) {
                    return cacheImagenes.get(url);
                }

                const dataUrl = await convertirImagenADataUrl(url);
                cacheImagenes.set(url, dataUrl);
                return dataUrl;
            }

            function dibujarCabecera(tituloSeccion = '') {
                documento.setFillColor(15, 23, 42);
                documento.rect(0, 0, anchoPagina, 18, 'F');

                documento.setTextColor(16, 185, 129);
                documento.setFont('helvetica', 'bold');
                documento.setFontSize(15);
                documento.text('JuguetesFun', margen, 11.5);

                documento.setTextColor(255, 255, 255);
                documento.setFont('helvetica', 'normal');
                documento.setFontSize(9);
                documento.text(
                    `Reporte de ventas | ${periodo}`,
                    anchoPagina - margen,
                    8,
                    { align: 'right' }
                );

                if (tituloSeccion) {
                    documento.setFont('helvetica', 'bold');
                    documento.setFontSize(11);
                    documento.text(
                        textoPdf(tituloSeccion),
                        anchoPagina - margen,
                        13.5,
                        { align: 'right' }
                    );
                }
            }

            function agregarPaginaSeccion(titulo) {
                documento.addPage('a4', 'landscape');
                dibujarCabecera(titulo);

                documento.setTextColor(15, 23, 42);
                documento.setFont('helvetica', 'bold');
                documento.setFontSize(16);
                documento.text(textoPdf(titulo), margen, 29);
            }

            function tablaSeccion({
                titulo,
                columnas,
                filas,
                columnStyles = {},
                styles = {},
                didDrawCell
            }) {
                agregarPaginaSeccion(titulo);

                autoTable(documento, {
                    startY: 34,
                    head: [columnas.map((columna) => textoPdf(columna))],
                    body: filas,
                    theme: 'grid',
                    margin: {
                        left: margen,
                        right: margen,
                        top: 24,
                        bottom: 16
                    },
                    headStyles: {
                        fillColor: [15, 23, 42],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        fontSize: 8.5,
                        halign: 'left',
                        valign: 'middle'
                    },
                    bodyStyles: {
                        textColor: [30, 41, 59],
                        fontSize: 8,
                        valign: 'middle'
                    },
                    alternateRowStyles: {
                        fillColor: [248, 250, 252]
                    },
                    styles: {
                        cellPadding: 2.2,
                        lineColor: [203, 213, 225],
                        lineWidth: 0.15,
                        overflow: 'linebreak',
                        ...styles
                    },
                    columnStyles,
                    didDrawCell
                });
            }

            // Página 1: portada y resumen general
            dibujarCabecera('Resumen general');

            documento.setTextColor(15, 23, 42);
            documento.setFont('helvetica', 'bold');
            documento.setFontSize(24);
            documento.text('Reporte general de ventas', margen, 35);

            documento.setFont('helvetica', 'normal');
            documento.setFontSize(10);
            documento.setTextColor(71, 85, 105);
            documento.text(
                `Periodo consultado: ${periodo}`,
                margen,
                43
            );
            documento.text(
                `Generado: ${fechaGeneracion}`,
                margen,
                49
            );

            const tarjetas = [
                {
                    titulo: 'Ventas registradas',
                    valor: formatoNumero(
                        resumen?.total_ventas || resumen?.ventas || 0
                    ),
                    subtitulo: 'Total de operaciones'
                },
                {
                    titulo: 'Total vendido',
                    valor: formatoMoneda(
                        resumen?.monto_total ||
                        resumen?.total_vendido ||
                        0
                    ),
                    subtitulo: 'Ingresos por venta'
                },
                {
                    titulo: 'Costo total',
                    valor: formatoMoneda(resumen?.costo_total || 0),
                    subtitulo: 'Costo de mercancia'
                },
                {
                    titulo: 'Ganancia estimada',
                    valor: formatoMoneda(
                        resumen?.ganancia_total ||
                        resumen?.ganancia ||
                        0
                    ),
                    subtitulo: 'Venta menos costo'
                }
            ];

            const separacionTarjeta = 6;
            const anchoTarjeta =
                (anchoPagina - margen * 2 - separacionTarjeta * 3) / 4;
            const yTarjeta = 62;

            tarjetas.forEach((tarjeta, index) => {
                const x =
                    margen +
                    index * (anchoTarjeta + separacionTarjeta);

                documento.setFillColor(248, 250, 252);
                documento.setDrawColor(203, 213, 225);
                documento.setLineWidth(0.25);
                documento.roundedRect(
                    x,
                    yTarjeta,
                    anchoTarjeta,
                    38,
                    3,
                    3,
                    'FD'
                );

                documento.setTextColor(71, 85, 105);
                documento.setFont('helvetica', 'bold');
                documento.setFontSize(9);
                documento.text(
                    textoPdf(tarjeta.titulo),
                    x + 5,
                    yTarjeta + 9
                );

                documento.setTextColor(5, 150, 105);
                documento.setFont('helvetica', 'bold');
                documento.setFontSize(15);
                documento.text(
                    textoPdf(tarjeta.valor),
                    x + 5,
                    yTarjeta + 21
                );

                documento.setTextColor(100, 116, 139);
                documento.setFont('helvetica', 'normal');
                documento.setFontSize(7.5);
                documento.text(
                    textoPdf(tarjeta.subtitulo),
                    x + 5,
                    yTarjeta + 30
                );
            });

            documento.setTextColor(15, 23, 42);
            documento.setFont('helvetica', 'bold');
            documento.setFontSize(13);
            documento.text('Contenido del reporte', margen, 119);

            documento.setFont('helvetica', 'normal');
            documento.setFontSize(9);
            documento.setTextColor(71, 85, 105);

            const apartados = [
                'Ventas por puesto',
                'Ganancia por propietario',
                'Ventas por vendedor',
                'Metodos de pago',
                'Productos mas vendidos con fotografias',
                'Detalle de juguetes vendidos con fotografias'
            ];

            apartados.forEach((apartado, index) => {
                documento.text(
                    `• ${textoPdf(apartado)}`,
                    margen + 4,
                    130 + index * 8
                );
            });

            // Ventas por puesto
            tablaSeccion({
                titulo: 'Ventas por puesto',
                columnas: ['Puesto', 'Ventas', 'Total', 'Ganancia'],
                filas: porPuesto.length > 0
                    ? porPuesto.map((item) => [
                        textoPdf(
                            item.puesto ||
                            item.nombre_puesto ||
                            'Sin puesto'
                        ),
                        formatoNumero(
                            obtenerValor(
                                item,
                                ['ventas', 'total_ventas', 'cantidad_ventas']
                            )
                        ),
                        textoPdf(
                            formatoMoneda(
                                obtenerValor(
                                    item,
                                    ['total', 'monto_total', 'total_vendido']
                                )
                            )
                        ),
                        textoPdf(
                            formatoMoneda(
                                obtenerValor(
                                    item,
                                    ['ganancia', 'ganancia_total']
                                )
                            )
                        )
                    ])
                    : [['Sin informacion', '-', '-', '-']],
                columnStyles: {
                    0: { cellWidth: 120 },
                    1: { halign: 'center' },
                    2: { halign: 'right' },
                    3: { halign: 'right' }
                }
            });

            // Ganancia por propietario
            tablaSeccion({
                titulo: 'Ganancia por propietario',
                columnas: [
                    'Propietario',
                    'Piezas',
                    'Total',
                    'Ganancia'
                ],
                filas: porPropietario.length > 0
                    ? porPropietario.map((item) => [
                        textoPdf(
                            item.propietario ||
                            item.nombre_propietario ||
                            'Sin propietario'
                        ),
                        formatoNumero(
                            obtenerValor(
                                item,
                                ['piezas', 'cantidad', 'cantidad_vendida']
                            )
                        ),
                        textoPdf(
                            formatoMoneda(
                                obtenerValor(
                                    item,
                                    ['total', 'monto_total', 'total_vendido']
                                )
                            )
                        ),
                        textoPdf(
                            formatoMoneda(
                                obtenerValor(
                                    item,
                                    ['ganancia', 'ganancia_total']
                                )
                            )
                        )
                    ])
                    : [['Sin informacion', '-', '-', '-']],
                columnStyles: {
                    0: { cellWidth: 120 },
                    1: { halign: 'center' },
                    2: { halign: 'right' },
                    3: { halign: 'right' }
                }
            });

            // Ventas por vendedor
            tablaSeccion({
                titulo: 'Ventas por vendedor',
                columnas: [
                    'Vendedor',
                    'Ventas',
                    'Total',
                    'Ganancia'
                ],
                filas: porVendedor.length > 0
                    ? porVendedor.map((item) => [
                        textoPdf(
                            item.vendedor ||
                            item.nombre_vendedor ||
                            'Sin vendedor'
                        ),
                        formatoNumero(
                            obtenerValor(
                                item,
                                ['ventas', 'total_ventas', 'cantidad_ventas']
                            )
                        ),
                        textoPdf(
                            formatoMoneda(
                                obtenerValor(
                                    item,
                                    ['total', 'monto_total', 'total_vendido']
                                )
                            )
                        ),
                        textoPdf(
                            formatoMoneda(
                                obtenerValor(
                                    item,
                                    ['ganancia', 'ganancia_total']
                                )
                            )
                        )
                    ])
                    : [['Sin informacion', '-', '-', '-']],
                columnStyles: {
                    0: { cellWidth: 120 },
                    1: { halign: 'center' },
                    2: { halign: 'right' },
                    3: { halign: 'right' }
                }
            });

            // Métodos de pago
            tablaSeccion({
                titulo: 'Metodos de pago',
                columnas: ['Metodo', 'Pagos', 'Total'],
                filas: porMetodoPago.length > 0
                    ? porMetodoPago.map((item) => [
                        textoPdf(
                            item.metodo_pago ||
                            item.metodo ||
                            item.nombre ||
                            'Sin metodo'
                        ),
                        formatoNumero(
                            obtenerValor(
                                item,
                                ['pagos', 'cantidad_pagos', 'total_pagos']
                            )
                        ),
                        textoPdf(
                            formatoMoneda(
                                obtenerValor(
                                    item,
                                    ['total', 'monto_total', 'total_pagado']
                                )
                            )
                        )
                    ])
                    : [['Sin informacion', '-', '-']],
                columnStyles: {
                    0: { cellWidth: 150 },
                    1: { halign: 'center' },
                    2: { halign: 'right' }
                }
            });

            // Preparamos las imágenes de productos más vendidos.
            const productosConImagen = await Promise.all(
                productosTop.map(async (item) => ({
                    ...item,
                    imagenPdf: await obtenerImagen(item.foto_url)
                }))
            );

            tablaSeccion({
                titulo: 'Productos mas vendidos',
                columnas: [
                    'Foto',
                    'Producto',
                    'Categoria',
                    'Propietario',
                    'Piezas',
                    'Total vendido',
                    'Ganancia'
                ],
                filas: productosConImagen.length > 0
                    ? productosConImagen.map((item) => [
                        item.imagenPdf ? '' : 'Sin foto',
                        textoPdf(item.producto || 'Sin producto'),
                        textoPdf(item.categoria || 'Sin categoria'),
                        textoPdf(
                            item.propietario || 'Sin propietario'
                        ),
                        formatoNumero(
                            obtenerValor(
                                item,
                                ['piezas', 'cantidad_vendida', 'cantidad']
                            )
                        ),
                        textoPdf(
                            formatoMoneda(
                                obtenerValor(
                                    item,
                                    ['total', 'total_vendido', 'monto_total']
                                )
                            )
                        ),
                        textoPdf(
                            formatoMoneda(
                                obtenerValor(
                                    item,
                                    ['ganancia', 'ganancia_total']
                                )
                            )
                        )
                    ])
                    : [[
                        'Sin foto',
                        'Sin informacion',
                        '-',
                        '-',
                        '-',
                        '-',
                        '-'
                    ]],
                styles: {
                    minCellHeight: 18,
                    fontSize: 7.2
                },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center' },
                    1: { cellWidth: 55 },
                    2: { cellWidth: 38 },
                    3: { cellWidth: 58 },
                    4: { cellWidth: 18, halign: 'center' },
                    5: { cellWidth: 35, halign: 'right' },
                    6: { cellWidth: 35, halign: 'right' }
                },
                didDrawCell: (data) => {
                    if (
                        data.section !== 'body' ||
                        data.column.index !== 0
                    ) {
                        return;
                    }

                    const item = productosConImagen[data.row.index];

                    if (!item?.imagenPdf) {
                        return;
                    }

                    documento.addImage(
                        item.imagenPdf,
                        'JPEG',
                        data.cell.x + 2,
                        data.cell.y + 2,
                        14,
                        14,
                        undefined,
                        'FAST'
                    );
                }
            });

            // Preparamos las imágenes del detalle.
            const detalleConImagen = await Promise.all(
                detalleVentas.map(async (item) => ({
                    ...item,
                    imagenPdf: await obtenerImagen(item.foto_url)
                }))
            );

            tablaSeccion({
                titulo: 'Detalle de juguetes vendidos',
                columnas: [
                    'Foto',
                    'Producto y descripcion',
                    'Propietario',
                    'Vendedor',
                    'Puesto',
                    'Categoria',
                    'Fecha y hora',
                    'Cantidad'
                ],
                filas: detalleConImagen.length > 0
                    ? detalleConImagen.map((item) => [
                        item.imagenPdf ? '' : 'Sin foto',
                        textoPdf(
                            `${item.producto || 'Sin producto'}\n${item.descripcion || 'Sin descripcion'
                            }`
                        ),
                        textoPdf(
                            item.propietario || 'Sin propietario'
                        ),
                        textoPdf(item.vendedor || 'Sin vendedor'),
                        textoPdf(item.puesto || 'Sin puesto'),
                        textoPdf(item.categoria || 'Sin categoria'),
                        textoPdf(formatoFechaHora(item.fecha_venta)),
                        formatoNumero(
                            item.cantidad_vendida ||
                            item.cantidad ||
                            0
                        )
                    ])
                    : [[
                        'Sin foto',
                        'Sin informacion',
                        '-',
                        '-',
                        '-',
                        '-',
                        '-',
                        '-'
                    ]],
                styles: {
                    minCellHeight: 20,
                    fontSize: 6.6,
                    cellPadding: 1.7
                },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center' },
                    1: { cellWidth: 54 },
                    2: { cellWidth: 42 },
                    3: { cellWidth: 48 },
                    4: { cellWidth: 40 },
                    5: { cellWidth: 29 },
                    6: { cellWidth: 34 },
                    7: { cellWidth: 18, halign: 'center' }
                },
                didDrawCell: (data) => {
                    if (
                        data.section !== 'body' ||
                        data.column.index !== 0
                    ) {
                        return;
                    }

                    const item = detalleConImagen[data.row.index];

                    if (!item?.imagenPdf) {
                        return;
                    }

                    documento.addImage(
                        item.imagenPdf,
                        'JPEG',
                        data.cell.x + 2,
                        data.cell.y + 2,
                        15,
                        15,
                        undefined,
                        'FAST'
                    );
                }
            });

            // Pie de página en todas las páginas.
            const totalPaginas = documento.getNumberOfPages();

            for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
                documento.setPage(pagina);

                documento.setDrawColor(203, 213, 225);
                documento.setLineWidth(0.2);
                documento.line(
                    margen,
                    altoPagina - 11,
                    anchoPagina - margen,
                    altoPagina - 11
                );

                documento.setTextColor(100, 116, 139);
                documento.setFont('helvetica', 'normal');
                documento.setFontSize(7.5);
                documento.text(
                    `JuguetesFun | Periodo ${periodo}`,
                    margen,
                    altoPagina - 6
                );
                documento.text(
                    `Pagina ${pagina} de ${totalPaginas}`,
                    anchoPagina - margen,
                    altoPagina - 6,
                    { align: 'right' }
                );
            }

            documento.save(
                nombreArchivoReporte(fechaInicio, fechaFin)
            );

            mostrarMensaje(
                'success',
                'El reporte PDF se generó y descargó correctamente.'
            );
        } catch (errorPdf) {
            console.error('Error al generar el PDF de reportes:', errorPdf);
            mostrarMensaje(
                'danger',
                'No se pudo generar el PDF. Revisa las imágenes y vuelve a intentarlo.'
            );
        } finally {
            setGenerandoPdf(false);
        }
    }

    return (
        <section>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Reportes</h1>
                    <p className="mt-2 text-slate-400">
                        Resumen de ventas, ganancias, propietarios, vendedores y productos vendidos.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={descargarReportePdf}
                        disabled={cargando || generandoPdf || !resumen}
                        className="rounded-xl border border-cyan-500 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {generandoPdf
                            ? 'Generando PDF...'
                            : 'Descargar reporte PDF'}
                    </button>

                    <button
                        type="button"
                        onClick={cargarReportes}
                        disabled={cargando || generandoPdf}
                        className="rounded-xl border border-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Actualizar reporte
                    </button>
                </div>
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

            <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-5 text-xl font-bold text-white">Filtros</h2>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Fecha inicial</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(event) => setFechaInicio(event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Fecha final</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(event) => setFechaFin(event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={cargarReportes}
                            disabled={cargando || generandoPdf}
                            className="w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                            {cargando ? 'Consultando...' : 'Consultar'}
                        </button>
                    </div>
                </div>
            </div>

            {cargando ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-300">
                    Cargando reportes...
                </div>
            ) : (
                <>
                    <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <TarjetaResumen
                            titulo="Ventas registradas"
                            valor={formatoNumero(resumen?.total_ventas || resumen?.ventas || 0)}
                            subtitulo="Total de operaciones"
                        />

                        <TarjetaResumen
                            titulo="Total vendido"
                            valor={formatoMoneda(resumen?.monto_total || resumen?.total_vendido || 0)}
                            subtitulo="Ingresos por venta"
                        />

                        <TarjetaResumen
                            titulo="Costo total"
                            valor={formatoMoneda(resumen?.costo_total || 0)}
                            subtitulo="Costo de mercancía"
                        />

                        <TarjetaResumen
                            titulo="Ganancia estimada"
                            valor={formatoMoneda(resumen?.ganancia_total || resumen?.ganancia || 0)}
                            subtitulo="Venta menos costo"
                        />
                    </div>

                    <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
                        <TablaSimple
                            titulo="Ventas por puesto"
                            columnas={['Puesto', 'Ventas', 'Total', 'Ganancia']}
                            datos={porPuesto}
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4 font-semibold text-white">
                                        {item.puesto || item.nombre_puesto || 'Sin puesto'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoNumero(obtenerValor(item, ['ventas', 'total_ventas', 'cantidad_ventas']))}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoMoneda(obtenerValor(item, ['total', 'monto_total', 'total_vendido']))}
                                    </td>
                                    <td className="px-5 py-4 text-emerald-400 font-bold">
                                        {formatoMoneda(obtenerValor(item, ['ganancia', 'ganancia_total']))}
                                    </td>
                                </tr>
                            )}
                        />

                        <TablaSimple
                            titulo="Ganancia por propietario"
                            columnas={['Propietario', 'Piezas', 'Total', 'Ganancia']}
                            datos={porPropietario}
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4 font-semibold text-white">
                                        {item.propietario || item.nombre_propietario || 'Sin propietario'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoNumero(obtenerValor(item, ['piezas', 'cantidad', 'cantidad_vendida']))}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoMoneda(obtenerValor(item, ['total', 'monto_total', 'total_vendido']))}
                                    </td>
                                    <td className="px-5 py-4 text-emerald-400 font-bold">
                                        {formatoMoneda(obtenerValor(item, ['ganancia', 'ganancia_total']))}
                                    </td>
                                </tr>
                            )}
                        />

                        <TablaSimple
                            titulo="Ventas por vendedor"
                            columnas={['Vendedor', 'Ventas', 'Total', 'Ganancia']}
                            datos={porVendedor}
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4 font-semibold text-white">
                                        {item.vendedor || item.nombre_vendedor || 'Sin vendedor'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoNumero(obtenerValor(item, ['ventas', 'total_ventas', 'cantidad_ventas']))}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoMoneda(obtenerValor(item, ['total', 'monto_total', 'total_vendido']))}
                                    </td>
                                    <td className="px-5 py-4 text-emerald-400 font-bold">
                                        {formatoMoneda(obtenerValor(item, ['ganancia', 'ganancia_total']))}
                                    </td>
                                </tr>
                            )}
                        />

                        <TablaSimple
                            titulo="Métodos de pago"
                            columnas={['Método', 'Pagos', 'Total']}
                            datos={porMetodoPago}
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4 font-semibold text-white">
                                        {item.metodo_pago || item.metodo || item.nombre || 'Sin método'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {formatoNumero(obtenerValor(item, ['pagos', 'cantidad_pagos', 'total_pagos']))}
                                    </td>
                                    <td className="px-5 py-4 text-emerald-400 font-bold">
                                        {formatoMoneda(obtenerValor(item, ['total', 'monto_total', 'total_pagado']))}
                                    </td>
                                </tr>
                            )}
                        />
                    </div>

                    <TablaSimple
                        titulo="Productos más vendidos"
                        columnas={['Producto', 'Propietario', 'Piezas', 'Total vendido', 'Ganancia']}
                        datos={productosTop}
                        renderFila={(item, index) => (
                            <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        {item.foto_url ? (
                                            <img
                                                src={item.foto_url}
                                                alt={item.producto}
                                                className="h-14 w-14 rounded-xl border border-slate-700 object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-slate-700 text-[10px] text-slate-500">
                                                Sin foto
                                            </div>
                                        )}

                                        <div>
                                            <p className="font-semibold text-white">
                                                {item.producto || 'Sin producto'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {item.categoria || 'Sin categoría'}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-5 py-4">
                                    {item.propietario || 'Sin propietario'}
                                </td>

                                <td className="px-5 py-4">
                                    {formatoNumero(obtenerValor(item, ['piezas', 'cantidad_vendida', 'cantidad']))}
                                </td>

                                <td className="px-5 py-4">
                                    {formatoMoneda(obtenerValor(item, ['total', 'total_vendido', 'monto_total']))}
                                </td>

                                <td className="px-5 py-4 text-emerald-400 font-bold">
                                    {formatoMoneda(obtenerValor(item, ['ganancia', 'ganancia_total']))}
                                </td>
                            </tr>
                        )}
                    />

                    <div className="mt-8">
                        <TablaSimple
                            titulo="Detalle de juguetes vendidos"
                            columnas={[
                                'Foto',
                                'Producto',
                                'Propietario',
                                'Vendedor',
                                'Puesto',
                                'Categoría',
                                'Fecha y hora',
                                'Cantidad'
                            ]}
                            datos={detalleVentas}
                            minWidth="min-w-[1300px]"
                            renderFila={(item, index) => (
                                <tr key={index} className="text-slate-300 transition hover:bg-slate-800/60">
                                    <td className="px-5 py-4">
                                        {item.foto_url ? (
                                            <img
                                                src={item.foto_url}
                                                alt={item.producto}
                                                className="h-16 w-16 rounded-xl border border-slate-700 object-cover"
                                            />
                                        ) : (
                                            <div className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-slate-700 text-[11px] text-slate-500">
                                                Sin foto
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-5 py-4">
                                        <p className="font-semibold text-white">
                                            {item.producto || 'Sin producto'}
                                        </p>
                                        <p className="max-w-xs text-xs text-slate-500">
                                            {item.descripcion || 'Sin descripción'}
                                        </p>
                                    </td>

                                    <td className="px-5 py-4">
                                        {item.propietario || 'Sin propietario'}
                                    </td>

                                    <td className="px-5 py-4">
                                        {item.vendedor || 'Sin vendedor'}
                                    </td>

                                    <td className="px-5 py-4">
                                        {item.puesto || 'Sin puesto'}
                                    </td>

                                    <td className="px-5 py-4">
                                        {item.categoria || 'Sin categoría'}
                                    </td>

                                    <td className="px-5 py-4">
                                        {formatoFechaHora(item.fecha_venta)}
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-400">
                                            {formatoNumero(item.cantidad_vendida || item.cantidad || 0)}
                                        </span>
                                    </td>
                                </tr>
                            )}
                        />
                    </div>
                </>
            )}
        </section>
    );
}

function TarjetaResumen({ titulo, valor, subtitulo }) {
    return (
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">{titulo}</p>
            <h2 className="mt-2 text-2xl font-bold text-emerald-400">{valor}</h2>
            <p className="mt-2 text-xs text-slate-500">{subtitulo}</p>
        </article>
    );
}

function TablaSimple({ titulo, columnas, datos, renderFila, minWidth = 'min-w-[900px]' }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-6 py-5">
                <h2 className="text-xl font-bold text-white">{titulo}</h2>
            </div>

            <div className="overflow-x-auto">
                <table className={`w-full ${minWidth} text-left text-sm`}>
                    <thead className="bg-slate-950 text-slate-300">
                        <tr>
                            {columnas.map((columna) => (
                                <th key={columna} className="px-5 py-4">
                                    {columna}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                        {datos.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columnas.length}
                                    className="px-5 py-10 text-center text-slate-400"
                                >
                                    Sin información en este rango.
                                </td>
                            </tr>
                        ) : (
                            datos.map((item, index) => renderFila(item, index))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Reportes;