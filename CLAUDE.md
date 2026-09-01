# Despensa

App de despensa compartida: qué hay en casa, cuántos días queda de cada cosa y
un aviso al móvil cuando algo se está acabando. La usan dos personas desde sus
móviles **Android**, y eso es una premisa de diseño, no un detalle: es lo que
permitió descartar la PWA instalable (iOS la exige para los avisos push, Chrome
en Android no).

React + Vite + Supabase (Postgres, Auth, Realtime y Edge Functions). Se
despliega en Vercel.

## Comandos

```bash
npm run dev            # servidor de desarrollo
npm test               # node --test, sin dependencias ni compilación
npm run compile:sass   # sass en modo watch
npm run build
npm run lint
npm run format
```

**El CSS compilado está versionado.** `src/styles/css/index.css` se genera de
`src/styles/scss/` y se commitea; después de tocar un `.scss` hay que compilar,
o el cambio no llega a producción. El `compile:sass` del package.json va en
modo watch; para una pasada suelta:

```bash
npx sass src/styles/scss/index.scss src/styles/css/index.css
```

## El modelo de datos, en una idea

Cada artículo guarda **`depletes_at`, la fecha en la que se agota, y nada más**.
Los días restantes y las unidades se derivan de ella comparándola con el ahora;
no hay columna `units`, para que no pueda contradecir a la fecha. Casi todo lo
raro de este código sale de ahí:

- Los días son **horas exactas, no calendario**: `daysLeft = techo((depletes_at − ahora) / 24h)`. Un artículo creado a las 17:15 baja de unidad a las 17:15,
  no a medianoche, y cada uno tiene su propia hora de cambio.
