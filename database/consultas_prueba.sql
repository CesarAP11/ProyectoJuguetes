-- ============================================================
-- CONSULTAS DE PRUEBA - JUGUETESFUN
-- ============================================================

-- Ver perfiles
select
    id_perfil,
    email,
    nombre_completo,
    username,
    es_admin_principal,
    activo
from public.perfiles
order by fecha_creacion desc;

-- Ver roles por usuario
select
    p.nombre_completo,
    p.username,
    r.nombre as rol
from public.perfiles p
left join public.perfil_roles pr on pr.id_perfil = p.id_perfil
left join public.roles r on r.id_rol = pr.id_rol
order by p.nombre_completo, r.nombre;

-- Ver propietarios
select *
from public.propietarios
order by nombre;

-- Ver puestos
select *
from public.puestos
order by nombre;

-- Ver categorías
select *
from public.categorias
order by nombre;

-- Ver métodos de pago
select *
from public.metodos_pago
order by nombre;

-- Ver inventario general
select
    ip.id_inventario_puesto,
    pr.nombre as propietario,
    pu.nombre as puesto,
    c.nombre as categoria,
    p.nombre as producto,
    p.descripcion,
    p.foto_url,
    co.nombre_compra,
    co.fecha_compra,
    li.cantidad_inicial,
    ip.cantidad_disponible,
    li.costo_unitario,
    ip.precio_venta_sugerido,
    ip.estado
from public.inventario_puesto ip
left join public.productos p on p.id_producto = ip.id_producto
left join public.categorias c on c.id_categoria = p.id_categoria
left join public.propietarios pr on pr.id_propietario = ip.id_propietario
left join public.puestos pu on pu.id_puesto = ip.id_puesto
left join public.lotes_inventario li on li.id_lote = ip.id_lote
left join public.compras co on co.id_compra = li.id_compra
order by ip.ultima_actualizacion desc;

-- Ver jornadas
select
    j.id_jornada,
    j.nombre_jornada,
    pu.nombre as puesto,
    j.fecha_base,
    j.hora_inicio,
    j.fecha_cierre_programado,
    j.hora_cierre_programado,
    j.estado
from public.jornadas j
left join public.puestos pu on pu.id_puesto = j.id_puesto
order by j.fecha_base desc;

-- Ver ventas
select
    v.id_venta,
    v.fecha_venta,
    j.nombre_jornada,
    pu.nombre as puesto,
    pe.nombre_completo as vendedor,
    v.total_venta,
    v.estado
from public.ventas v
left join public.jornadas j on j.id_jornada = v.id_jornada
left join public.puestos pu on pu.id_puesto = j.id_puesto
left join public.perfiles pe on pe.id_perfil = v.id_vendedor
order by v.fecha_venta desc;

-- Ver detalle de juguetes vendidos
select
    dv.id_detalle_venta,
    v.fecha_venta,
    prop.nombre as propietario,
    pu.nombre as puesto,
    cat.nombre as categoria,
    prod.nombre as producto,
    prod.descripcion,
    prod.foto_url,
    dv.cantidad,
    dv.precio_unitario_venta,
    dv.costo_unitario_snapshot,
    dv.subtotal
from public.detalle_ventas dv
left join public.ventas v on v.id_venta = dv.id_venta
left join public.jornadas j on j.id_jornada = v.id_jornada
left join public.puestos pu on pu.id_puesto = j.id_puesto
left join public.productos prod on prod.id_producto = dv.id_producto
left join public.categorias cat on cat.id_categoria = prod.id_categoria
left join public.propietarios prop on prop.id_propietario = dv.id_propietario_snapshot
order by v.fecha_venta desc;

-- Ver bajas de inventario
select
    bi.fecha_baja,
    bi.producto_nombre,
    bi.propietario_nombre,
    bi.puesto_nombre,
    bi.cantidad_disponible_anterior,
    bi.costo_unitario,
    bi.precio_venta_sugerido,
    bi.motivo,
    p.nombre_completo as eliminado_por
from public.bajas_inventario bi
left join public.perfiles p on p.id_perfil = bi.eliminado_por
order by bi.fecha_baja desc;

-- Ver cambios de puesto
select
    cpi.fecha_cambio,
    cpi.producto_nombre,
    cpi.propietario_nombre,
    cpi.puesto_anterior_nombre,
    cpi.puesto_nuevo_nombre,
    cpi.cantidad_movida,
    cpi.motivo,
    p.nombre_completo as cambiado_por
from public.cambios_puesto_inventario cpi
left join public.perfiles p on p.id_perfil = cpi.cambiado_por
order by cpi.fecha_cambio desc;

-- Ver resurtidos
select
    ri.fecha_resurtido,
    ri.producto_nombre,
    ri.propietario_nombre,
    ri.puesto_nombre,
    ri.cantidad_anterior,
    ri.cantidad_resurtida,
    ri.cantidad_final,
    ri.costo_unitario,
    ri.precio_venta_sugerido,
    p.nombre_completo as resurtido_por
from public.resurtidos_inventario ri
left join public.perfiles p on p.id_perfil = ri.resurtido_por
order by ri.fecha_resurtido desc;

-- Probar función de username
select public.obtener_email_por_username('Cesar AP') as email_encontrado;

-- Probar permisos de Cesar
select
    public.es_admin_principal('31139881-e0db-4b09-a228-d31acfdd694a') as es_admin_principal,
    public.tiene_rol('vendedor', '31139881-e0db-4b09-a228-d31acfdd694a') as es_vendedor,
    public.tiene_rol('encargado', '31139881-e0db-4b09-a228-d31acfdd694a') as es_encargado,
    public.tiene_rol('administrador', '31139881-e0db-4b09-a228-d31acfdd694a') as es_administrador;