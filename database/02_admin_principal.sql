-- ============================================================
-- ADMINISTRADOR PRINCIPAL - CESAR AP
-- IMPORTANTE:
-- El usuario debe existir primero en Supabase Auth.
-- UID actual de Cesar:
-- 31139881-e0db-4b09-a228-d31acfdd694a
-- ============================================================

insert into public.perfiles (
    id_perfil,
    email,
    nombre_completo,
    username,
    es_admin_principal,
    activo
)
values (
    '31139881-e0db-4b09-a228-d31acfdd694a',
    'cesarap1169@gmail.com',
    'Cesar Alonso Pineda Torres',
    'Cesar AP',
    true,
    true
)
on conflict (id_perfil) do update
set
    email = excluded.email,
    nombre_completo = excluded.nombre_completo,
    username = excluded.username,
    es_admin_principal = true,
    activo = true,
    ultima_actualizacion = now();

insert into public.perfil_roles (id_perfil, id_rol)
select
    '31139881-e0db-4b09-a228-d31acfdd694a',
    r.id_rol
from public.roles r
where r.nombre in ('vendedor', 'encargado', 'administrador')
on conflict do nothing;

-- ============================================================
-- PROPIETARIOS BASE
-- ============================================================

insert into public.propietarios (nombre, tipo, activo)
values
('Papás de Cesar', 'grupo', true),
('Esther', 'individual', true),
('Marco', 'individual', true),
('Héctor', 'individual', true),
('Diego', 'individual', true),
('Daniela', 'individual', true),
('Fabiola', 'individual', true)
on conflict (nombre) do update
set activo = true;

-- ============================================================
-- PUESTOS BASE
-- ============================================================

insert into public.puestos (nombre, ubicacion, activo)
values
(
    'Palacio Municipal',
    'Frente al Palacio Municipal de Cuautitlán Izcalli',
    true
),
(
    'Centro Urbano',
    '006, Centro Urbano, 54700 Cuautitlán Izcalli, Méx.',
    true
)
on conflict (nombre) do update
set
    ubicacion = excluded.ubicacion,
    activo = true;

-- ============================================================
-- CATEGORÍAS BASE
-- ============================================================

insert into public.categorias (nombre, descripcion, activo)
values
('Balones', 'Balones, pelotas y artículos deportivos.', true),
('Acción', 'Figuras de acción y personajes.', true),
('Muñecas', 'Muñecas y accesorios.', true),
('Carritos', 'Carros, pistas y vehículos de juguete.', true),
('Didácticos', 'Juguetes educativos y didácticos.', true),
('Peluches', 'Peluches y muñecos suaves.', true),
('Otros', 'Productos sin categoría específica.', true)
on conflict (nombre) do update
set
    descripcion = excluded.descripcion,
    activo = true;

notify pgrst, 'reload schema';