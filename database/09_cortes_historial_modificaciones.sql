create table if not exists public.cortes_caja_historial (
    id_historial uuid primary key default gen_random_uuid(),
    id_corte uuid not null references public.cortes_caja(id_corte) on delete cascade,
    modificado_por uuid not null references public.perfiles(id_perfil),
    motivo text not null,
    valores_anteriores jsonb not null,
    valores_nuevos jsonb not null,
    fecha_modificacion timestamptz not null default now()
);

create index if not exists idx_cortes_caja_historial_id_corte
    on public.cortes_caja_historial(id_corte);

create index if not exists idx_cortes_caja_historial_fecha
    on public.cortes_caja_historial(fecha_modificacion desc);

create or replace function public.modificar_corte_caja_admin(
    p_id_corte uuid,
    p_modificado_por uuid,
    p_efectivo_contado numeric,
    p_observaciones text,
    p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_es_admin boolean;
    v_corte public.cortes_caja%rowtype;
    v_nueva_diferencia numeric;
    v_anteriores jsonb;
    v_nuevos jsonb;
begin
    select (activo and es_admin_principal)
      into v_es_admin
      from public.perfiles
     where id_perfil = p_modificado_por;

    if coalesce(v_es_admin, false) is not true then
        raise exception 'Solo el administrador principal puede modificar cortes de caja.';
    end if;

    if p_motivo is null or btrim(p_motivo) = '' then
        raise exception 'El motivo de modificación es obligatorio.';
    end if;

    if p_efectivo_contado is null or p_efectivo_contado < 0 then
        raise exception 'El efectivo contado no es válido.';
    end if;

    select *
      into v_corte
      from public.cortes_caja
     where id_corte = p_id_corte
     for update;

    if not found then
        raise exception 'Corte de caja no encontrado.';
    end if;

    v_nueva_diferencia :=
        p_efectivo_contado - coalesce(v_corte.efectivo_esperado, 0);

    v_anteriores := jsonb_build_object(
        'efectivo_contado', v_corte.efectivo_contado,
        'diferencia', v_corte.diferencia,
        'observaciones', v_corte.observaciones
    );

    update public.cortes_caja
       set efectivo_contado = p_efectivo_contado,
           diferencia = v_nueva_diferencia,
           diferencia_efectivo = v_nueva_diferencia,
           observaciones = nullif(
               btrim(coalesce(p_observaciones, '')),
               ''
           )
     where id_corte = p_id_corte
     returning * into v_corte;

    v_nuevos := jsonb_build_object(
        'efectivo_contado', v_corte.efectivo_contado,
        'diferencia', v_corte.diferencia,
        'observaciones', v_corte.observaciones
    );

    insert into public.cortes_caja_historial (
        id_corte,
        modificado_por,
        motivo,
        valores_anteriores,
        valores_nuevos
    ) values (
        p_id_corte,
        p_modificado_por,
        btrim(p_motivo),
        v_anteriores,
        v_nuevos
    );

    return to_jsonb(v_corte);
end;
$$;

revoke all on function public.modificar_corte_caja_admin(
    uuid,
    uuid,
    numeric,
    text,
    text
) from public;

grant execute on function public.modificar_corte_caja_admin(
    uuid,
    uuid,
    numeric,
    text,
    text
) to service_role;

notify pgrst, 'reload schema';
