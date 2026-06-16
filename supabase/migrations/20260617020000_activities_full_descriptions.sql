-- =============================================
-- Migration: Full long-form descriptions for extraescolars 2026-27
-- One activity per row, matched by title (idempotent on re-run).
-- Fills description_ca/es/en with the complete family-facing text.
-- Also fixes Anglès material note (50€ infantil / 65€ primària).
-- Detail page renders description with whitespace-pre-line, so the
-- section headers / bullet lines below keep their structure.
-- =============================================

-- ---------------------------------------------
-- 1) Multi-esport
-- ---------------------------------------------
UPDATE public.activities SET
  description_ca = 'Un esport diferent cada mes per descobrir-los tots

A Multi-esport el teu fill o filla no farà sempre el mateix esport. Cada mes en descobrirà un de nou: bàsquet, voleibol, atletisme, hoquei, bàdminton, futbol-sala, esports alternatius com l''ultimate o el kin-ball… fins a nou esports al llarg del curs. La idea és que cada infant pugui explorar moltes pràctiques, treballar habilitats motrius molt variades i, sobretot, descobrir què li agrada de veritat abans d''especialitzar-se en res.

Què hi farà el meu fill o filla?
Cada sessió de 90 minuts segueix una estructura clara: berenar i acollida, escalfament, treball tècnic i tàctic, joc d''aplicació i tornada a la calma. Treballem amb metodologia comprensiva: primer el joc, després la tècnica. Aprenen jugant, no exercitant.

Adaptat a cada edat
Tenim tres grups perquè cada etapa té les seves necessitats:
• Educació Infantil (dilluns): treball psicomotor amb molt joc i exploració del propi cos.
• Primària 1r–3r (dijous): introducció als esports adaptats i a les regles bàsiques amb format lúdic.
• Primària 4t–6è (dimarts): aprofundiment tècnic i tàctic, amb partits, lligues internes i sistemes de joc.

Què en treu el meu fill o filla?
• Una bateria àmplia d''experiències motrius i d''esports diferents.
• Hàbits saludables i amor pel moviment.
• Cooperació, joc net i gestió de la victòria i la derrota.
• Una pràctica esportiva amb la qual continuar més enllà de l''extraescolar.',
  description_es = 'Un deporte diferente cada mes para descubrirlos todos

En Multideporte tu hijo o hija no hará siempre el mismo deporte. Cada mes descubrirá uno nuevo: baloncesto, voleibol, atletismo, hockey, bádminton, fútbol-sala, deportes alternativos como el ultimate o el kin-ball… hasta nueve deportes a lo largo del curso. La idea es que cada niño pueda explorar muchas prácticas, trabajar habilidades motrices muy variadas y, sobre todo, descubrir qué le gusta de verdad antes de especializarse en nada.

¿Qué hará mi hijo o hija?
Cada sesión de 90 minutos sigue una estructura clara: merienda y acogida, calentamiento, trabajo técnico y táctico, juego de aplicación y vuelta a la calma. Trabajamos con metodología comprensiva: primero el juego, después la técnica. Aprenden jugando, no ejercitando.

Adaptado a cada edad
Tenemos tres grupos porque cada etapa tiene sus necesidades:
• Educación Infantil (lunes): trabajo psicomotor con mucho juego y exploración del propio cuerpo.
• Primaria 1º–3º (jueves): introducción a los deportes adaptados y a las reglas básicas con formato lúdico.
• Primaria 4º–6º (martes): profundización técnica y táctica, con partidos, ligas internas y sistemas de juego.

¿Qué saca mi hijo o hija?
• Un amplio abanico de experiencias motrices y de deportes diferentes.
• Hábitos saludables y amor por el movimiento.
• Cooperación, juego limpio y gestión de la victoria y la derrota.
• Una práctica deportiva con la que continuar más allá de la extraescolar.',
  description_en = 'A different sport every month to discover them all

