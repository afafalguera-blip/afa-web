# Acollida: qué decidimos el 5 y 6 de septiembre de 2026

Este documento recoge una tarde de trabajo sobre el servicio de acollida: los
problemas que aparecieron al probarlo con datos reales, cómo se resolvieron,
las decisiones que se tomaron y las que siguen abiertas.

Está pensado para llevarlo a una reunión de la AFA: la sección de
[preguntas abiertas](#preguntas-para-la-afa) es la que necesita respuesta de
personas, no de código.

---

## De dónde veníamos

La inscripción a la acollida vivía en el motor genérico de formularios. Ese
motor guarda las respuestas **en el idioma en que la familia rellenó el
formulario**, así que en producción convivían «Tot el període» y
«Todo el periodo » como dos respuestas distintas a la misma pregunta. Sin
código de curso, sin enlace con los recibos, y con cero filas en `payments` con
concepto `acollida`.

Consecuencia práctica: no se podía contar cuántos niños venían un martes, ni
filtrar por franja, ni generar un recibo sin teclearlo a mano.

---

## Problemas encontrados y cómo se resolvieron

### 1. Las respuestas no se podían contar

**Problema.** Texto libre en tres idiomas mezclados.

**Solución.** Módulo propio con tabla `acollida_inscripcions`, **una fila por
niño**, con valores canónicos: curso como código (`I3`…`6PRI`), días de la
semana como enteros 1-5, modalidad y estado acotados. El idioma del visitante
decide qué se muestra, nunca qué se guarda.

De paso se arregló el motor genérico para todos los formularios: ahora envía el
valor de la opción en castellano y lo traduce al mostrarlo, de modo que las
respuestas antiguas caen bajo la misma etiqueta.

### 2. Los días sueltos costaban más que el mes entero

**Problema.** Franja de 7:30-9H para familia socia: 10 €/día contra 64 €/mes.
Una familia que marcaba los **13 días** que de verdad necesitaba recibía un
recibo de **130 €** — el doble de lo que cuesta el mes completo. La aritmética
castigaba la respuesta sincera.

**Solución.** El importe de los días sueltos se topa en la cuota mensual, y el
tope vive en los **dos** sitios donde se decide un precio: el formulario
(`occasionalCharge`) y la base de datos. Lo que la familia lee al apuntarse es
lo que dirá el recibo.

Efecto real sobre la única solicitud que había: **de 63 € a 46 €**.

### 3. El calendario se cerraba en cada día

**Problema.** Un `<input type="date">` nativo: elegir ocho días obligaba a abrir
ocho veces el mismo calendario, y los días ya elegidos no se veían mientras se
elegía el siguiente.

**Solución.** Calendario siempre abierto, de lunes a viernes (la acollida no
abre el fin de semana), con los días pasados bloqueados, contador y navegación
entre meses.

### 4. Añadir un hermano obligaba a repetirlo todo

**Problema.** Los datos de contacto ya se pedían una sola vez, pero el segundo
niño empezaba en blanco: había que volver a elegir franja, modalidad y días.

**Solución.** El segundo y tercer hijo **nacen copiados del anterior** (misma
franja, misma modalidad, mismos días), con el nombre y el curso —lo único que
de verdad cambia— por rellenar, y un aviso de qué se ha copiado.

### 5. Nada contaba las plazas

**Problema.** El servicio tiene 10 plazas y el formulario aceptaba solicitudes
sin mirar cuánta gente había ya ese día.

**Solución.** Aforo real, con una decisión de fondo: **las 10 plazas son de la
sala, no de la franja**. Las tres franjas de mañana acaban a las 9H, así que
entre las 8:30 y las 9 están las tres a la vez; contar 10 por franja habría
dejado entrar a 30 niños. Mensuales y días sueltos suman en el mismo contador,
día a día.

Los días llenos salen tachados en el formulario y quien los pide entra en lista
de espera.

### 6. El calendario escolar no existía para el sistema

**Problema.** La rejilla contaba el 25 de diciembre como un día normal y el
formulario dejaba pedir plaza para un día sin servicio.

**Solución.** Tabla `school_closed_days`, **del centro y no de la acollida**
(el mismo día cerrado vale para el menjador y las extraescolars). Un día cerrado
desaparece de la ocupación —no es «0/10», es que no hay servicio— y el
formulario lo rechaza aunque se envíe a mano.

Cargadas las seis fechas que el calendario 2026/27 dice por escrito. Las
vacaciones van pintadas en color en el PDF y **no se cargaron para no
adivinarlas**: ver [preguntas](#preguntas-para-la-afa).

### 7. Dos preguntas de días que parecían la misma

**Problema.** La familia leía «¿qué días?» dos veces en dos formatos, sin saber
que una decide el precio y la otra no. Y la etiqueta *Cada mes / Días sueltos*
sonaba a forma de pago.

**Solución.** La pregunta pasa a ser **«cada cuánto vendrá»**, con lo que de
verdad las separa: la mensual se renueva sola y guarda la plaza; la de días
sueltos caduca con las fechas marcadas. Y bajo los días de la semana, la línea
que faltaba: la cuota es la misma marcando dos días que cinco; se piden para
saber cuántos niños habrá cada día y para reservar la plaza.

### 8. Nadie avisaba a quien subía de la lista de espera

**Problema.** Al decidir que las plazas se dan por orden de llegada y la cola
avanza sola, apareció un momento que antes no existía: una familia puede pasar
de la lista de espera a tener plaza **sin que nadie escriba nada**.

**Solución.** Correos automáticos en los tres momentos: plaza confirmada,
entrada en la cola, y el salto de la cola a la plaza. Los hermanos de un mismo
envío reciben **un solo correo**, y si uno entra y otro se queda en la cola, el
correo lo dice y marca el estado de cada niño.

### 9. Los niños no existían en ninguna parte

**Problema.** Vivían dentro de cada inscripción —las extraescolares en un JSONB,
la acollida una fila por niño— y en los recibos solo había un nombre escrito a
mano. El mismo niño eran tres textos que nadie podía cruzar.

**Solución.** Censo (`children`), que **se llenó solo con lo que ya había: 81
niños**. Encima se puede volcar la lista completa de la escuela en CSV, y
reimportarla actualiza en vez de duplicar.

### 10. La monitora no tenía forma de pasar lista

**Solución.** Pantalla de móvil en `/acollida/llista/<token>`: los niños
esperados ese día ya listados, un toque marca y otro desmarca, guardado al
instante, y un buscador para quien aparece sin estar apuntado.

### 11. El sistema no sabía lo que cuesta el servicio

**Problema.** El monitoraje de la mañana cuesta **500 € al mes con ratio fijo**:
vale lo mismo vengan diez niños o dos. La rejilla decía cuántas plazas quedaban
libres, pero no que cada plaza vacía son 2,50 € que nadie paga.

**Solución.** El coste entra en el sistema y la pestaña *Ocupació* responde la
pregunta que decide si el servicio sigue: **este mes, ¿lo confirmado paga lo que
cuesta?** Con porcentaje, barra y cuántas cuotas mensuales faltarían.

---

## Decisiones tomadas

| Decisión | Qué se acordó |
|---|---|
| **Tope de precio** | Los días sueltos nunca cuestan más que la cuota mensual de su franja. |
| **Aforo** | 10 plazas **por sala**, no por franja. Las tres de mañana comparten sala. |
| **Días llenos** | Se bloquean en el formulario y quien los pide entra en lista de espera. |
| **Reparto de plazas** | **Orden de llegada y aprobación automática.** Nadie confirma a mano. |
| **Avisos** | Correo automático en los tres momentos (plaza, cola, salto de la cola). |
| **Censo** | De **todos los niños de la escuela**, no solo los de acollida. |
| **Acceso de la monitora** | Enlace secreto sin contraseña, revocable. |
| **Cobro con lista** | Cuota fija + días extra realmente asistidos. |
| **Diferencial socio** | Se mantiene: el no socio paga más por día, como impulso a asociarse. |

### Consecuencias que conviene tener presentes

- **Nadie revisa antes de dar la plaza.** Lo que la familia escriba es lo que
  queda: un curso mal elegido o una franja equivocada ocupan sitio hasta que
  alguien lo corrija desde el panel.
- **Una solicitud pendiente no reserva nada.** Solo las confirmadas ocupan
  plaza, y con la aprobación automática la confirmación es instantánea si hay
  sitio.
- **Para dejar entrar una excepción se suben las plazas de la sala**, no se
  salta el límite. Así queda escrito que aquel día hubo once.
- **Si en todo un mes no se pasa lista de un niño, se le cobra lo que pidió.**
  Un mes sin pasar lista no puede convertirse en un mes sin cobrar.
- **Quien viene sin haberlo pedido no genera recibo solo.** Sale en una lista
  aparte, porque de un niño sin inscripción no sabemos ni la franja ni si la
  familia es socia.

---

## Los números de referencia

### Tarifas vigentes

| Franja | Socios / mes | Socios / día | No socios / mes | No socios / día |
|---|---|---|---|---|
| 7:30 a 9:00 | 64 € | 10 € | 68 € | 14 € |
| 8:00 a 9:00 | 46 € | 7 € | 50 € | 11 € |
| 8:30 a 9:00 | 27 € | 4 € | 31 € | 8 € |
| 15:25 a 16:25 · junio | 30 € | 4,50 € | 40 € | 6,50 € |
| 15:25 a 16:25 · septiembre | 15 € | 4,50 € | 20 € | 6,50 € |

### Economía del servicio de mañana

| Concepto | Valor |
|---|---|
| Coste mensual (ratio fijo) | **500 €** |
| Plazas-día al mes (10 × ~20 días) | 200 |
| **Coste por plaza y día** | **2,50 €** |
| Cuotas socias de 7:30 para cubrirlo | **8** |
| 10 plazas llenas de 7:30 socias | 640 € → +140 € |
| 10 plazas llenas de 8-9H socias | 460 € → −40 € |
| 10 plazas llenas de 8:30-9H socias | 270 € → −230 € |

**El servicio solo se sostiene con la franja larga.** Las cortas no lo cubren ni
llenas: viven del margen de las de 7:30.

### Propuesta de bajada del día suelto (sin decidir)

El argumento no es teórico: **las franjas de tarde ya cobran el día suelto a
1,5 veces el prorrateo, y las de mañana al triple**. La propuesta aplica a las
mañanas un criterio intermedio (×2), manteniendo el diferencial de socio:

| Franja | Día hoy | Propuesto | Se topa a los |
|---|---|---|---|
| 7:30-9H · socia | 10 € | 6,50 € | 10 días |
| 7:30-9H · no socia | 14 € | 9,50 € | 8 días |
| 8-9H · socia | 7 € | 4,50 € | 11 días |
| 8-9H · no socia | 11 € | 7 € | 8 días |
| 8:30-9H · socia | 4 € | 3 € | 9 días |
| 8:30-9H · no socia | 8 € | 4,50 € | 7 días |

Se lee solo: *«si vienes medio mes, pagas el mes»* para socios; *«a partir de una
semana y media»* para no socios.

Con el tope ya en marcha, bajar el día **no puede hundir los ingresos**: quien
viene muchos días paga la cuota igual. Solo cambia el tramo de 1 a 9 días, que
es justo el uso que hoy no compensa pedir, y el coste marginal de un niño más en
un día con plazas libres es prácticamente cero.

---

## Preguntas para la AFA

### Urgentes — afectan a familias que ya se están apuntando

1. **Las cuatro fechas que faltan del calendario.** Primer y último día de
   clase, vacaciones de Navidad y Semana Santa. Van pintadas en color en el PDF
   del centro y no se pueden leer sin adivinar. Mientras no estén, el sistema
   deja pedir plaza para el 25 de diciembre.

2. **¿Hay descuento por hermanos?** Hoy se cobra cuota completa por niño: una
   familia con dos hijos en la franja de 8-9H paga 92 € al mes siendo socia. Si
   se quiere descuento, hace falta decidir **cuánto y desde qué hijo**.

3. **¿Bajamos el precio del día suelto?** Ver la propuesta de arriba. Conviene
   decidir si se hace ya o se espera al primer trimestre con datos de uso reales.

### Importantes — de gestión

4. **¿Los 500 € cubren toda la mañana o solo la franja de 7:30?** Toda la
   economía del servicio depende de esto. El sistema tiene el coste como dato
   editable, así que se corrige en un minuto, pero la tabla de arriba cambia si
   la respuesta es «solo la franja larga».

5. **¿Cuánto cuesta la sala de tarde?** Está a 0 € en el sistema, así que su
   cobertura no se calcula.

6. **¿El aforo de tarde también es de 10 plazas?** Se puso igual que el de
   mañana por no tener otro dato.

7. **¿Qué se hace si un niño se da de baja a mitad de mes?** Hoy la cuota
   mensual se cobra entera.

8. **¿Está bien que el recibo venza el día 10?** Se heredó de los generadores de
   extraescolares sin discutirlo.

### De fondo — para cuando haya datos

9. **¿El margen de la acollida financia algo más?** Si la cuota sostiene otras
   actividades, el precio actual del día suelto puede ser deliberado y bajarlo
   quitaría fondos.

10. **¿Qué hacemos si en octubre no llegamos a las ocho cuotas largas?** Con 500 €
    comprometidos al mes, esa es la pregunta que decide si el servicio se
    sostiene, y ahora la pestaña *Ocupació* la responde sola cada mes.

---

## Estado del sistema

Todo lo descrito está **en producción**, en nueve PRs (#33 a #41) con la suite
en verde (338 tests) y las migraciones aplicadas y verificadas contra la base
real.

Dónde está cada cosa:

- **Familias**: `afafalguera.com/acollida/inscripcio`
- **Monitoraje**: `/acollida/llista/<token>` (el enlace se genera en el panel)
- **Panel**: `/admin/acollida`, con las pestañas *Sol·licituds*, *Ocupació*,
  *Cens i llistes*, *Calendari escolar* y *Tarifes*

Pendiente de hacer, no de decidir:

- Cargar la lista completa de niños de la escuela (CSV).
- Generar el enlace de la monitora.
- Revisar los niños repetidos que el censo detectó: vienen de inscripciones de
  cursos distintos y la pestaña los señala.
