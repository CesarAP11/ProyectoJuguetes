create extension if not exists "pgcrypto";

-- ============================================================
-- TABLAS BASE - JUGUETESFUN
-- ============================================================

create table if not exists public.perfiles (
    id_perfil uuid primary key references auth.users(id) on delete cascade,
    email text unique not null,
    nombre_completo text not null,
    username text unique not null,
    es_admin_principal boolean default false,
    activo boolean default true,
    fecha_creacion timestamptz default now(),
    ultima_actualizacion timestamptz default now()
);

create table if not exists public.roles (
    id_rol uuid primary key default gen_random_uuid(),
    nombre text unique not null,
    descripcion text,
    fecha_creacion timestamptz default now()
);

create table if not exists public.perfil_roles (
    id_perfil uuid references public.perfiles(id_perfil) on delete cascade,
    id_rol uuid references public.roles(id_rol) on delete cascade,
    fecha_asignacion timestamptz default now(),
    primary key (id_perfil, id_rol)
);

create table if not exists public.propietarios (
    id_propietario uuid primary key default gen_random_uuid(),
    nombre text unique not null,
    tipo text default 'individual',
    activo boolean default true,
    fecha_creacion timestamptz default now()
);

create table if not exists public.puestos (
    id_puesto uuid primary key default gen_random_uuid(),
    nombre text unique not null,
    ubicacion text,
    activo boolean default true,
    fecha_creacion timestamptz default now()
);

create table if not exists public.categorias (
    id_categoria uuid primary key default gen_random_uuid(),
    nombre text unique not null,
    descripcion text,
    activo boolean default true,
    fecha_creacion timestamptz default now()
);

create table if not exists public.productos (
    id_producto uuid primary key default gen_random_uuid(),
    id_categoria uuid references public.categorias(id_categoria),
    nombre text not null,
    descripcion text,
    foto_url text,
    foto_path text,
    activo boolean default true,
    fecha_creacion timestamptz default now(),
    ultima_actualizacion timestamptz default now()
);

create table if not exists public.compras (
    id_compra uuid primary key default gen_random_uuid(),
    id_propietario uuid references public.propietarios(id_propietario),
    nombre_compra text not null,
    fecha_compra date not null,
    total_compra numeric(12,2) default 0,
    notas text,
    fecha_creacion timestamptz default now()
);

create table if not exists public.lotes_inventario (
    id_lote uuid primary key default gen_random_uuid(),
    id_compra uuid references public.compras(id_compra),
    id_producto uuid references public.productos(id_producto),
    id_propietario uuid references public.propietarios(id_propietario),
    cantidad_inicial integer not null default 0,
    cantidad_disponible integer not null default 0,
    costo_unitario numeric(12,2) not null default 0,
    precio_venta_sugerido numeric(12,2) not null default 0,
    estado text not null default 'disponible',
    fecha_creacion timestamptz default now(),
    ultima_actualizacion timestamptz default now()
);

create table if not exists public.inventario_puesto (
    id_inventario_puesto uuid primary key default gen_random_uuid(),
    id_producto uuid references public.productos(id_producto),
    id_lote uuid references public.lotes_inventario(id_lote),
    id_propietario uuid references public.propietarios(id_propietario),
    id_puesto uuid references public.puestos(id_puesto),
    cantidad_disponible integer not null default 0,
    cantidad_reservada integer not null default 0,
    precio_venta_sugerido numeric(12,2) not null default 0,
    estado text not null default 'activo',
    eliminado_por uuid references public.perfiles(id_perfil),
    fecha_eliminacion timestamptz,
    motivo_eliminacion text,
    fecha_creacion timestamptz default now(),
    ultima_actualizacion timestamptz default now()
);

create table if not exists public.jornadas (
    id_jornada uuid primary key default gen_random_uuid(),
    id_puesto uuid references public.puestos(id_puesto),
    id_encargado uuid references public.perfiles(id_perfil),
    nombre_jornada text not null,
    fecha_base date not null,
    hora_inicio time,
    fecha_hora_inicio timestamptz default now(),
    fecha_cierre_programado date,
    hora_cierre_programado time,
    fecha_hora_cierre_programado timestamptz,
    fecha_hora_cierre_real timestamptz,
    estado text not null default 'abierta',
    observaciones text,
    fecha_creacion timestamptz default now()
);