In Multi-sport your child will not always do the same sport. Each month they discover a new one: basketball, volleyball, athletics, hockey, badminton, futsal, alternative sports such as ultimate or kin-ball… up to nine sports across the year. The idea is that every child can explore many practices, develop very varied motor skills and, above all, discover what they genuinely enjoy before specialising in anything.

What will my child do?
Each 90-minute session follows a clear structure: snack and welcome, warm-up, technical and tactical work, applied game and cool-down. We use a game-based approach: game first, technique after. They learn by playing, not by drilling.

Adapted to each age
We have three groups because each stage has its own needs:
• Pre-school (Monday): psychomotor work with lots of play and body exploration.
• Primary Y1–Y3 (Thursday): introduction to adapted sports and basic rules in a playful format.
• Primary Y4–Y6 (Tuesday): technical and tactical depth, with matches, internal leagues and game systems.

What does my child gain?
• A broad range of motor experiences and different sports.
• Healthy habits and a love of movement.
• Cooperation, fair play and handling both winning and losing.
• A sport they can keep doing beyond the after-school club.',
  description = 'Iniciación deportiva a través del juego: un deporte diferente cada mes para explorar habilidades motrices muy variadas y descubrir qué le gusta de verdad.'
WHERE title = 'Multi-esport';

-- ---------------------------------------------
-- 2) Petits artistes
-- ---------------------------------------------
UPDATE public.activities SET
  description_ca = 'Un espai per crear, expressar-se i descobrir el plaer del procés

A Petits Artistes els infants exploren cada mes una tècnica o un tema diferent: dibuix i pintura, manualitats amb elements de la natura, decoracions de Nadal, origami i paper maixé, expressió emocional amb colors, reciclatge creatiu, manualitats de Sant Jordi, modelatge i estampats… fins arribar a la mostra final al juny, on cada infant exposa les seves obres del curs a la família.

La nostra filosofia: el procés importa més que el resultat
No ensenyem a fer "obres maques". Ensenyem a gaudir creant, a perdre la por al full en blanc, a provar materials nous, a descobrir que cada infant té la seva pròpia veu artística. No avaluem si el dibuix "queda bonic"; avaluem la implicació, l''exploració i el creixement personal.

Materials accessibles i sostenibilitat
Bona part del material és reciclat (caixes, ampolles, mitjons vells, hueveres, revistes…) i el portem entre tots des de casa. La resta són materials estàndard d''escola: témperes, plastilina, ceres, cartolines. Cap infant queda fora per qüestions de pressupost.

Dos grups, dues etapes
• Educació Infantil (dimarts): treball més sensorial i de gran motricitat, amb molta exploració.
• Primària 1r–3r (dilluns): treball més fi, amb tècniques que requereixen una mica més de precisió.

Què en treu el meu fill o filla?
• Confiança en la seva pròpia creativitat.
• Desenvolupament de la motricitat fina (retallar, modelar, dibuixar).
• Capacitat d''expressar emocions amb mil llenguatges visuals.
• Sensibilitat artística i ganes de seguir creant a casa.
• Una carpeta-portfoli amb totes les seves obres del curs.',
  description_es = 'Un espacio para crear, expresarse y descubrir el placer del proceso

En Pequeños Artistas los niños exploran cada mes una técnica o un tema diferente: dibujo y pintura, manualidades con elementos de la naturaleza, decoraciones de Navidad, origami y papel maché, expresión emocional con colores, reciclaje creativo, manualidades de Sant Jordi, modelado y estampados… hasta llegar a la muestra final en junio, donde cada niño expone sus obras del curso a la familia.

Nuestra filosofía: el proceso importa más que el resultado
No enseñamos a hacer "obras bonitas". Enseñamos a disfrutar creando, a perder el miedo a la hoja en blanco, a probar materiales nuevos, a descubrir que cada niño tiene su propia voz artística. No evaluamos si el dibujo "queda bonito"; evaluamos la implicación, la exploración y el crecimiento personal.