- El ritmo de consumo son **dos enteros**, `units_per_cycle` y `cycle_days` ("N
  unidades cada M días"), no su cociente: así se puede escribir "2 unidades cada
  1 día" sin pedirle a nadie que ponga 0,5, y el formulario de edición devuelve
  lo que se escribió y no un 0,333.
- `unitsLeft` se calcula del tiempo restante **en crudo**, nunca desde
  `daysLeft`, que ya viene redondeado: encadenar los dos redondeos inventaba
  existencias (5 yogures a 2 al día salían 6).
- Sumar y restar unidades lo resuelve **`shift_units` en Postgres**, no el
  cliente. Es una operación relativa y atómica: si el cliente calculase la fecha
  y la escribiese como valor absoluto, dos `+` a la vez se pisarían y una compra
  se perdería.

`stock_events` registra cada `+` y `−` con una copia del ritmo del momento. Hoy
**nadie lee esa tabla**: existe para que los datos se vayan acumulando.

## El reloj y la pausa

La despensa se puede **parar durante una ausencia larga**, y la idea entera es
que mientras hay pausa **el "ahora" deja de ser el reloj y pasa a ser el
instante en que se pausó**. Como todo se deriva de comparar `depletes_at` con el
ahora, congelarlo congela la cuenta atrás sin tocar un dato; al reanudar, un
`update` desplaza todas las fechas por lo que haya durado la pausa.

Hay **dos relojes que tienen que dar la misma respuesta**:

| Dónde    | Quién                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cliente  | `src/lib/clock.js`, estado de módulo que sólo mueve `PantryContext`, y que es el valor por defecto de `daysLeft` / `unitsLeft` / `depletionFrom` |
| Postgres | `pantry_now()`, que es lo que usa `shift_units` en lugar de `now()`                                                                              |

Si se separan, un `+` pulsado durante la pausa se fecha con el reloj real y el
desplazamiento del reanudar le suma la ausencia por segunda vez. **Cualquier
código nuevo que necesite la hora debe pedírsela a uno de esos dos, nunca a
`Date.now()` ni a `now()`.**

Lo demás que conviene saber antes de tocarlo: `resume_pantry()` es plpgsql sólo
por el `for update`, que serializa al cron y a la app reanudando a la vez;
`resume_if_due()` existe para que "ha llegado el día de la vuelta" esté escrito
en un único sitio, y la llaman tanto el cliente al arrancar como la función de
avisos. La pausa modela **consumo, no caducidad**: al volver, el fresco dirá los
días que tenía, y es deliberado.

## Avisos push

Tres: resumen los lunes, aviso al bajar de `WARNING_DAYS` (4) y aviso al llegar
a 0. Los lunes va el resumen **en lugar de** los sueltos, no además. La decisión
de qué se envía vive en `supabase/functions/notify/notices.js` — JS puro y con
pruebas, para poder razonarlo sin base de datos ni servicio de push— y la
entrada/salida en `index.ts`. Con la despensa en pausa no se envía nada.

`urgency: 'high'` en los envíos **es obligatorio**: sin él, FCM puede retener el
mensaje hasta la siguiente ventana de mantenimiento en vez de despertar al
dispositivo, que era la causa de que un Samsung no entregara con la pantalla
bloqueada.

## Convenciones

- **Comentarios en español, y explican el porqué**, no el qué: la decisión que
  se tomó, la alternativa que se descartó y el fallo concreto que motivó algo.
  Si un cambio deja un comentario desactualizado, el comentario es parte del
  cambio.
- **Commits en inglés**, con cuerpo: qué problema resuelve, qué se decidió y qué
  se dejó fuera a propósito. Directo a `main`, sin ramas ni PRs.
- Tabs, comillas simples también en JSX, sin comas finales (ver `.prettierrc`).
- Los módulos de `src/lib/` que tienen pruebas **importan con extensión**
  (`'./constants.js'`): Vite resuelve sin ella, `node --test` no.
- Las migraciones van numeradas en `supabase/migrations/`, se escriben para
  poder **volver a ejecutarse enteras** (`create or replace`, `if not exists`,
  `on conflict do nothing`) y se pegan a mano en el SQL Editor.

## Trampas que ya han costado tiempo

- **Un `update` sin `WHERE` falla** con `21000 · UPDATE requires a WHERE clause`: Supabase activa la extensión `safeupdate` para los roles de la API.
  Afecta a los updates masivos a propósito, como el de `resume_pantry`. No salta
  al crear la función, sólo al ejecutarla.
- **No hay Supabase local**: `npm run dev` habla con la base de datos de verdad,
  así que una migración sin ejecutar se nota igual en local que en producción.
  Para saber si una función está publicada, un POST a
  `$VITE_SUPABASE_URL/rest/v1/rpc/<nombre>` con la publishable key: `PGRST202`
  es "no está".
- **Vercel despliega desde GitHub: sin `git push` no hay build nueva.** Al
  verificar un despliegue, pedir el HTML con `Cache-Control: no-cache` y
  comprobar que el hash del bundle ha cambiado; el CDN ya sirvió una vez la
  versión anterior y dio un falso positivo.
- **La Edge Function no viaja en el push**: se despliega aparte. Si se edita en
  el panel de Supabase, hay que pegar el fichero **entero** para que lo
  desplegado y el repo no diverjan.
- **Los avisos push necesitan https**, así que no se pueden probar desde el
  móvil contra el servidor de desarrollo por IP (`http://192.168.x.x:5173`):
  ahí `navigator.serviceWorker` no existe, `pushSupported()` da falso y la
  opción de activar avisos **desaparece del menú de ajustes** en vez de fallar.
  Para probarlos hay que ir a la web desplegada. `localhost` sí es contexto
  seguro, y por eso en el ordenador no se nota.
- **El login de Supabase impide probar la app desde un navegador automatizado.**
  La receta que funciona: una página temporal en la raíz (`algo-preview.html` +
  `src/dev-preview.jsx`) que monte el componente con contextos falsos, y
  borrarla al terminar. Comprobar siempre a **360px**, que es donde aprieta.
