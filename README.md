# Misión Unidad: Laboratorio de Conversiones Físicas

Juego educativo web para aprender y practicar conversiones de unidades de cantidades físicas.
**10 niveles · 100 actividades · retroalimentación explicada en cada respuesta.**

Dirigido a estudiantes de escuela intermedia, escuela superior y primeros cursos universitarios de ciencias.

> **Jugar en línea:** una vez activado GitHub Pages, el juego queda disponible en
> <https://ricardojuanmorales.github.io/mision-unidad/>
>
> También puedes generar un archivo HTML único (`npm run build:single`) que se abre con
> doble clic, sin servidor ni conexión.

---

## Propósito educativo

La mayoría de los ejercicios de conversión se limitan a decir "correcto" o "incorrecto". Este juego parte de una premisa distinta: **el momento en que se aprende no es el de responder, sino el de entender por qué**.

Por eso, después de cada actividad —acierte o falle el estudiante— aparece siempre:

1. Si la respuesta fue correcta o incorrecta (con icono y texto, nunca solo color).
2. La respuesta correcta con su unidad.
3. El procedimiento paso a paso.
4. El factor de conversión o la fórmula empleada.
5. Una explicación del fenómeno físico detrás del cálculo.
6. Una frase de reflexión científica.

Cuando la respuesta numérica falla, el juego además **diagnostica el error**: detecta si se multiplicó donde había que dividir, si el desvío es un factor 3.6 (el puente m/s ↔ km/h) o si simplemente fue un redondeo. Nombrar el error enseña más que corregirlo.

### Progresión cognitiva

Los niveles avanzan por la taxonomía de Bloom, y cada actividad declara su nivel cognitivo predominante:

| Etapa | Dónde aparece principalmente |
|---|---|
| Recordar unidades | Niveles 1–3 |
| Comprender equivalencias | Niveles 1–4 |
| Aplicar factores de conversión | Niveles 2–7 |
| Analizar conversiones compuestas | Niveles 4–9 |
| Evaluar la razonabilidad de un resultado | Niveles 5–10 |
| Crear estrategias de resolución | Niveles 8–10 |

---

## Instalación