Materiales accesibles y sostenibilidad
Buena parte del material es reciclado (cajas, botellas, calcetines viejos, hueveras, revistas…) y lo traemos entre todos desde casa. El resto son materiales estándar de escuela: témperas, plastilina, ceras, cartulinas. Ningún niño queda fuera por cuestiones de presupuesto.

Dos grupos, dos etapas
• Educación Infantil (martes): trabajo más sensorial y de gran motricidad, con mucha exploración.
• Primaria 1º–3º (lunes): trabajo más fino, con técnicas que requieren un poco más de precisión.

¿Qué saca mi hijo o hija?
• Confianza en su propia creatividad.
• Desarrollo de la motricidad fina (recortar, modelar, dibujar).
• Capacidad de expresar emociones con mil lenguajes visuales.
• Sensibilidad artística y ganas de seguir creando en casa.
• Una carpeta-portfolio con todas sus obras del curso.',
  description_en = 'A space to create, express yourself and discover the joy of the process

In Little Artists, each month the children explore a different technique or theme: drawing and painting, crafts with natural elements, Christmas decorations, origami and papier-mâché, emotional expression with colour, creative recycling, Sant Jordi crafts, modelling and printing… all the way to the final show in June, where each child exhibits their year''s work to their family.

Our philosophy: the process matters more than the result
We don''t teach how to make "pretty pieces". We teach how to enjoy creating, to lose the fear of the blank page, to try new materials, to discover that every child has their own artistic voice. We don''t assess whether the drawing "looks nice"; we value involvement, exploration and personal growth.

Accessible materials and sustainability
Much of the material is recycled (boxes, bottles, old socks, egg cartons, magazines…) and we bring it from home between everyone. The rest are standard school materials: tempera, modelling clay, crayons, card. No child is left out for budget reasons.

Two groups, two stages
• Pre-school (Tuesday): more sensory, gross-motor work with lots of exploration.
• Primary Y1–Y3 (Monday): finer work, with techniques that require a little more precision.

What does my child gain?
• Confidence in their own creativity.
• Development of fine motor skills (cutting, modelling, drawing).
• The ability to express emotions through a thousand visual languages.
• Artistic sensitivity and the urge to keep creating at home.
• A portfolio folder with all their work from the year.',
  description = 'Creatividad sin límites: cada mes una técnica diferente para crear, expresarse y disfrutar del proceso, hasta la muestra final de junio.'
WHERE title = 'Petits artistes';

-- ---------------------------------------------
-- 3) Dansa urbana (title column = 'Danza urbana')
-- ---------------------------------------------
UPDATE public.activities SET
  description_ca = 'Funky, hip-hop i moviment per a 4t, 5è i 6è

Si al teu fill o filla li agrada la música i no pot estar quiet o quieta, aquest és el seu espai. A Dansa Urbana descobreixen el seu cos com a instrument expressiu i aprenen els fonaments del funky i el hip-hop pas a pas: ritme, aïllaments corporals, passos clàssics, coreografies grupals i, finalment, el seu propi estil amb el freestyle.

El curs en tres fases
• Octubre–Desembre · Les bases: connectem amb el ritme, aprenem els aïllaments corporals (cap, espatlles, pit) i ballem la primera coreografia conjunta. Mostra de Nadal.
• Gener–Abril · Els estils: descobrim el funky (groove, ones corporals) i el hip-hop (bounce, running man, cabbage patch). Treballem en parelles, en grups petits i amb freestyle.
• Maig–Juny · La coreografia final: triem la cançó entre tots, aprenem la coreo, fem el vestuari fet a mà (DIY) i culminem amb el festival final amb famílies al juny.

