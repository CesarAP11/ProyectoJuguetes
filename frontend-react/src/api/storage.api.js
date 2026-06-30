import { supabaseClient } from './supabaseClient';

const BUCKET_FOTOS = 'juguetes-fotos';

function limpiarNombreArchivo(nombre) {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9.]+/g, '-')
        .replace(/-+/g, '-');
}

export async function subirFotoProducto(archivo) {
    if (!archivo) {
        return {
            foto_url: null,
            foto_path: null
        };
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    const limiteMb = 5;
    const limiteBytes = limiteMb * 1024 * 1024;

    if (!tiposPermitidos.includes(archivo.type)) {
        throw new Error('La foto debe ser JPG, PNG o WEBP.');
    }

    if (archivo.size > limiteBytes) {
        throw new Error(`La foto no debe pesar más de ${limiteMb} MB.`);
    }

    const nombreLimpio = limpiarNombreArchivo(archivo.name);
    const rutaArchivo = `productos/${Date.now()}-${nombreLimpio}`;

    const { error } = await supabaseClient.storage
        .from(BUCKET_FOTOS)
        .upload(rutaArchivo, archivo, {
            cacheControl: '3600',
            upsert: false,
            contentType: archivo.type
        });

    if (error) {
        throw new Error(`No se pudo subir la foto: ${error.message}`);
    }

    const { data } = supabaseClient.storage
        .from(BUCKET_FOTOS)
        .getPublicUrl(rutaArchivo);

    return {
        foto_url: data.publicUrl,
        foto_path: rutaArchivo
    };
}