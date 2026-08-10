-- Datos iniciales, equivalentes al data.json de json-server.
-- Opcional: ejecútalo sólo si quieres arrancar con la despensa ya poblada.
-- Las fechas se calculan desde el momento en que lo ejecutas.

-- El ritmo se guarda como "N unidades cada M días" desde la migración 0004.
-- Todos estos son del caso sencillo: una unidad cada M días.
insert into items (name, category, units_per_cycle, cycle_days, depletes_at)
select
	name,
	category,
	1,
	cycle_days,
	now() + (units * cycle_days) * interval '1 day'
from (
	values
		('Queso', 'Comida', 7, 1),
		('Aceite', 'Comida', 7, 2),
		('Lentejas', 'Comida', 5, 1),
		('Leche', 'Comida', 8, 3),
		('Lavavajillas', 'Limpieza', 30, 1),
		('Papel higiénico', 'Baño', 7, 6),
		('Pasta de dientes', 'Baño', 15, 2),
		('Detergente lavadora', 'Limpieza', 30, 1)
) as seed (name, category, cycle_days, units);
