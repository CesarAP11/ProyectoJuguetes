-- ============================================================
-- MÉTODOS DE PAGO BASE
-- ============================================================

insert into public.metodos_pago (nombre, codigo, activo)
values
('Efectivo', 'efectivo', true),
('Transferencia bancaria', 'transferencia', true),
('Terminal / tarjeta', 'terminal', true),
('Pago combinado', 'combinado', true),
('Otro', 'otro', true)
on conflict (codigo) do update
set
    nombre = excluded.nombre,
    activo = true;

notify pgrst, 'reload schema';