La nostra filosofia: tots els cossos ballen
Aquí no hi ha prejudicis estètics ni comparacions. No cal saber ballar prèviament, no cal cap mena de roba especial, no cal "tenir un cos de ballarí" (cap n''hi ha!). Només cal voler-ho passar bé movent-se. A aquesta edat (9–12 anys) comença a aparèixer la timidesa pre-adolescent, i hi tenim cura especial: el monitor crea un clima segur on ningú se senti exposat ni jutjat.

Què en treu el meu fill o filla?
• Confiança en el propi cos i en l''expressió personal.
• Sentit del ritme, musicalitat i memòria motriu.
• Habilitats de treball en equip i sincronització grupal.
• Una experiència alegre amb la música i el moviment.
• Una mostra final per recordar amb la família.',
  description_es = 'Funky, hip-hop y movimiento para 4º, 5º y 6º

Si a tu hijo o hija le gusta la música y no puede estarse quieto o quieta, este es su espacio. En Danza Urbana descubren su cuerpo como instrumento expresivo y aprenden los fundamentos del funky y el hip-hop paso a paso: ritmo, aislamientos corporales, pasos clásicos, coreografías grupales y, finalmente, su propio estilo con el freestyle.

El curso en tres fases
• Octubre–Diciembre · Las bases: conectamos con el ritmo, aprendemos los aislamientos corporales (cabeza, hombros, pecho) y bailamos la primera coreografía conjunta. Muestra de Navidad.
• Enero–Abril · Los estilos: descubrimos el funky (groove, ondas corporales) y el hip-hop (bounce, running man, cabbage patch). Trabajamos en parejas, en grupos pequeños y con freestyle.
• Mayo–Junio · La coreografía final: elegimos la canción entre todos, aprendemos la coreo, hacemos el vestuario a mano (DIY) y culminamos con el festival final con familias en junio.

Nuestra filosofía: todos los cuerpos bailan
Aquí no hay prejuicios estéticos ni comparaciones. No hace falta saber bailar previamente, no hace falta ningún tipo de ropa especial, no hace falta "tener un cuerpo de bailarín" (¡no hay ninguno!). Solo hace falta querer pasarlo bien moviéndose. A esta edad (9–12 años) empieza a aparecer la timidez preadolescente, y la cuidamos especialmente: el monitor crea un clima seguro donde nadie se sienta expuesto ni juzgado.

¿Qué saca mi hijo o hija?
• Confianza en el propio cuerpo y en la expresión personal.
• Sentido del ritmo, musicalidad y memoria motriz.
• Habilidades de trabajo en equipo y sincronización grupal.
• Una experiencia alegre con la música y el movimiento.
• Una muestra final para recordar con la familia.',
  description_en = 'Funky, hip-hop and movement for Years 4, 5 and 6

If your child loves music and can''t sit still, this is their place. In Urban Dance they discover their body as an expressive instrument and learn the fundamentals of funky and hip-hop step by step: rhythm, body isolations, classic moves, group choreographies and, finally, their own style through freestyle.

The year in three phases
• October–December · The basics: we connect with the rhythm, learn body isolations (head, shoulders, chest) and dance the first joint choreography. Christmas show.
• January–April · The styles: we discover funky (groove, body waves) and hip-hop (bounce, running man, cabbage patch). We work in pairs, in small groups and with freestyle.
• May–June · The final choreography: we choose the song together, learn the routine, make the costumes by hand (DIY) and finish with the final festival with families in June.

Our philosophy: every body dances
There are no aesthetic prejudices or comparisons here. You don''t need prior dance experience, you don''t need any special clothing, you don''t need to "have a dancer''s body" (there''s no such thing!). You just need to want to have fun moving. At this age (9–12) pre-teen shyness starts to appear, and we take special care of it: the instructor creates a safe atmosphere where no one feels exposed or judged.