Requiere [Node.js](https://nodejs.org) 18 o superior.

```bash
cd mision-unidad
npm install
```

## Ejecución

```bash
npm run dev
```

Abre la dirección que muestra la terminal (normalmente `http://localhost:5173`).

## Compilación

```bash
npm run build          # genera dist/ (despliegue web normal)
npm run build:single   # genera dist-single/index.html, un solo archivo autocontenido
```

El archivo de `dist-single/` incluye **todo** (HTML, CSS y JavaScript) en un único documento. Se puede abrir con doble clic, enviar por correo o subir a una plataforma escolar sin servidor ni instalación. Es la forma más práctica de repartirlo entre estudiantes.

## Pruebas

```bash
npm test          # ejecuta las 375 pruebas
npm run typecheck # verifica los tipos sin compilar
```

---

## Los 10 niveles

| # | Nivel | Unidades | Idea central |
|---|---|---|---|
| 1 | Longitud cotidiana | mm, cm, m, km, in | La escalera decimal del SI |
| 2 | Masa y peso cotidiano | mg, g, kg, t, lb | Masa ≠ peso: el kilogramo y el newton miden cosas distintas |
| 3 | Tiempo | s, min, h, d, sem | La única magnitud cotidiana que no es decimal |
| 4 | Área y volumen | cm², m², km², mL, L, cm³, m³ | El factor se eleva al cuadrado y al cubo |
| 5 | Velocidad | m/s, km/h, cm/s, mph | Una unidad compuesta exige dos conversiones |
| 6 | Densidad | g/cm³, kg/m³, g/mL, kg/L | La razón masa/volumen y la flotación |
| 7 | Fuerza, presión y energía | N, kN, Pa, kPa, J, kJ, MJ | Unidades derivadas construidas desde kg, m y s |
| 8 | Temperatura | °C, K, °F | Escalas afines: no basta multiplicar |
| 9 | Notación científica y prefijos SI | nano → giga | Órdenes de magnitud y exponentes |
| 10 | Conversiones compuestas | varias a la vez | Análisis dimensional y plausibilidad |

Cada nivel tiene **10 actividades** con formatos variados: respuesta numérica, selección múltiple, verdadero/falso razonado, ordenar de menor a mayor, emparejar magnitud con unidad, corregir el error de un personaje, retos de laboratorio, misiones narrativas, problemas relámpago, estimaciones razonables, conversiones inversas y problemas de varios pasos.

Los contextos son deliberadamente cotidianos: la carretera, el consultorio médico, el supermercado, la pista de atletismo, el buceo, la astronomía y —donde aplica— la convivencia de los sistemas métrico e inglés en Puerto Rico.

---

## Sistema de puntos

Todos los valores están centralizados en `src/utils/scoring.ts` (`SCORING_CONFIG`), de modo que un docente puede recalibrar la economía del juego editando un solo objeto.

| Concepto | Puntos |
|---|---|
| Base por actividad | 100 |
| Acertar al primer intento (sin pista) | +20 |
| Usar la pista | −25 |
| Cada intento fallido previo | −15 |
| Mínimo garantizado si se acierta | 10 |
| Racha de 3 | +30 |
| Racha de 5 | +75 |
| Racha de 10 (y cada 10 después) | +150 |
| Completar un nivel | +200 |
| Completar un nivel sin pistas ni fallos | +300 |
| Umbral para desbloquear el siguiente nivel | 80 % de aciertos |

**Una respuesta correcta nunca vale cero.** Aunque el estudiante haya usado la pista y fallado varias veces, conserva un mínimo: persistir debe seguir siendo mejor que rendirse.

### Pistas

Cada actividad tiene una pista que **orienta sin resolver**: recuerda una equivalencia, sugiere el primer paso o señala hacia dónde va la conversión. El costo (−25 puntos) se anuncia *antes* de pulsar, para que pedir ayuda sea una decisión informada y no una trampa. Una prueba automática verifica que ninguna pista contenga la respuesta numérica literal.

### Rachas

- Acertar suma 1 a la racha; fallar la reinicia.
- Se registran `currentStreak` y `bestStreak` por separado: la mejor racha nunca se pierde.
- Existe un "modo amable" (`strictStreakReset: false`) que reduce la racha a la mitad en vez de borrarla. Está desactivado por defecto.

### Insignias

16 insignias desbloqueables: una por cada nivel (*Aprendiz de Escalas*, *Maestro de la Masa*, *Guardián del Tiempo*, *Arquitecto del Espacio*, *Viajero de la Velocidad*, *Explorador de la Densidad*, *Ingeniero de Energía*, *Termonauta*, *Navegante del SI*, *Maestro Dimensional*), más *Racha Dorada*, *Sin Pistas*, *Científico Reflexivo*, *Perfeccionista*, *A Medio Camino* y *Laboratorio Completo*.

Las insignias bloqueadas se muestran igualmente, con su descripción visible: solo motiva lo que se sabe cómo conseguir.

---

## Progreso: guardar, trasladar y borrar

El progreso se guarda automáticamente en el `localStorage` del navegador: niveles desbloqueados, puntuación total, mejor racha, insignias, actividades completadas y estadísticas.

### Exportar e importar (pantalla "Mi progreso")

Como el `localStorage` vive en un solo navegador, el progreso se pierde al cambiar de computadora o cuando limpian los equipos de la escuela. La pantalla **"Mi progreso"** resuelve eso con un archivo `.json`:

- **Exportar** descarga un archivo con todo el progreso. Se puede escribir un **nombre o grupo opcional**, que queda dentro del archivo y en su nombre (`mision-unidad-ana-rivera-2026-07-29.json`) — útil si un docente recoge varios.
- **Importar** lee el archivo y **muestra primero una tabla comparativa** entre lo que hay en el navegador y lo que trae el archivo. Solo después se elige:
  - **Combinar** — une ambos progresos: todos los niveles desbloqueados, todas las insignias y **el mejor resultado de cada nivel**. No se pierde nada.
  - **Reemplazar** — descarta el progreso local y deja solo el del archivo. Pide confirmación adicional si hay algo que perder.

Sobrescribir el trabajo de alguien sin que vea antes qué está cambiando sería inaceptable, así que la importación es deliberadamente de dos pasos.

**Al combinar, los puntos no se suman: se toma el máximo.** Sumar los marcadores de dos dispositivos contaría dos veces las mismas actividades e inflaría el resultado. La racha en curso tampoco se transfiere; se empieza limpia en el dispositivo nuevo.

#### El archivo importado nunca se cree

Un JSON puede venir editado a mano, corrupto o de otra versión del juego. Todo lo que entra se sanea antes de tocar el estado:

- Se descartan niveles, actividades e insignias que no existen en el juego (y se avisa de ello en pantalla).
- Los números imposibles (negativos, `Infinity`, texto) se convierten en valores seguros.
- **La precisión de cada nivel se recalcula** a partir de aciertos y total: nunca se acepta la que declare el archivo.
- Los aciertos no pueden superar el número de actividades del nivel.
- El Nivel 1 queda siempre desbloqueado.

Un archivo malo produce un mensaje claro escrito para un estudiante, nunca una partida rota.

### Borrar el progreso

Botón **"Borrar progreso"** en la pantalla de inicio, en la galería de insignias o en "Mi progreso". Pide confirmación explícita antes de actuar.

Si el navegador bloquea el almacenamiento (modo privado, políticas escolares), el juego sigue siendo jugable: simplemente no recuerda el progreso entre sesiones. En ese caso, exportar el archivo al terminar es la forma de conservar el trabajo.

---

## Accesibilidad

- Contraste AA (4.5:1) verificado en modo claro y oscuro.
- Navegación completa por teclado; el foco es siempre visible (contorno de 3 px).
- **El estado correcto/incorrecto se comunica con icono + texto, nunca solo con color.**
- Se evita deliberadamente el arrastrar-y-soltar: ordenar se hace con botones ▲/▼ etiquetados, que sí funcionan con teclado y lector de pantalla.
- Etiquetas asociadas en todos los campos; `aria-label` donde el texto visible no basta.
- Región `aria-live` que anuncia resultados, puntos y cambios de actividad.
- Objetivos táctiles de 44 px mínimo.
- Tipografía en `rem`, que respeta el zoom y las preferencias del sistema.
- Se respetan `prefers-reduced-motion` y `prefers-contrast`.
- Diseño responsivo verificado desde 320 px hasta escritorio.

---

## Estructura del proyecto

```
src/
  components/
    ActivityCard.tsx       Presenta el reto y recoge la respuesta (7 tipos)
    LevelSelector.tsx      Mapa de niveles con estado de bloqueo
    ScoreBoard.tsx         Puntos, racha y barra de progreso
    HintButton.tsx         Pista con costo anunciado
    ExplanationPanel.tsx   Retroalimentación completa tras responder
    BadgeGallery.tsx       Insignias obtenidas y pendientes
    LevelResults.tsx       Cierre de nivel, bonos y desbloqueo
    ProgressTransfer.tsx   Exportar/importar progreso con comparación previa
  data/
    levels/level01.ts … level10.ts   Las 100 actividades
    levels.ts              Índice y utilidades de acceso
    conversionFactors.ts   Catálogo central de factores
    badges.ts              Definición y evaluación de insignias
  utils/
    conversions.ts         Motor de conversión (10 magnitudes + temperatura + prefijos)
    scoring.ts             Puntos, rachas, bonos y resumen de nivel
    validation.ts          Lectura tolerante de respuestas y diagnóstico del error
    storage.ts             Persistencia con migración de versiones
    transfer.ts            Serializar, sanear y combinar progresos (JSON)
  types/game.ts            Modelo de datos
  App.tsx                  Orquestación de pantallas
  styles.css               Diseño, temas claro/oscuro y accesibilidad
```

### Decisiones de arquitectura

**Un solo motor de conversión.** Longitud, masa, tiempo, área, volumen, rapidez, densidad, fuerza, presión y energía son todas conversiones lineales: cada unidad se expresa como "cuántas unidades base equivale 1 de esta unidad", y convertir es siempre `valor × factor(origen) ÷ factor(destino)`. Una función genérica las resuelve todas.

**La temperatura va aparte, a propósito.** Celsius y Fahrenheit tienen el cero en puntos distintos, así que necesitan funciones afines (`mx + b`) y no un factor. Esa separación en el código refleja exactamente el concepto que el Nivel 8 debe enseñar. Existe además `convertTemperatureDelta` para intervalos, donde el desplazamiento se cancela.

**El contenido está separado de la lógica.** Un docente puede corregir un enunciado o añadir actividades editando un archivo de `data/levels/` sin tocar un solo componente.

**La validación es tolerante con la forma, estricta con la física.** Se aceptan coma decimal, separadores de millar, notación científica en varios formatos (`3.5e3`, `3.5 × 10³`, `3.5 x 10^3`), fracciones simples y unidades escritas al final. Lo que se evalúa es la comprensión, no la destreza tecleando.

---

## Verificación

375 pruebas automáticas, ejecutables con `npm test`:

- **Motor de conversión (22)** — factores, reversibilidad, temperatura en las tres escalas, el punto −40 donde °C y °F coinciden, intervalos vs. valores, prefijos y notación científica.
- **Puntuación (12)** — pistas, reintentos, bonos de racha, umbral de desbloqueo, mínimo garantizado.
- **Validación (17)** — formatos de entrada, tolerancias absoluta y relativa, normalización de texto, diagnóstico del error.
- **Transferencia de progreso (24)** — viaje de ida y vuelta sin pérdidas, rechazo de archivos ajenos, corruptos o de versión futura, saneamiento de datos manipulados (incluido el recálculo de la precisión), y reglas de combinación: unión de niveles e insignias, mejor intento por nivel, máximo en vez de suma, e idempotencia.
- **Contenido educativo (272)** — estructura de 10×10, identificadores únicos, campos pedagógicos completos, opciones sin duplicados, y **recálculo matemático independiente de las 57 respuestas numéricas** con el motor de conversiones. Si una respuesta guardada discrepa del cálculo, la prueba falla antes de que un estudiante vea el error.
- **Recorrido del jugador (28)** — partida completa en jsdom: navegar, responder, ver la explicación, gastar una pista, reintentar, guardar y restaurar progreso, **completar el Nivel 1 entero y desbloquear el Nivel 2**, obtener insignias, cambiar de tema, **exportar e importar el progreso en sus tres caminos (combinar, reemplazar, cancelar)** y comprobaciones de accesibilidad.

Cuatro errores reales fueron detectados por estas pruebas durante el desarrollo y corregidos: una pista del Nivel 9 que revelaba la respuesta, falta de variedad de formatos en el Nivel 10, y dos supuestos de compatibilidad en la importación (`Blob.text()` y `URL.revokeObjectURL`, que no existen en todos los navegadores; ahora hay alternativa con `FileReader`).

---

## Notas pedagógicas para docentes

- **El error se trata como información, no como fracaso.** Los mensajes ante un fallo ("Buen intento. Revisemos el factor de conversión", "El error es parte del laboratorio: veamos qué nos enseña") nunca ridiculizan.
- **Los niveles 4 y 5 concentran los errores conceptuales más frecuentes**: aplicar el factor lineal a áreas y volúmenes, y convertir solo la mitad de una unidad compuesta. Vale la pena detenerse ahí en clase.
- **El Nivel 8 es cualitativamente distinto** al resto: es el único donde olvidar un *sumando* (el +32) arruina el resultado. Sirve para introducir la diferencia entre proporción y función afín.
- **La actividad final del Nivel 10** encadena cuatro conversiones. Puede usarse como evaluación sumativa del módulo completo.
- El umbral del 80 % es editable en `SCORING_CONFIG.unlockThreshold` si prefiere un criterio distinto para su grupo.

## Posibles mejoras futuras

- Modo docente que lea varios archivos exportados a la vez y genere un informe del grupo.
- Exportación adicional en CSV, para abrir el progreso del grupo en una hoja de cálculo.
- Editor visual de actividades para añadir contenido sin escribir código.
- Modo contrarreloj opcional para los problemas relámpago.
- Versión en inglés, aprovechando que el contenido ya está separado de la lógica.
- Generación procedural de variantes numéricas, para practicar el mismo concepto con datos distintos.
- Gráficas de órdenes de magnitud en el Nivel 9.
- Sincronización de progreso entre dispositivos (requeriría backend).

---

## Integración continua y publicación

El repositorio incluye dos flujos de trabajo de GitHub Actions:

- **`.github/workflows/ci.yml`** — en cada push y cada pull request verifica los tipos, ejecuta las 375 pruebas y compila las dos versiones. Además deja el HTML autocontenido como artefacto descargable desde la pestaña *Actions*, útil para repartirlo sin conexión.
- **`.github/workflows/pages.yml`** — publica el juego en GitHub Pages tras cada push a `main`, **pero solo si las pruebas pasan**. Una URL pública con el juego roto sería peor que no tener URL.

Para activar la publicación, una sola vez: **Settings → Pages → Source: GitHub Actions**.

La configuración de Vite usa `base: './'`, es decir, rutas relativas. Eso hace que el mismo build funcione en la raíz de un dominio, en un subdirectorio de GitHub Pages (`usuario.github.io/mision-unidad/`) y abierto directamente desde el disco, sin recompilar.

---

## Licencia

[MIT](LICENSE). Puedes usar, modificar y redistribuir el juego, incluso con fines comerciales, siempre que conserves el aviso de copyright y la licencia.

Si adaptas las actividades para tu curso, no hace falta pedir permiso. Si corriges un error de física o de cálculo, un *pull request* es bienvenido: el arnés de pruebas está pensado justamente para que una corrección se pueda verificar en segundos.
