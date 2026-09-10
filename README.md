# Calculadora de calorías — Método F90

Calculadora de calorías y macros de **Álvaro Cobos / Método F90**.
HTML, CSS y JavaScript puro: sin frameworks, sin dependencias y sin compilar nada.
Se sube tal cual a cualquier hosting.

Usa **el mismo sistema de marca que `bienvenida.alvarocobos.com` y
`transformaciones.alvarocobos.com`**: mismos colores, misma tipografía
(Inter + Instrument Serif), mismos botones, mismos radios y el mismo logo.
Las tres páginas se ven como la misma web.

El cálculo entero ocurre en el navegador de quien la usa. No hay servidor,
no hay registro y no se envía ni un dato a ningún sitio.

---

## 1. Poner tus datos (2 minutos)

Abre **`assets/config.js`** y edita el bloque `CONFIG` de arriba:

```js
whatsapp: "34633164871",   // tu número con prefijo, sin + ni espacios
instagram: "_alvarotrainer",  // tu usuario, sin la @
urlAplicar: "",            // opcional: Typeform / Calendly / formulario
```

Todos los botones de la página (cabecera, resultado, CTA final y el botón
flotante) apuntan solos a WhatsApp con un mensaje ya escrito. Si rellenas
`urlAplicar`, todos apuntarán ahí en vez de a WhatsApp.

Si dejas `whatsapp` vacío, los botones no se quedan muertos: llevan al bloque
de contacto del final de la página.

---

## 2. Qué hace la calculadora

La persona rellena sexo, edad, altura, peso, actividad y objetivo, y ve al
instante (sin pulsar ningún botón):

| Dato | Qué es |
|---|---|
| **Calorías objetivo** | La cifra grande: lo que tiene que comer al día |
| **Metabolismo basal** | Lo que quema en reposo absoluto |
| **Mantenimiento** | Su gasto total del día, con la actividad incluida |
| **Macros** | Proteína, carbohidratos y grasas, en gramos y en kcal |
| **Agua, ritmo estimado e IMC** | Los tres extras de abajo |

Además puede **copiar** el resultado, **guardarlo en PDF** (imprimir) o mandártelo
por WhatsApp con un solo botón: el mensaje ya va escrito con todos sus números.

Los datos se guardan en el `localStorage` de su dispositivo, así que si vuelve
a entrar no tiene que escribirlos otra vez. Si el almacenamiento está bloqueado,
la página funciona igual.

---

## 3. Las fórmulas

**Metabolismo basal** — Harris-Benedict revisada por Roza y Shizgal (1984):

```
Hombre  88,362  + (13,397 × kg) + (4,799 × cm) − (5,677 × edad)
Mujer   447,593 + (9,247 × kg)  + (3,098 × cm) − (4,330 × edad)
```

En «Ajustes avanzados» se puede cambiar a **Mifflin-St Jeor**, algo más precisa
si hay sobrepeso:

```
Hombre  (10 × kg) + (6,25 × cm) − (5 × edad) + 5
Mujer   (10 × kg) + (6,25 × cm) − (5 × edad) − 161
```

**Gasto total** = TMB × factor de actividad (1,2 · 1,375 · 1,55 · 1,725 · 1,9).

**Calorías objetivo** = gasto total ± el porcentaje del objetivo y el ritmo.

**Macros**: la proteína se ancla al peso corporal, la grasa es un 25 % de las
calorías con un mínimo de 0,6 g/kg, y el carbohidrato se queda con lo que sobra.

Hay un **suelo de seguridad**: si el ritmo elegido dejaría a la persona por
debajo de su metabolismo basal, la página sube la cifra hasta ahí y lo avisa
en pantalla. Nunca recomienda comer por debajo del basal.

---

## 4. Cambiar los números del cálculo

Están todos en `assets/config.js`, dentro de `CONFIG.ajustes`. Solo tócalos si
sabes lo que haces, porque cambian lo que ve la gente:

```js
ritmos: {
  perder:   { suave: -10, moderado: -20, agresivo: -25 },   // % sobre el gasto
  ganar:    { suave: +5,  moderado: +10, agresivo: +15 }
},
proteina: { perder: 2.2, mantener: 1.8, ganar: 2.0 },        // g por kg
grasaPorcentaje: 25,
grasaMinimaPorKg: 0.6,
aguaPorKg: 35
```

---

## 5. La marca

Los colores y medidas están al principio de `assets/css/styles.css`, copiados
tal cual de la web de bienvenida:

```css
--bg:#0A0908;       --surface:#121110;
--text:#F6F3F0;     --text-2:#B4ADA5;
--accent:#FF5A00;   --accent-2:#FF8A3D;
```

Si algún día cambias la marca en la web de bienvenida, actualiza estas
variables aquí y el resto se adapta solo.

Los logos (`assets/img/logo-f90*.png/webp`) son los mismos archivos de las
otras dos webs.

---

## 6. Ver la página

No necesita servidor: haz doble clic en `index.html`.
Si prefieres servirla en local:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

---

## 7. Publicarla

Está explicado paso a paso en **`PUBLICAR.md`**.

---

## Estructura

```
index.html                  la página
assets/css/styles.css       diseño (y el color de marca)
assets/js/calculadora.js    el cálculo (no hace falta tocarlo)
assets/config.js            ← LO ÚNICO QUE TIENES QUE TOCAR
assets/img/                 los logos y la miniatura para compartir
```

---

## Detalles técnicos

- HTML + CSS + JS sin dependencias. Se despliega en GitHub Pages tal cual.
- Tipografías: Inter e Instrument Serif (Google Fonts).
- Iconografía propia en un sprite SVG (`<symbol>`), sin librerías.
- Accesibilidad: contraste AA, foco visible, navegación por teclado, grupos de
  radio con nombre accesible, resultado en una región `aria-live` y soporte de
  `prefers-reduced-motion` (se desactivan todas las animaciones).
- Los números se animan al cambiar, pero la animación es solo un adorno: si el
  navegador no llega a terminarla (pestaña en segundo plano, móvil que congela
  la página), un cierre por seguridad escribe igualmente la cifra correcta.
- Hoja de estilos de impresión: al «Guardar PDF» sale solo la tarjeta del
  resultado, en claro y sin menús.
