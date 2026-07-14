-- ============================================================
-- SEGURIDAD: ROW LEVEL SECURITY
-- ============================================================
-- El backend usa la Service Role Key (supabaseAdmin), que SIEMPRE
-- se salta RLS. Por eso activar esto no rompe nada del sistema.
--
-- Sin esto, cualquier usuario con sesión válida podía saltarse tu
-- backend por completo usando la anon key directo desde la consola
-- del navegador. Al activar RLS sin políticas para anon/authenticated,
-- ese acceso directo queda bloqueado.

alter table public.perfiles enable row level security;
alter table public.roles enable row level security;
alter table public.perfil_roles enable row level security;
alter table public.propietarios enable row level security;
alter table public.puestos enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.compras enable row level security;
alter table public.lotes_inventario enable row level security;
alter table public.inventario_puesto enable row level security;
alter table public.jornadas enable row level security;
alter table public.ventas enable row level security;
alter table public.detalle_ventas enable row level security;
alter table public.metodos_pago enable row level security;
alter table public.pagos_venta enable row level security;
alter table public.gastos_jornada enable row level security;
alter table public.cortes_caja enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.bajas_inventario enable row level security;
alter table public.cambios_puesto_inventario enable row level security;
alter table public.resurtidos_inventario enable row level security;
alter table public.configuracion_sistema enable row level security;

notify pgrst, 'reload schema';