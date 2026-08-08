-- Datos iniciales, equivalentes al data.json de json-server.
-- Opcional: ejecútalo sólo si quieres arrancar con la despensa ya poblada.
-- Las fechas se calculan desde el momento en que lo ejecutas.

insert into items (name, category, days_per_unit, depletes_at)
select
	name,
	category,
	days_per_unit,
	now() + (units * days_per_unit) * interval '1 day'
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
) as seed (name, category, days_per_unit, units);
