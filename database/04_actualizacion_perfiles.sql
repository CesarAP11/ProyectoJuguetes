-- ============================================================
-- ACTUALIZACIÓN DE ESQUEMA: perfiles
-- ============================================================
-- El backend ya usa estas columnas en producción; este script
-- las agrega aquí para que el respaldo SQL no se quede desactualizado.

alter table public.perfiles
    add column if not exists telefono text;

alter table public.perfiles
    add column if not exists debe_cambiar_password boolean default false;

notify pgrst, 'reload schema';