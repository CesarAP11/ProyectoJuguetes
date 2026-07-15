-- ============================================================
-- JuguetesFun - Códigos QR permanentes por lote
-- No elimina ni reemplaza información existente.
-- ============================================================

create sequence if not exists public.codigo_lote_seq
    as bigint
    start with 1
    increment by 1
    minvalue 1;

alter table public.lotes_inventario
    add column if not exists codigo_interno text,
    add column if not exists fecha_generacion_codigo timestamptz,
    add column if not exists codigo_generado_por uuid references public.perfiles(id_perfil);

-- Ajustar la secuencia tomando en cuenta códigos que pudieran existir.
do $$
declare
    v_maximo bigint;
begin
    select coalesce(
        max(
            case
                when codigo_interno ~ '^JF-L-[0-9]+$'
                    then substring(codigo_interno from '[0-9]+$')::bigint
                else null
            end
        ),
        0
    )
    into v_maximo
    from public.lotes_inventario;

    if v_maximo > 0 then
        perform setval('public.codigo_lote_seq', v_maximo, true);
    else
        perform setval('public.codigo_lote_seq', 1, false);
    end if;
end;
$$;

-- Asignar un código permanente a todos los lotes ya registrados.
update public.lotes_inventario
set codigo_interno = 'JF-L-' || lpad(nextval('public.codigo_lote_seq')::text, 6, '0'),
    fecha_generacion_codigo = coalesce(fecha_generacion_codigo, now())
where codigo_interno is null
   or btrim(codigo_interno) = '';

alter table public.lotes_inventario
    alter column codigo_interno set not null,
    alter column fecha_generacion_codigo set default now(),
    alter column fecha_generacion_codigo set not null;

create unique index if not exists uq_lotes_inventario_codigo_interno
    on public.lotes_inventario (codigo_interno);

create or replace function public.asignar_codigo_qr_lote()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if tg_op = 'UPDATE'
       and old.codigo_interno is not null
       and new.codigo_interno is distinct from old.codigo_interno then
        raise exception 'El código QR de un lote es permanente y no se puede modificar.';
    end if;

    if new.codigo_interno is null or btrim(new.codigo_interno) = '' then
        new.codigo_interno :=
            'JF-L-' || lpad(nextval('public.codigo_lote_seq')::text, 6, '0');
    else
        new.codigo_interno := upper(btrim(new.codigo_interno));
    end if;

    if new.fecha_generacion_codigo is null then
        new.fecha_generacion_codigo := now();
    end if;

    return new;
end;
$$;

drop trigger if exists trg_asignar_codigo_qr_lote
    on public.lotes_inventario;

create trigger trg_asignar_codigo_qr_lote
before insert or update of codigo_interno
on public.lotes_inventario
for each row
execute function public.asignar_codigo_qr_lote();

grant usage, select on sequence public.codigo_lote_seq to service_role;

comment on column public.lotes_inventario.codigo_interno is
    'Código permanente del lote usado como contenido del QR, por ejemplo JF-L-000001.';

comment on column public.lotes_inventario.fecha_generacion_codigo is
    'Fecha en que se asignó el código QR permanente al lote.';

notify pgrst, 'reload schema';
