import { useEffect, useState } from 'react';
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

function nombreArchivoPdf(item) {
    const codigo = String(item?.codigo_interno || 'QR')
        .replace(/[^A-Za-z0-9-_]/g, '-');

    return `JuguetesFun-${codigo}.pdf`;
}

function QrInventarioModal({ abierto, item, puedeImprimir, onCerrar }) {
    const [imagenQr, setImagenQr] = useState('');
    const [cantidadEtiquetas, setCantidadEtiquetas] = useState(1);
    const [generando, setGenerando] = useState(false);
    const [generandoPdf, setGenerandoPdf] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;

        async function generar() {
            if (!abierto || !item?.codigo_interno) {
                setImagenQr('');
                return;
            }

            try {
                setGenerando(true);
                setError('');

                const dataUrl = await QRCode.toDataURL(item.codigo_interno, {
                    width: 520,
                    margin: 2,
                    errorCorrectionLevel: 'M'
                });

                if (activo) {
                    setImagenQr(dataUrl);
                    setCantidadEtiquetas(
                        Math.max(1, Number(item.cantidad_disponible || 1))
                    );
                }
            } catch (errorGeneracion) {
                console.error('Error al generar QR:', errorGeneracion);

                if (activo) {
                    setError('No se pudo generar la imagen del código QR.');
                }
            } finally {
                if (activo) {
                    setGenerando(false);
                }
            }
        }

        generar();

        return () => {
            activo = false;
        };
    }, [abierto, item]);

    useEffect(() => {
        function cerrarConEscape(event) {
            if (event.key === 'Escape' && abierto) {
                onCerrar();
            }
        }

        document.addEventListener('keydown', cerrarConEscape);
        return () => document.removeEventListener('keydown', cerrarConEscape);
    }, [abierto, onCerrar]);

    function imprimirEtiquetas() {
        if (!puedeImprimir || !item || !imagenQr) {
            return;
        }

        const cantidad = Math.min(
            100,
            Math.max(1, Number(cantidadEtiquetas || 1))
        );

        const etiquetas = Array.from({ length: cantidad }, () => `
            <article class="etiqueta">
                <img
                    class="etiqueta-qr"
                    src="${imagenQr}"
                    alt="Código QR ${escaparHtml(item.codigo_interno)}"
                >

                <div class="etiqueta-informacion">
                    <h2>${escaparHtml(item.producto || 'Producto')}</h2>
                    <p>${escaparHtml(item.codigo_interno)}</p>
                </div>
            </article>
        `).join('');

        const ventana = window.open('', '_blank', 'width=1000,height=760');

        if (!ventana) {
            setError('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio.');
            return;
        }

        ventana.document.open();
        ventana.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Etiquetas QR</title>
                <style>
                    @page { size: A4; margin: 8mm; }
                    * { box-sizing: border-box; }
                    body {
                        margin: 0;
                        background: #fff;
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
                        setTimeout(() => window.print(), 250);
                    });
                </script>
            </body>
            </html>
        `);
        ventana.document.close();
    }

    async function guardarPdfEtiquetas() {
        if (
            !puedeImprimir ||
            !item ||
            !imagenQr ||
            generando ||
            generandoPdf
        ) {
            return;
        }

        try {
            setGenerandoPdf(true);
            setError('');

            const cantidad = Math.min(
                100,
                Math.max(1, Number(cantidadEtiquetas || 1))
            );

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

            Array.from({ length: cantidad }).forEach((_, indice) => {
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

            documento.save(nombreArchivoPdf(item));
        } catch (errorPdf) {
            console.error('Error al generar PDF de etiquetas:', errorPdf);
            setError('No se pudo generar el PDF de etiquetas QR.');
        } finally {
            setGenerandoPdf(false);
        }
    }

    if (!abierto || !item) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onCerrar();
                }
            }}
        >
            <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            Código permanente del lote
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-white">
                            {item.producto}
                        </h2>
                        <p className="mt-1 font-mono text-sm text-slate-400">
                            {item.codigo_interno}
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

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
                    <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-700 bg-white p-4">
                        {generando ? (
                            <p className="text-sm font-semibold text-slate-500">
                                Generando QR...
                            </p>
                        ) : imagenQr ? (
                            <img
                                src={imagenQr}
                                alt={`Código QR ${item.codigo_interno}`}
                                className="h-auto w-full"
                            />
                        ) : (
                            <p className="text-sm font-semibold text-red-500">
                                QR no disponible
                            </p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Dato titulo="Propietario" valor={item.propietario || '-'} />
                        <Dato titulo="Puesto actual" valor={item.puesto || '-'} />
                        <Dato titulo="Existencia" valor={`${item.cantidad_disponible || 0} pieza(s)`} />
                        <Dato
                            titulo="Precio de venta"
                            valor={Number(item.precio_venta_sugerido || 0).toLocaleString('es-MX', {
                                style: 'currency',
                                currency: 'MXN'
                            })}
                        />

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-300">
                                Etiquetas a imprimir
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={cantidadEtiquetas}
                                disabled={!puedeImprimir}
                                onChange={(event) => setCantidadEtiquetas(event.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                            />
                            <p className="mt-2 text-xs text-slate-500">
                                Las etiquetas serán iguales porque pertenecen al mismo lote.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={guardarPdfEtiquetas}
                                disabled={
                                    !puedeImprimir ||
                                    !imagenQr ||
                                    generando ||
                                    generandoPdf
                                }
                                className="w-full rounded-xl border border-cyan-500 bg-cyan-500/10 px-5 py-3 font-bold text-cyan-300 transition hover:bg-cyan-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {generandoPdf
                                    ? 'Generando PDF...'
                                    : 'Guardar PDF'}
                            </button>

                            <button
                                type="button"
                                onClick={imprimirEtiquetas}
                                disabled={
                                    !puedeImprimir ||
                                    !imagenQr ||
                                    generando ||
                                    generandoPdf
                                }
                                className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {puedeImprimir
                                    ? 'Imprimir etiquetas'
                                    : 'Impresión restringida'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function Dato({ titulo, valor }) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{titulo}</p>
            <p className="mt-1 font-semibold text-white">{valor}</p>
        </div>
    );
}

export default QrInventarioModal;