What does my child gain?
• Confidence in their own body and personal expression.
• A sense of rhythm, musicality and motor memory.
• Teamwork skills and group synchronisation.
• A joyful experience with music and movement.
• A final show to remember with the family.',
  description = 'Ritmo, expresión y coreografías de funky y hip-hop para 4º, 5º y 6º: descubrir el cuerpo como instrumento y ganar confianza, hasta el festival final.'
WHERE title = 'Danza urbana';

-- ---------------------------------------------
-- 4) Anglès (id 6) — full description + material fix (50€ infantil / 65€ primària)
-- ---------------------------------------------
UPDATE public.activities SET
  description_ca = 'Aprendre anglès, parlant anglès

L''activitat d''anglès la imparteix Halo English, una acadèmia especialitzada amb anys d''experiència ensenyant anglès a infants i adolescents. Els seus professors qualificats venen al centre per fer les classes amb una filosofia clara que defineix tot el seu mètode: "no són classes d''anglès, són EN anglès". Tota la sessió es desenvolupa en la llengua, perquè és l''única manera real d''aprendre-la.

Una metodologia adaptada a cada edat
A Educació Infantil treballen amb el programa Halo Kids, on els més petits descobreixen l''anglès de la mà de les mascotes de l''acadèmia (Ollie, Polly, Amanda, Tinna i Tommy). A partir de Primària, les sessions guanyen estructura però mantenen el caràcter dinàmic i participatiu.

L''acadèmia treballa amb la teoria de les intel·ligències múltiples, que vol dir que a cada classe es combinen recursos molt diferents per arribar a tots els tipus d''aprenents:
• Cançons i balls (musical)
• Jocs de lògica i deducció (matemàtica)
• Treball en parelles i en grup (interpersonal)
• Activitats psicomotrius (corporal)
• Manualitats i tallers creatius (espacial i creativa)
• Gramàtica progressiva (lingüística), perquè sense ella no es pot avançar

Tres grups, tres etapes
• Educació Infantil (dimecres): primer contacte amb l''anglès a través del joc, la cançó i les mascotes.
• Primària 1r–3r (dimarts): consolidació del vocabulari bàsic, primeres estructures gramaticals i lectura senzilla.
• Primària 4t–6è (dijous): treball més avançat de gramàtica, expressió oral i preparació per als nivells oficials. Possibilitat d''un segon dia setmanal a sol·licitud de la família.

Què en treu el meu fill o filla?
• Una segona llengua viva, no una assignatura.
• Pèrdua de la por a parlar en anglès des de petit/a.
• Base sòlida que facilita molt l''aprenentatge a Secundària.
• Possibilitat futura de preparar exàmens oficials (Cambridge, Trinity), amb 100% d''aprovats històrics a l''acadèmia.

Material i quota
L''activitat d''anglès té una quota mensual diferent de la resta (39 € per un dia setmanal · 56 € per dos dies) i un material didàctic propi que inclou els llibres oficials del nivell: 50 € anuals a Educació Infantil i 65 € anuals a Primària.',
  description_es = 'Aprender inglés, hablando inglés

La actividad de inglés la imparte Halo English, una academia especializada con años de experiencia enseñando inglés a niños y adolescentes. Sus profesores cualificados vienen al centro para dar las clases con una filosofía clara que define todo su método: "no son clases de inglés, son EN inglés". Toda la sesión se desarrolla en la lengua, porque es la única manera real de aprenderla.

Una metodología adaptada a cada edad
En Educación Infantil trabajan con el programa Halo Kids, donde los más pequeños descubren el inglés de la mano de las mascotas de la academia (Ollie, Polly, Amanda, Tinna y Tommy). A partir de Primaria, las sesiones ganan estructura pero mantienen el carácter dinámico y participativo.

La academia trabaja con la teoría de las inteligencias múltiples, que significa que en cada clase se combinan recursos muy diferentes para llegar a todos los tipos de aprendices:
• Canciones y bailes (musical)
• Juegos de lógica y deducción (matemática)
• Trabajo en parejas y en grupo (interpersonal)
• Actividades psicomotrices (corporal)
• Manualidades y talleres creativos (espacial y creativa)
• Gramática progresiva (lingüística), porque sin ella no se puede avanzar