create table if not exists public.ventas (
    id_venta uuid primary key default gen_random_uuid(),
    id_jornada uuid references public.jornadas(id_jornada),
    id_vendedor uuid references public.perfiles(id_perfil),
    fecha_venta timestamptz default now(),
    total_venta numeric(12,2) default 0,
    estado text not null default 'pagada',
    observaciones text,
    fecha_creacion timestamptz default now()
);

create table if not exists public.detalle_ventas (
    id_detalle_venta uuid primary key default gen_random_uuid(),
    id_venta uuid references public.ventas(id_venta) on delete cascade,
    id_inventario_puesto uuid references public.inventario_puesto(id_inventario_puesto),
    id_producto uuid references public.productos(id_producto),
    id_lote uuid references public.lotes_inventario(id_lote),
    id_propietario_snapshot uuid references public.propietarios(id_propietario),
    cantidad integer not null default 1,
    precio_unitario_venta numeric(12,2) not null default 0,
    costo_unitario_snapshot numeric(12,2) not null default 0,
    subtotal numeric(12,2) generated always as (cantidad * precio_unitario_venta) stored,
    fecha_creacion timestamptz default now()
);

create table if not exists public.metodos_pago (
    id_metodo_pago uuid primary key default gen_random_uuid(),
    nombre text unique not null,
    codigo text unique not null,
    activo boolean default true,
    fecha_creacion timestamptz default now()
);

create table if not exists public.pagos_venta (
    id_pago_venta uuid primary key default gen_random_uuid(),
    id_venta uuid references public.ventas(id_venta) on delete cascade,
    id_metodo_pago uuid references public.metodos_pago(id_metodo_pago),
    metodo_pago text,
    monto numeric(12,2) not null default 0,
    referencia text,
    confirmado boolean default true,
    notas text,
    fecha_creacion timestamptz default now()
);

create table if not exists public.gastos_jornada (
    id_gasto uuid primary key default gen_random_uuid(),
    id_jornada uuid references public.jornadas(id_jornada) on delete cascade,
    concepto text not null,
    monto numeric(12,2) not null default 0,
    registrado_por uuid references public.perfiles(id_perfil),
    fecha_gasto timestamptz default now()
);

create table if not exists public.cortes_caja (
    id_corte uuid primary key default gen_random_uuid(),
    id_jornada uuid references public.jornadas(id_jornada),
    total_ventas numeric(12,2) default 0,
    total_efectivo numeric(12,2) default 0,
    total_transferencia numeric(12,2) default 0,
    total_terminal numeric(12,2) default 0,
    total_otros numeric(12,2) default 0,
    total_gastos numeric(12,2) default 0,
    efectivo_esperado numeric(12,2) default 0,
    efectivo_contado numeric(12,2) default 0,
    diferencia numeric(12,2) default 0,
    ganancia_bruta numeric(12,2) default 0,
    ganancia_neta numeric(12,2) default 0,
    observaciones text,
    cerrado_por uuid references public.perfiles(id_perfil),
    fecha_corte timestamptz default now()
);

create table if not exists public.movimientos_inventario (
    id_movimiento uuid primary key default gen_random_uuid(),
    id_inventario_puesto uuid references public.inventario_puesto(id_inventario_puesto),
    id_producto uuid references public.productos(id_producto),
    id_lote uuid references public.lotes_inventario(id_lote),
    id_propietario uuid references public.propietarios(id_propietario),
    id_puesto uuid references public.puestos(id_puesto),
    id_venta uuid references public.ventas(id_venta),
    tipo_movimiento text not null,
    cantidad integer not null default 0,
    stock_anterior integer default 0,
    stock_nuevo integer default 0,
    descripcion text,
    registrado_por uuid references public.perfiles(id_perfil),
    fecha_movimiento timestamptz default now()
);

create table if not exists public.bajas_inventario (
    id_baja uuid primary key default gen_random_uuid(),
    id_inventario_puesto uuid,
    id_producto uuid,
    id_lote uuid,
    id_propietario uuid,
    id_puesto uuid,
    producto_nombre text,
    propietario_nombre text,
    puesto_nombre text,
    cantidad_disponible_anterior integer default 0,
    cantidad_reservada_anterior integer default 0,
    costo_unitario numeric(12,2) default 0,
    precio_venta_sugerido numeric(12,2) default 0,
    motivo text not null,
    eliminado_por uuid references public.perfiles(id_perfil),
    fecha_baja timestamptz default now(),
    datos_snapshot jsonb
);

