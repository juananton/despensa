/**
 * El reloj de la despensa. Todo lo que necesite saber qué hora es pregunta
 * aquí en vez de a `Date.now()`, porque durante una pausa la despensa vive en
 * un instante congelado: el momento en que se pausó.
 *
 * Es estado de módulo y no de React a propósito. La hora no es de ningún
 * componente —la lee cada uno al pintar, como ya hacía antes— y meterla en el
 * árbol obligaría a repartirla por props hasta la última cuenta, que es justo
 * lo que ItemsContext evitó en su día para no acabar con dos relojes
 * desfasados haciendo la misma resta. Quien lo cambia es PantryContext, que al
 * hacerlo también actualiza su propio estado y provoca el repintado.
 *
 * El equivalente en el servidor es pantry_now() (migración 0006): los dos
 * tienen que dar la misma respuesta o un `+` pulsado durante la pausa se
 * contaría dos veces al reanudar.
 */

let frozenAt = null;

// `at` es la fecha de la pausa, o null/undefined para volver al reloj real.
export const freezeClock = at => {
	frozenAt = at ? new Date(at).getTime() : null;
};

export const now = () => frozenAt ?? Date.now();

export const isFrozen = () => frozenAt !== null;