Tres grupos, tres etapas
• Educación Infantil (miércoles): primer contacto con el inglés a través del juego, la canción y las mascotas.
• Primaria 1º–3º (martes): consolidación del vocabulario básico, primeras estructuras gramaticales y lectura sencilla.
• Primaria 4º–6º (jueves): trabajo más avanzado de gramática, expresión oral y preparación para los niveles oficiales. Posibilidad de un segundo día semanal a solicitud de la familia.

¿Qué saca mi hijo o hija?
• Una segunda lengua viva, no una asignatura.
• Pérdida del miedo a hablar en inglés desde pequeño/a.
• Base sólida que facilita mucho el aprendizaje en Secundaria.
• Posibilidad futura de preparar exámenes oficiales (Cambridge, Trinity), con 100% de aprobados históricos en la academia.

Material y cuota
La actividad de inglés tiene una cuota mensual diferente del resto (39 € por un día semanal · 56 € por dos días) y un material didáctico propio que incluye los libros oficiales del nivel: 50 € anuales en Educación Infantil y 65 € anuales en Primaria.',
  description_en = 'Learning English, by speaking English

English is taught by Halo English, a specialised academy with years of experience teaching English to children and teenagers. Their qualified teachers come to the school with a clear philosophy that defines their whole method: "these aren''t English classes, they''re classes IN English". The entire session runs in the language, because it''s the only real way to learn it.

A methodology adapted to each age
In Pre-school they use the Halo Kids programme, where the youngest discover English with the academy''s mascots (Ollie, Polly, Amanda, Tinna and Tommy). From Primary onwards, the sessions gain structure while keeping their dynamic, participatory character.

The academy works with the theory of multiple intelligences, which means each class combines very different resources to reach every type of learner:
• Songs and dances (musical)
• Logic and deduction games (mathematical)
• Pair and group work (interpersonal)
• Psychomotor activities (bodily)
• Crafts and creative workshops (spatial and creative)
• Progressive grammar (linguistic), because without it you can''t move forward

Three groups, three stages
• Pre-school (Wednesday): first contact with English through play, song and the mascots.
• Primary Y1–Y3 (Tuesday): consolidation of basic vocabulary, first grammar structures and simple reading.
• Primary Y4–Y6 (Thursday): more advanced grammar, speaking and preparation for official levels. A second weekly day is possible on family request.

What does my child gain?
• A living second language, not a school subject.
• Losing the fear of speaking English from an early age.
• A solid base that makes learning much easier in Secondary.
• The future option to prepare official exams (Cambridge, Trinity), with a historic 100% pass rate at the academy.

Materials and fee
English has a different monthly fee from the rest (€39 for one day a week · €56 for two days) and its own teaching material including the official course books: €50/year in Pre-school and €65/year in Primary.',
  description = 'Inglés EN inglés con la academia Halo English: grupos por etapa, metodología comunicativa y de inteligencias múltiples, hasta preparar exámenes oficiales.',
  important_note = 'L''imparteix l''acadèmia externa Halo English: els pagaments i el material es gestionen directament amb l''acadèmia. Quota: 39€/mes (1 dia) o 56€/mes (2 dies). Material didàctic: 50€/any a Infantil i 65€/any a Primària. El segon dia setmanal només per a 4t, 5è i 6è, pendent de sol·licitud.',
  important_note_ca = 'L''imparteix l''acadèmia externa Halo English: els pagaments i el material es gestionen directament amb l''acadèmia. Quota: 39€/mes (1 dia) o 56€/mes (2 dies). Material didàctic: 50€/any a Infantil i 65€/any a Primària. El segon dia setmanal només per a 4t, 5è i 6è, pendent de sol·licitud.',
  important_note_es = 'La imparte la academia externa Halo English: los pagos y el material se gestionan directamente con la academia. Cuota: 39€/mes (1 día) o 56€/mes (2 días). Material didáctico: 50€/año en Infantil y 65€/año en Primaria. El segundo día semanal solo para 4º, 5º y 6º, pendiente de solicitud.',
  important_note_en = 'Taught by the external academy Halo English: payments and materials are handled directly with the academy. Fee: €39/month (1 day) or €56/month (2 days). Teaching material: €50/year in Pre-school and €65/year in Primary. The second weekly day is only for Years 4-6, subject to request.'