create table if not exists public.cambios_puesto_inventario (
    id_cambio uuid primary key default gen_random_uuid(),
    id_inventario_puesto uuid,
    id_producto uuid,
    id_propietario uuid,
    id_puesto_anterior uuid,
    id_puesto_nuevo uuid,
    puesto_anterior_nombre text,
    puesto_nuevo_nombre text,
    producto_nombre text,
    propietario_nombre text,
    cantidad_movida integer default 0,
    motivo text not null,
    cambiado_por uuid references public.perfiles(id_perfil),
    fecha_cambio timestamptz default now(),
    datos_snapshot jsonb
);

create table if not exists public.resurtidos_inventario (
    id_resurtido uuid primary key default gen_random_uuid(),
    id_inventario_puesto uuid,
    id_producto uuid,
    id_lote uuid,
    id_propietario uuid,
    id_puesto uuid,
    producto_nombre text,
    propietario_nombre text,
    puesto_nombre text,
    cantidad_anterior integer default 0,
    cantidad_resurtida integer not null,
    cantidad_final integer default 0,
    costo_unitario numeric(12,2),
    precio_venta_sugerido numeric(12,2),
    resurtido_por uuid references public.perfiles(id_perfil),
    fecha_resurtido timestamptz default now(),
    datos_snapshot jsonb
);

create table if not exists public.configuracion_sistema (
    clave text primary key,
    valor text,
    descripcion text,
    fecha_actualizacion timestamptz default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

create index if not exists idx_productos_nombre on public.productos(nombre);
create index if not exists idx_inventario_puesto_puesto on public.inventario_puesto(id_puesto);
create index if not exists idx_inventario_puesto_producto on public.inventario_puesto(id_producto);
create index if not exists idx_ventas_jornada on public.ventas(id_jornada);
create index if not exists idx_ventas_fecha_venta on public.ventas(fecha_venta);
create index if not exists idx_detalle_ventas_venta on public.detalle_ventas(id_venta);
create index if not exists idx_jornadas_fecha_base on public.jornadas(fecha_base);
create index if not exists idx_bajas_inventario_fecha on public.bajas_inventario(fecha_baja);
create index if not exists idx_cambios_puesto_inventario_fecha on public.cambios_puesto_inventario(fecha_cambio);
create index if not exists idx_resurtidos_inventario_fecha on public.resurtidos_inventario(fecha_resurtido);

-- ============================================================
-- ROLES BASE
-- ============================================================

insert into public.roles (nombre, descripcion)
values
('vendedor', 'Puede registrar ventas y consultar productos disponibles.'),
('encargado', 'Puede gestionar jornadas, ventas y cortes.'),
('administrador', 'Puede gestionar inventario, usuarios y reportes.')
on conflict (nombre) do update
set descripcion = excluded.descripcion;

-- ============================================================
-- FUNCIONES DE PERMISOS
-- ============================================================

create or replace function public.es_admin_principal(_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.perfiles
        where id_perfil = _uid
        and es_admin_principal = true
        and activo = true
    );
$$;

create or replace function public.tiene_rol(_rol text, _uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.perfil_roles pr
        join public.roles r on r.id_rol = pr.id_rol
        join public.perfiles p on p.id_perfil = pr.id_perfil
        where pr.id_perfil = _uid
        and r.nombre = _rol
        and p.activo = true
    );
$$;

create or replace function public.puede_vender(_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
    select public.es_admin_principal(_uid)
        or public.tiene_rol('vendedor', _uid)
        or public.tiene_rol('encargado', _uid)
        or public.tiene_rol('administrador', _uid);
$$;

create or replace function public.puede_administrar(_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
    select public.es_admin_principal(_uid)
        or public.tiene_rol('administrador', _uid);
$$;

create or replace function public.puede_gestionar_permisos(_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
    select public.es_admin_principal(_uid);
$$;

create or replace function public.obtener_email_por_username(_username text)
returns text
language sql
security definer
set search_path = public
as $$
    select email
    from public.perfiles
    where lower(username) = lower(_username)
    and activo = true
    limit 1;
$$;

-- ============================================================
-- PERMISOS
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
on all tables in schema public
to authenticated, service_role;

grant usage, select, update
on all sequences in schema public
to authenticated, service_role;

grant execute
on all functions in schema public
to anon, authenticated, service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables
to authenticated, service_role;

alter default privileges in schema public
grant usage, select, update on sequences
to authenticated, service_role;

alter default privileges in schema public
grant execute on functions
to anon, authenticated, service_role;

notify pgrst, 'reload schema';