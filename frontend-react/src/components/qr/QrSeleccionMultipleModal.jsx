import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

function escaparHtml(valor) {
    return String(valor ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function obtenerIdItem(item) {
    return item?.id_inventario_puesto || item?.id_lote || item?.codigo_interno;
}

function obtenerCantidadMaxima(item) {
    return Math.min(
        100,
        Math.max(1, Number(item?.cantidad_disponible || 1))
    );
}

function normalizarCantidad(valor, maximo) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return 1;
    }

    return Math.min(maximo, Math.max(1, Math.trunc(numero)));
}


function textoPdfSeguro(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '');
}

function recortarTextoPdf(documento, valor, anchoMaximo) {
    const texto = textoPdfSeguro(valor || 'Producto');

    if (documento.getTextWidth(texto) <= anchoMaximo) {
        return texto;
    }

    let resultado = texto;

    while (
        resultado.length > 1 &&
        documento.getTextWidth(`${resultado}...`) > anchoMaximo
    ) {
        resultado = resultado.slice(0, -1);
    }

    return `${resultado.trimEnd()}...`;
}

function nombreArchivoPdf() {
    const fecha = new Date().toISOString().slice(0, 10);
    return `JuguetesFun-Etiquetas-QR-${fecha}.pdf`;
}

function QrSeleccionMultipleModal({
    abierto,
    items,
    puedeImprimir,
    onCerrar,
    onLimpiarSeleccion
}) {
    const [imagenesQr, setImagenesQr] = useState({});
    const [cantidades, setCantidades] = useState({});
    const [generando, setGenerando] = useState(false);
    const [generandoPdf, setGenerandoPdf] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;

        async function prepararEtiquetas() {
            if (!abierto || !Array.isArray(items) || items.length === 0) {
                setImagenesQr({});
                setCantidades({});
                setError('');
                return;
            }

            try {
                setGenerando(true);
                setError('');

                const cantidadesIniciales = {};
                const paresImagenes = await Promise.all(
                    items.map(async (item) => {
                        const idItem = obtenerIdItem(item);
                        const cantidadMaxima = obtenerCantidadMaxima(item);

                        cantidadesIniciales[idItem] = cantidadMaxima;

                        const dataUrl = await QRCode.toDataURL(
                            item.codigo_interno,
                            {
                                width: 520,
                                margin: 2,
                                errorCorrectionLevel: 'M'
                            }
                        );

                        return [idItem, dataUrl];
                    })
                );

                if (!activo) {
                    return;
                }

                setCantidades(cantidadesIniciales);
                setImagenesQr(Object.fromEntries(paresImagenes));
            } catch (errorGeneracion) {
                console.error(
                    'Error al preparar los códigos QR seleccionados:',
                    errorGeneracion
                );

                if (activo) {
                    setError(
                        'No se pudieron generar todos los códigos QR seleccionados.'
                    );
                }
            } finally {
                if (activo) {
                    setGenerando(false);
                }
            }
        }

        prepararEtiquetas();

        return () => {
            activo = false;
        };
    }, [abierto, items]);

    useEffect(() => {
        function cerrarConEscape(event) {
            if (event.key === 'Escape' && abierto) {
                onCerrar();
            }
        }

        document.addEventListener('keydown', cerrarConEscape);

        return () => {
            document.removeEventListener('keydown', cerrarConEscape);
        };
    }, [abierto, onCerrar]);

    const totalEtiquetas = useMemo(
        () =>
            (items || []).reduce((total, item) => {
                const idItem = obtenerIdItem(item);
                const cantidadMaxima = obtenerCantidadMaxima(item);
                const cantidad = normalizarCantidad(
                    cantidades[idItem],
                    cantidadMaxima
                );

                return total + cantidad;
            }, 0),
        [cantidades, items]
    );

    function handleCantidadChange(item, valor) {
        const idItem = obtenerIdItem(item);

        setCantidades((cantidadesActuales) => ({
            ...cantidadesActuales,
            [idItem]: valor
        }));
    }

    function normalizarCantidadInput(item) {
        const idItem = obtenerIdItem(item);
        const cantidadMaxima = obtenerCantidadMaxima(item);

        setCantidades((cantidadesActuales) => ({
            ...cantidadesActuales,
            [idItem]: normalizarCantidad(
                cantidadesActuales[idItem],
                cantidadMaxima
            )
        }));
    }

    function obtenerEtiquetasPreparadas() {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        return items.flatMap((item) => {
            const idItem = obtenerIdItem(item);
            const imagenQr = imagenesQr[idItem];
            const cantidadMaxima = obtenerCantidadMaxima(item);
            const cantidad = normalizarCantidad(
                cantidades[idItem],
                cantidadMaxima
            );

            if (!imagenQr || !item.codigo_interno) {
                return [];
            }

            return Array.from({ length: cantidad }, () => ({
                item,
                imagenQr
            }));
        });
    }

    function imprimirEtiquetasSeleccionadas() {
        if (
            !puedeImprimir ||
            generando ||
            generandoPdf ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return;
        }

        try {
            setError('');

            const etiquetasPreparadas = obtenerEtiquetasPreparadas();

            if (etiquetasPreparadas.length === 0) {
                setError(
                    'No existen etiquetas disponibles para imprimir.'
                );
                return;
            }

            const etiquetas = etiquetasPreparadas
                .map(({ item, imagenQr }) => `
                    <article class="etiqueta">
                        <img
                            class="etiqueta-qr"
                            src="${imagenQr}"
                            alt="Código QR ${escaparHtml(
                                item.codigo_interno
                            )}"
                        >

                        <div class="etiqueta-informacion">
                            <h2>${escaparHtml(
                                item.producto || 'Producto'
                            )}</h2>
                            <p>${escaparHtml(item.codigo_interno)}</p>
                        </div>
                    </article>
                `)
                .join('');

            const ventana = window.open(
                '',
                '_blank',
                'width=1100,height=800'
            );

            if (!ventana) {
                setError(
                    'El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio.'
                );
                return;
            }

            ventana.document.open();
            ventana.document.write(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    >
                    <title>Hoja de etiquetas QR</title>
                    <style>
                        @page {
                            size: A4;
                            margin: 8mm;
                        }

                        * {
                            box-sizing: border-box;
                        }

                        html,
                        body {
                            margin: 0;
                            padding: 0;
                            background: #ffffff;
                        }

                        .hoja {
                            display: grid;
                            grid-template-columns: repeat(4, 42mm);
                            grid-auto-rows: 50mm;
                            gap: 5mm;
                            align-items: start;
                            justify-content: start;
                        }

                        .etiqueta {
                            width: 42mm;
                            height: 50mm;
                            display: flex;
                            flex-direction: column;
                            align-items: stretch;
                            justify-content: flex-start;
                            border: 0.35mm solid #111827;
                            border-radius: 2.5mm;
                            padding: 1.2mm;
                            background: #ffffff;
                            color: #111827;
                            break-inside: avoid;
                            page-break-inside: avoid;
                            overflow: hidden;
                        }

                        .etiqueta-qr {
                            display: block;
                            width: 36mm;
                            height: 36mm;
                            margin: 0 auto;
                            object-fit: contain;
                            flex: none;
                        }

                        .etiqueta-informacion {
                            min-width: 0;
                            flex: 1;
                            border-top: 0.25mm solid #111827;
                            padding: 1.2mm 1mm 0;
                            overflow: hidden;
                        }

                        .etiqueta-informacion h2 {
                            margin: 0;
                            overflow: hidden;
                            color: #111827;
                            font-family: Arial, Helvetica, sans-serif;
                            font-size: 8.5pt;
                            font-weight: 700;
                            line-height: 1.1;
                            text-align: left;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        }

                        .etiqueta-informacion p {
                            margin: 0.8mm 0 0;
                            color: #111827;
                            font-family: Consolas, "Courier New", monospace;
                            font-size: 7.5pt;
                            font-weight: 600;
                            line-height: 1;
                            text-align: left;
                        }

                        @media print {
                            .etiqueta {
                                break-inside: avoid;
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <main class="hoja">${etiquetas}</main>

                    <script>
                        window.addEventListener('load', () => {
                            setTimeout(() => window.print(), 300);
                        });
                    </script>
                </body>
                </html>
            `);
            ventana.document.close();
        } catch (errorImpresion) {
            console.error(
                'Error al preparar la impresión múltiple:',
                errorImpresion
            );
            setError(
                'No se pudo preparar la hoja de etiquetas QR.'
            );
        }
    }

    async function guardarPdfEtiquetasSeleccionadas() {
        if (
            !puedeImprimir ||
            generando ||
            generandoPdf ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return;
        }

        try {
            setGenerandoPdf(true);
            setError('');

            const etiquetasPreparadas = obtenerEtiquetasPreparadas();

            if (etiquetasPreparadas.length === 0) {
                setError(
                    'No existen etiquetas disponibles para guardar en PDF.'
                );
                return;
            }

            const documento = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            const margenX = 8;
            const margenY = 8;
            const anchoEtiqueta = 42;
            const altoEtiqueta = 50;
            const separacionX = 5;
            const separacionY = 5;
            const columnas = 4;
            const filas = 5;
            const etiquetasPorPagina = columnas * filas;

            etiquetasPreparadas.forEach(({ item, imagenQr }, indice) => {
                if (indice > 0 && indice % etiquetasPorPagina === 0) {
                    documento.addPage('a4', 'portrait');
                }

                const posicionPagina = indice % etiquetasPorPagina;
                const columna = posicionPagina % columnas;
                const fila = Math.floor(posicionPagina / columnas);

                const x =
                    margenX +
                    columna * (anchoEtiqueta + separacionX);
                const y =
                    margenY +
                    fila * (altoEtiqueta + separacionY);

                documento.setDrawColor(17, 24, 39);
                documento.setLineWidth(0.35);
                documento.roundedRect(
                    x,
                    y,
                    anchoEtiqueta,
                    altoEtiqueta,
                    2.5,
                    2.5,
                    'S'
                );

                documento.addImage(
                    imagenQr,
                    'PNG',
                    x + 3,
                    y + 1.2,
                    36,
                    36,
                    undefined,
                    'FAST'
                );

                documento.setLineWidth(0.25);
                documento.line(
                    x + 1.2,
                    y + 38.4,
                    x + anchoEtiqueta - 1.2,
                    y + 38.4
                );

                documento.setTextColor(17, 24, 39);
                documento.setFont('helvetica', 'bold');
                documento.setFontSize(8.5);
                documento.text(
                    recortarTextoPdf(
                        documento,
                        item.producto || 'Producto',
                        anchoEtiqueta - 4
                    ),
                    x + 2,
                    y + 42.2
                );

                documento.setFont('courier', 'bold');
                documento.setFontSize(7.5);
                documento.text(
                    textoPdfSeguro(item.codigo_interno),
                    x + 2,
                    y + 46.5
                );
            });

            documento.save(nombreArchivoPdf());
        } catch (errorPdf) {
            console.error(
                'Error al generar el PDF de códigos QR:',
                errorPdf
            );
            setError(
                'No se pudo generar el PDF de etiquetas QR.'
            );
        } finally {
            setGenerandoPdf(false);
        }
    }

    if (!abierto) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/90 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onCerrar();
                }
            }}
        >
            <section className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
                            Hoja de etiquetas
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-white">
                            Códigos QR seleccionados
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                            Ajusta cuántas etiquetas se imprimirán por cada
                            lote. El límite corresponde a su existencia actual.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onCerrar}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                        Cerrar
                    </button>
                </div>

                {error && (
                    <div className="mt-5 rounded-xl border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <div className="mt-6 grid gap-3">
                    {(items || []).map((item) => {
                        const idItem = obtenerIdItem(item);
                        const cantidadMaxima = obtenerCantidadMaxima(item);

                        return (
                            <article
                                key={idItem}
                                className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-[72px_1fr_150px] sm:items-center"
                            >
                                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border border-slate-700 bg-white p-1">
                                    {imagenesQr[idItem] ? (
                                        <img
                                            src={imagenesQr[idItem]}
                                            alt={`Código QR ${
                                                item.codigo_interno
                                            }`}
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <span className="text-[10px] font-semibold text-slate-500">
                                            QR
                                        </span>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <h3 className="truncate font-bold text-white">
                                        {item.producto || 'Producto'}
                                    </h3>
                                    <p className="mt-1 font-mono text-xs text-cyan-300">
                                        {item.codigo_interno}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Existencia disponible:{' '}
                                        {item.cantidad_disponible || 0}
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Etiquetas
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={cantidadMaxima}
                                        value={cantidades[idItem] ?? 1}
                                        disabled={!puedeImprimir || generando}
                                        onChange={(event) =>
                                            handleCantidadChange(
                                                item,
                                                event.target.value
                                            )
                                        }
                                        onBlur={() =>
                                            normalizarCantidadInput(item)
                                        }
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                                    />
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-6 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm text-slate-300">
                                Productos seleccionados
                            </p>
                            <p className="mt-1 text-2xl font-bold text-white">
                                {(items || []).length}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-300">
                                Total de etiquetas
                            </p>
                            <p className="mt-1 text-2xl font-bold text-cyan-300">
                                {totalEtiquetas}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <button
                                type="button"
                                onClick={onLimpiarSeleccion}
                                disabled={!Array.isArray(items) || items.length === 0}
                                className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Limpiar selección
                            </button>

                            <button
                                type="button"
                                onClick={guardarPdfEtiquetasSeleccionadas}
                                disabled={
                                    !puedeImprimir ||
                                    generando ||
                                    generandoPdf ||
                                    Boolean(error) ||
                                    !Array.isArray(items) ||
                                    items.length === 0
                                }
                                className="rounded-xl border border-emerald-500 bg-emerald-500/10 px-6 py-3 font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {generandoPdf
                                    ? 'Generando PDF...'
                                    : 'Guardar PDF'}
                            </button>

                            <button
                                type="button"
                                onClick={imprimirEtiquetasSeleccionadas}
                                disabled={
                                    !puedeImprimir ||
                                    generando ||
                                    generandoPdf ||
                                    Boolean(error) ||
                                    !Array.isArray(items) ||
                                    items.length === 0
                                }
                                className="rounded-xl bg-cyan-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {generando
                                    ? 'Preparando QR...'
                                    : 'Imprimir hoja de QR'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default QrSeleccionMultipleModal;