WHERE id = 6 OR title = 'Anglès';

-- ---------------------------------------------
-- 5) Patinatge (id 7)
-- ---------------------------------------------
UPDATE public.activities SET
  description_ca = 'Sobre rodes, descobrint l''equilibri i la velocitat

El patinatge és una de les extraescolars més estimulants per als infants: combina equilibri, coordinació, força i diversió pura. A diferència d''altres activitats, aquí el cos ha d''aprendre a moure''s sobre una superfície que llisca, i això desperta unes habilitats motrius que poques pràctiques treballen.

Què hi farà el meu fill o filla?
Les sessions estan estructurades amb una progressió clara segons el nivell de cada infant. Ningú comença "sabent patinar"; tothom és benvingut, també si no ha portat mai uns patins als peus.

Fonaments (primeres setmanes):
• Postura bàsica i com aixecar-se quan cau
• Marxa i lliscament suau
• Frenades segures (en T, en V, amb tac)

Tècnica progressiva:
• Girs en una i altra direcció
• Creuaments de peus
• Canvis de direcció i de ritme
• Patinatge cap enrere

Aplicació lúdica:
• Circuits d''habilitat (eslàlom, salts petits sobre cons)
• Jocs col·lectius sobre patins (relleus, "pilla-pilla", recorreguts cronometrats)
• Coreografies senzilles en grup

Adaptat a cada grup
• Primària 1r–3r (dimecres): introducció amb molt de joc i progressió suau. L''equilibri és el gran objectiu del primer trimestre.
• Primària 4t–6è (dimecres): consolidació de la tècnica, habilitats més complexes i jocs col·lectius més dinàmics.

Seguretat: punt no negociable
Els patins van acompanyats sempre de l''equipament de protecció complet: casc, genolleres, colzeres i canyelleres. No es comença cap sessió sense això. El monitor revisa l''equipament a l''inici i corregeix la postura per prevenir caigudes.

Què en treu el meu fill o filla?
• Equilibri i coordinació excepcionals, que es transfereixen a moltes altres activitats (anar amb bicicleta, esquiar, esports d''equip).
• Força a les cames i resistència cardiovascular.
• Confiança en el propi cos i superació de la por a caure.
• Una habilitat per a tota la vida que pot continuar gaudint en família o amb amics.

Material necessari
Cada infant necessita els seus propis patins en línia (o de quatre rodes, segons preferència familiar) i l''equipament de protecció complet. Es poden trobar en botigues d''esports o de segona mà; el monitor pot orientar les famílies que ho necessitin. Els patins han d''estar en bon estat (revisar rodes i ajustos) abans de cada trimestre.',
  description_es = 'Sobre ruedas, descubriendo el equilibrio y la velocidad

El patinaje es una de las extraescolares más estimulantes para los niños: combina equilibrio, coordinación, fuerza y diversión pura. A diferencia de otras actividades, aquí el cuerpo debe aprender a moverse sobre una superficie que desliza, y eso despierta unas habilidades motrices que pocas prácticas trabajan.

¿Qué hará mi hijo o hija?
Las sesiones están estructuradas con una progresión clara según el nivel de cada niño. Nadie empieza "sabiendo patinar"; todos son bienvenidos, también si no se han puesto nunca unos patines.

