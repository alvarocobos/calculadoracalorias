# Cómo poner esta página en internet

Se publica igual que `bienvenida-programa` y `cambiosfisicos`: GitHub Pages
sirviendo la rama `main` directamente, sin workflows ni nada raro.

---

## Antes de publicar (importante)

Repasa esto, porque en cuanto le des al botón la página es pública:

- [ ] **Tu WhatsApp** en `assets/config.js` → `whatsapp`.
      Ya está puesto el mismo número que en la web de cambios (`34633164871`).
      Compruébalo por si acaso.
- [ ] **Tu Instagram** en el mismo archivo → `instagram`.
- [ ] **La miniatura** para compartir en `assets/img/og-f90.jpg` (1200×630 px).
      Ahora mismo es la misma que usas en las otras dos webs, así que ya vale.
- [ ] **Prueba la calculadora** con tus propios datos y comprueba que el número
      te cuadra con lo que tú le dirías a esa persona.

---

## Paso 1 — Activar GitHub Pages

1. Entra en https://github.com/alvarocobos/calculadoracalorias/settings/pages
2. En **Source**, elige **Deploy from a branch**.
3. En **Branch**, elige `main` y la carpeta `/ (root)`.
4. Dale a **Save**.

En un par de minutos la web estará en:

```
https://alvarocobos.github.io/calculadoracalorias/
```

Con esto ya funciona. Si te vale esa dirección, has terminado.

---

## Paso 2 — El subdominio (opcional)

Lo natural, siguiendo lo que ya tienes, sería:

```
https://calculadora.alvarocobos.com
```

**Ojo con el orden. Primero el DNS y después el archivo.** Si creas el archivo
`CNAME` antes de que exista el registro DNS, GitHub empieza a responder en un
dominio que no resuelve y la página deja de verse también en la dirección
`.github.io`. Por eso este repositorio **no** trae el archivo `CNAME` hecho:
lo creas tú cuando el DNS esté listo.

### 2.1 · El registro DNS, en Hostinger

En la zona DNS de `alvarocobos.com`, añade un registro:

| Tipo | Nombre | Apunta a |
|---|---|---|
| `CNAME` | `calculadora` | `alvarocobos.github.io` |

Es exactamente igual que el que ya tienes para `bienvenida` y para
`transformaciones`.

**No toques la sección «Subdominios» del hosting de Hostinger.** Eso crea una
carpeta en su servidor con un registro A propio y pisaría esta configuración.
Lo que usamos es el registro CNAME de la zona DNS.

### 2.2 · Comprobar que ha propagado

Espera unos minutos y compruébalo antes de seguir:

```bash
dig +short calculadora.alvarocobos.com
# tiene que responder alvarocobos.github.io (o una IP de GitHub)
```

### 2.3 · El archivo CNAME

Cuando el comando de arriba responda, crea en la raíz del repositorio un
archivo llamado `CNAME` (sin extensión) con una sola línea:

```
calculadora.alvarocobos.com
```

Súbelo a `main`. En Settings › Pages, el campo **Custom domain** se rellenará
solo al leerlo.

### 2.4 · HTTPS

Marca **Enforce HTTPS**. Puede tardar un rato en habilitarse mientras GitHub
emite el certificado; es normal que durante unos minutos dé aviso de sitio no
seguro.

---

## Paso 3 — Enlazarla desde tus otras páginas

La calculadora es la mejor puerta de entrada que vas a tener: la gente llega
buscando «cuántas calorías necesito», se lleva su número y te deja el chat
abierto. Sácale partido:

- En **transformaciones.alvarocobos.com**, añade «Calculadora» al menú y al pie.
- En **bienvenida.alvarocobos.com**, enlázala dentro del paso de nutrición.
- En tu **Instagram**, ponla en la bio o en el enlace de destacados.

En el pie de esta página ya hay un enlace de vuelta a la web de cambios, así
que las tres se enlazan entre sí.

---

## Cómo actualizar la página después

Cualquier cambio que subas a `main` se publica solo en un par de minutos.
Para cambiar un porcentaje o el teléfono: editas `assets/config.js` y ya está.