Fundamentos (primeras semanas):
• Postura básica y cómo levantarse al caer
• Marcha y deslizamiento suave
• Frenadas seguras (en T, en V, con taco)

Técnica progresiva:
• Giros en una y otra dirección
• Cruces de pies
• Cambios de dirección y de ritmo
• Patinaje hacia atrás

Aplicación lúdica:
• Circuitos de habilidad (eslalon, saltos pequeños sobre conos)
• Juegos colectivos sobre patines (relevos, "pilla-pilla", recorridos cronometrados)
• Coreografías sencillas en grupo

Adaptado a cada grupo
• Primaria 1º–3º (miércoles): introducción con mucho juego y progresión suave. El equilibrio es el gran objetivo del primer trimestre.
• Primaria 4º–6º (miércoles): consolidación de la técnica, habilidades más complejas y juegos colectivos más dinámicos.

Seguridad: punto no negociable
Los patines van acompañados siempre del equipo de protección completo: casco, rodilleras, coderas y espinilleras. No se empieza ninguna sesión sin esto. El monitor revisa el equipo al inicio y corrige la postura para prevenir caídas.

¿Qué saca mi hijo o hija?
• Equilibrio y coordinación excepcionales, que se transfieren a muchas otras actividades (ir en bici, esquiar, deportes de equipo).
• Fuerza en las piernas y resistencia cardiovascular.
• Confianza en el propio cuerpo y superación del miedo a caer.
• Una habilidad para toda la vida que puede seguir disfrutando en familia o con amigos.

Material necesario
Cada niño necesita sus propios patines en línea (o de cuatro ruedas, según preferencia familiar) y el equipo de protección completo. Se pueden encontrar en tiendas de deporte o de segunda mano; el monitor puede orientar a las familias que lo necesiten. Los patines deben estar en buen estado (revisar ruedas y ajustes) antes de cada trimestre.',
  description_en = 'On wheels, discovering balance and speed

Skating is one of the most stimulating after-school activities for children: it combines balance, coordination, strength and pure fun. Unlike other activities, here the body has to learn to move on a sliding surface, which awakens motor skills that few practices develop.

What will my child do?
Sessions are structured with a clear progression according to each child''s level. Nobody starts "knowing how to skate"; everyone is welcome, even if they''ve never put on skates.

Fundamentals (first weeks):
• Basic stance and how to get up after a fall
• Walking and gentle gliding
• Safe braking (T-stop, V-stop, toe stop)

Progressive technique:
• Turns in both directions
• Crossovers
• Changes of direction and pace
• Skating backwards

Playful application:
• Skill circuits (slalom, small jumps over cones)
• Group games on skates (relays, tag, timed routes)
• Simple group choreographies

Adapted to each group
• Primary Y1–Y3 (Wednesday): introduction with lots of play and gentle progression. Balance is the main goal of the first term.
• Primary Y4–Y6 (Wednesday): consolidating technique, more complex skills and more dynamic group games.

Safety: non-negotiable
Skates always come with the full protective gear: helmet, knee pads, elbow pads and shin guards. No session starts without it. The instructor checks the gear at the start and corrects posture to prevent falls.

What does my child gain?
• Exceptional balance and coordination that transfer to many other activities (cycling, skiing, team sports).
• Leg strength and cardiovascular endurance.
• Confidence in their own body and overcoming the fear of falling.
• A lifelong skill they can keep enjoying with family or friends.

Material needed
Each child needs their own inline skates (or quad skates, depending on family preference) and the full protective gear. They can be found in sports shops or second-hand; the instructor can advise families who need it. Skates must be in good condition (check wheels and fastenings) before each term.',
  description = 'Patinaje sobre ruedas con progresión por niveles: equilibrio, técnica y juegos sobre patines. Protección completa obligatoria (casco, rodilleras, coderas y espinilleras).'
WHERE id = 7 OR title = 'Patinatge';
