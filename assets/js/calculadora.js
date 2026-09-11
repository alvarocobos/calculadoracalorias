/* ============================================================================
   MÉTODO F90 — Calculadora de calorías
   ----------------------------------------------------------------------------
   Todo el cálculo ocurre aquí, en el navegador de quien visita la página.
   No se envía ni un dato a ningún servidor.

   Para cambiar el teléfono, el Instagram o los porcentajes,
   edita assets/config.js. Este archivo no hace falta tocarlo.
   ========================================================================== */
(function () {
  'use strict';

  var C   = (typeof CONFIG !== 'undefined') ? CONFIG : {};
  var AJ  = C.ajustes || {};
  var $   = function (id) { return document.getElementById(id); };
  var $$  = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ── Límites de los campos ─────────────────────────────────────────────── */
  var LIMITES = {
    edad:   { min: 14,  max: 100, nombre: 'La edad',    unidad: 'años' },
    altura: { min: 120, max: 230, nombre: 'La altura',  unidad: 'cm'   },
    peso:   { min: 35,  max: 250, nombre: 'El peso',    unidad: 'kg'   }
  };

  /* ══════════════════════════════════════════════════════════════════════
     1) ENLACES DE CONTACTO
     ══════════════════════════════════════════════════════════════════════ */

  function enlaceContacto(mensaje) {
    if (C.urlAplicar) return C.urlAplicar;
    var tel = String(C.whatsapp || '').replace(/\D/g, '');
    if (!tel) return '';
    var txt = mensaje || C.mensajeWhatsapp || '';
    return 'https://wa.me/' + tel + (txt ? '?text=' + encodeURIComponent(txt) : '');
  }

  function pintarEnlaces() {
    var url = enlaceContacto();
    $$('.js-cta').forEach(function (a) {
      if (url) {
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
      } else {
        // Sin WhatsApp configurado no dejamos un botón muerto: va al bloque final.
        a.href = '#contacto';
        a.removeAttribute('target');
      }
    });

    var ig = $('footIg');
    if (ig) {
      if (C.instagram) ig.href = 'https://instagram.com/' + C.instagram;
      else ig.hidden = true;
    }

    var cambios = $('footCambios');
    if (cambios) {
      if (C.webCambios) cambios.href = C.webCambios;
      else cambios.hidden = true;
    }

    var year = $('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ══════════════════════════════════════════════════════════════════════
     2) EL CÁLCULO
     ══════════════════════════════════════════════════════════════════════ */

  /* Metabolismo basal. Dos fórmulas: la clásica y la más precisa. */
  function calcularTMB(formula, sexo, kg, cm, edad) {
    if (formula === 'msj') {
      // Mifflin-St Jeor (1990)
      var base = (10 * kg) + (6.25 * cm) - (5 * edad);
      return sexo === 'mujer' ? base - 161 : base + 5;
    }
    // Harris-Benedict revisada por Roza y Shizgal (1984)
    return sexo === 'mujer'
      ? 447.593 + (9.247 * kg) + (3.098 * cm) - (4.330 * edad)
      : 88.362  + (13.397 * kg) + (4.799 * cm) - (5.677 * edad);
  }

  /* Porcentaje a aplicar sobre el gasto total, según objetivo y ritmo. */
  function porcentaje(objetivo, ritmo) {
    var tabla = (AJ.ritmos || {})[objetivo];
    if (!tabla) return 0;
    if (objetivo === 'mantener') return tabla.unico || 0;
    return typeof tabla[ritmo] === 'number' ? tabla[ritmo] : (tabla.moderado || 0);
  }

  /* Gramos de proteína por kilo que toca por defecto en cada objetivo. */
  function proteinaPorDefecto(objetivo) {
    var p = AJ.proteina || {};
    return p[objetivo] || 1.8;
  }

  /* Redondea a la unidad que diga la configuración (50 kcal por defecto). */
  function aRedondo(v, paso) {
    paso = paso || AJ.redondeo || 50;
    return Math.round(v / paso) * paso;
  }

  function calcular(d) {
    var tmb = calcularTMB(d.formula, d.sexo, d.peso, d.altura, d.edad);
    var pct = porcentaje(d.objetivo, d.ritmo);

    /* ── De dónde sale la horquilla ───────────────────────────────────────
       El metabolismo basal es lo único que la fórmula calcula sin que nadie
       opine: con tu peso, tu altura y tu edad, sale lo que sale.

       El error entra justo después, al elegir el factor de actividad, porque
       eso lo marca la persona a ojo. Quien dice «moderado» puede estar en
       cualquier punto entre «ligero» y «alto». Así que en vez de fingir una
       cifra exacta, movemos medio escalón de la escala arriba y abajo y
       damos el rango que sale. Es la incertidumbre real del método. */
    var paso   = typeof AJ.pasoActividad === 'number' ? AJ.pasoActividad : 0.175;
    var facMin = Math.max(1.2, d.actividad - paso / 2);
    var facMax = Math.min(1.9, d.actividad + paso / 2);

    var tdee    = tmb * d.actividad;
    var tdeeMin = aRedondo(tmb * facMin);
    var tdeeMax = aRedondo(tmb * facMax);

    var objMin = aRedondo(tmb * facMin * (1 + pct / 100));
    var objMax = aRedondo(tmb * facMax * (1 + pct / 100));
    var objMed = (objMin + objMax) / 2;

    /* Suelo de seguridad: por debajo del metabolismo basal no se recomienda
       nada, así que la horquilla entera sube hasta ahí si hiciera falta. */
    var suelo  = aRedondo(tmb * (AJ.sueloSobreTMB || 1));
    var topado = objMin < suelo;
    if (topado) {
      objMin = suelo;
      if (objMax < objMin) objMax = objMin;
      objMed = (objMin + objMax) / 2;
    }

    /* ── Macros ──────────────────────────────────────────────────────────
       La proteína se ancla al peso corporal, no a las calorías: por eso su
       rango no viene de la horquilla, sino de que cualquier valor en esa
       franja de gramos por kilo funciona.
       La grasa sí sigue a las calorías, así que se calcula en cada extremo.
       El carbohidrato es el que se queda con lo que sobra. */
    var gProMin = aRedondo(d.peso * Math.max(1, d.proteina - 0.2), 5);
    var gProMax = aRedondo(d.peso * d.proteina, 5);
    var gProMed = (gProMin + gProMax) / 2;

    var gGraMinimo = (AJ.grasaMinimaPorKg || 0.6) * d.peso;
    var porcGrasa  = (AJ.grasaPorcentaje || 25) / 100;
    var gGraMin = aRedondo(Math.max(objMin * porcGrasa / 9, gGraMinimo), 5);
    var gGraMax = aRedondo(Math.max(objMax * porcGrasa / 9, gGraMinimo), 5);

    /* El carbohidrato se queda con lo que sobra en cada extremo. Cada extremo
       va con SU grasa: la grasa sigue a las calorías, así que en el extremo
       bajo es baja. Cruzarlos (pocas calorías con mucha grasa) describiría un
       escenario que no puede darse e inflaría el rango para nada. */
    var restante = function (kcal, gGra) {
      return Math.max(0, aRedondo((kcal - gProMed * 4 - gGra * 9) / 4, 5));
    };
    var gCarMin = restante(objMin, gGraMin);
    var gCarMax = restante(objMax, gGraMax);

    var apretado = gCarMax <= 0;

    // Ritmo de cambio estimado: 7.700 kcal ≈ 1 kg de grasa corporal.
    var semanalMin = ((objMin - tdeeMax) * 7) / 7700;
    var semanalMax = ((objMax - tdeeMin) * 7) / 7700;

    return {
      tmb: Math.round(tmb),
      tdee: Math.round(tdee),
      tdeeMin: tdeeMin, tdeeMax: tdeeMax,
      objMin: objMin, objMax: objMax, objMed: objMed,
      pct: pct,
      diferencia: Math.round(objMed - tdee),
      topado: topado,
      apretado: apretado,
      gProMin: gProMin, gProMax: gProMax,
      gCarMin: gCarMin, gCarMax: gCarMax,
      gGraMin: gGraMin, gGraMax: gGraMax,
      // Para la barra de proporciones basta con el punto medio.
      kPro: gProMed * 4,
      kCar: ((gCarMin + gCarMax) / 2) * 4,
      kGra: ((gGraMin + gGraMax) / 2) * 9,
      agua: (d.peso * (AJ.aguaPorKg || 35)) / 1000,
      semanalMin: semanalMin, semanalMax: semanalMax,
      imc: d.peso / Math.pow(d.altura / 100, 2)
    };
  }

  function textoIMC(imc) {
    if (imc < 18.5) return 'bajo peso';
    if (imc < 25)   return 'normal';
    if (imc < 30)   return 'sobrepeso';
    if (imc < 35)   return 'obesidad I';
    if (imc < 40)   return 'obesidad II';
    return 'obesidad III';
  }

  /* ══════════════════════════════════════════════════════════════════════
     3) LEER EL FORMULARIO
     ══════════════════════════════════════════════════════════════════════ */

  var form = $('form');
  if (!form) return;

  function marcado(nombre) {
    var el = form.querySelector('input[name="' + nombre + '"]:checked');
    return el ? el.value : null;
  }

  function numero(id) {
    var el = $(id);
    if (!el) return NaN;
    var v = el.value.trim().replace(',', '.');
    return v === '' ? NaN : parseFloat(v);
  }

  /* Devuelve {ok, datos, error, campo} */
  function leer() {
    var d = {
      sexo:      marcado('sexo') || 'hombre',
      objetivo:  marcado('objetivo') || 'perder',
      ritmo:     marcado('ritmo') || 'moderado',
      formula:   marcado('formula') || 'hb',
      actividad: parseFloat(marcado('actividad') || '1.55'),
      edad:      numero('edad'),
      altura:    numero('altura'),
      peso:      numero('peso'),
      proteina:  numero('proteina')
    };

    // Todavía sin rellenar: no es un error, simplemente aún no hay resultado.
    if (isNaN(d.edad) || isNaN(d.altura) || isNaN(d.peso)) {
      return { ok: false, vacio: true, datos: d };
    }

    var campos = ['edad', 'altura', 'peso'];
    for (var i = 0; i < campos.length; i++) {
      var k = campos[i], L = LIMITES[k], v = d[k];
      if (v < L.min || v > L.max) {
        return {
          ok: false,
          campo: k,
          error: L.nombre + ' tiene que estar entre ' + L.min + ' y ' + L.max + ' ' + L.unidad + '.'
        };
      }
    }

    if (isNaN(d.proteina) || d.proteina < 1 || d.proteina > 3.5) {
      d.proteina = proteinaPorDefecto(d.objetivo);
    }

    return { ok: true, datos: d };
  }

  /* ══════════════════════════════════════════════════════════════════════
     4) PINTAR EL RESULTADO
     ══════════════════════════════════════════════════════════════════════ */

  var nf = new Intl.NumberFormat('es-ES');
  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fmt(n) { return nf.format(Math.round(n)); }
  function fmt1(n) { return nf.format(Math.round(n * 10) / 10); }

  /* Cuenta hasta el número, para que el cambio se note. */
  var animaciones = {};
  var cierres = {};
  function contarHasta(el, destino, sufijo) {
    if (!el) return;
    var id = el.id;
    if (animaciones[id]) cancelAnimationFrame(animaciones[id]);
    if (cierres[id]) clearTimeout(cierres[id]);

    var desde = parseFloat(String(el.dataset.v || '0')) || 0;
    var suf   = sufijo || '';
    el.dataset.v = destino;

    // Dejamos escrito el número bueno ANTES de animar. Si el navegador no
    // llega a ejecutar la animación (pestaña en segundo plano, ahorro de
    // batería, página restaurada), lo que se ve sigue siendo correcto en
    // vez de quedarse clavado en el cero del HTML.
    el.innerHTML = fmt(destino) + suf;

    if (reducido || desde === destino || document.hidden) return;

    var t0 = null, dur = 480;
    function paso(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);            // easing suave al final
      el.innerHTML = fmt(desde + (destino - desde) * e) + suf;
      if (p < 1) animaciones[id] = requestAnimationFrame(paso);
      else cerrar();
    }

    // Red de seguridad. La cuenta atrás es un adorno; el número correcto no
    // puede depender de que el navegador termine de animar. Si se queda a
    // medias —pestaña en segundo plano, móvil que congela la página, ahorro
    // de energía— este cierre escribe la cifra buena igualmente.
    function cerrar() {
      if (animaciones[id]) { cancelAnimationFrame(animaciones[id]); animaciones[id] = null; }
      if (cierres[id])     { clearTimeout(cierres[id]); cierres[id] = null; }
      el.innerHTML = fmt(destino) + suf;
    }

    cierres[id] = setTimeout(cerrar, dur + 80);
    animaciones[id] = requestAnimationFrame(paso);
  }

  var ultimo = null;   // el último resultado válido, para copiar y para WhatsApp

  function mostrarVacio(mensajeError, campo) {
    $('res').hidden = true;
    $('vacio').hidden = false;
    ultimo = null;

    $$('#form input[type="number"]').forEach(function (i) { i.removeAttribute('aria-invalid'); });

    var box = $('error');
    if (mensajeError) {
      $('errorTxt').textContent = mensajeError;
      box.hidden = false;
      if (campo && $(campo)) $(campo).setAttribute('aria-invalid', 'true');
    } else {
      box.hidden = true;
    }
  }

  /* Pinta una horquilla: «170 – 190 g». Si los dos extremos coinciden
     (horquilla desactivada en la configuración), sale una cifra sola. */
  function rango(a, b, unidad) {
    var u = unidad ? '<u>' + unidad + '</u>' : '';
    return a === b ? fmt(a) + u
                   : fmt(a) + '<i>–</i>' + fmt(b) + u;
  }

  function pintar(d, r) {
    $('error').hidden = true;
    $$('#form input[type="number"]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
    $('vacio').hidden = true;
    $('res').hidden = false;

    // Cifra grande: los dos extremos de la horquilla
    $('resLbl').textContent =
      d.objetivo === 'perder' ? 'Para perder grasa' :
      d.objetivo === 'ganar'  ? 'Para ganar músculo' :
                                'Para mantenerte';
    contarHasta($('resMin'), r.objMin);
    contarHasta($('resMax'), r.objMax);
    contarHasta($('resTmb'), r.tmb, '<i>kcal</i>');
    $('resTdee').innerHTML = rango(r.tdeeMin, r.tdeeMax, 'kcal');

    // Pastilla de diferencia: en aproximado, que es lo que es
    var delta = $('resDelta');
    var uso   = delta.querySelector('use');
    var dif   = r.diferencia;
    if (r.pct === 0) {
      delta.classList.add('res__delta--flat');
      uso.setAttribute('href', '#i-equal');
      $('resDeltaTxt').textContent = 'Alrededor de tu gasto: ni sube ni baja';
    } else {
      delta.classList.remove('res__delta--flat');
      uso.setAttribute('href', dif < 0 ? '#i-down' : '#i-up');
      $('resDeltaTxt').textContent =
        'Unas ' + fmt(aRedondo(Math.abs(dif))) + ' kcal ' + (dif < 0 ? 'por debajo' : 'por encima') +
        ' de tu gasto · ' + (dif < 0 ? 'déficit' : 'superávit') + ' del ' + Math.abs(r.pct) + ' %';
    }

    // Macros, también en horquilla
    $('gPro').innerHTML = rango(r.gProMin, r.gProMax, 'g');
    $('gCar').innerHTML = rango(r.gCarMin, r.gCarMax, 'g');
    $('gGra').innerHTML = rango(r.gGraMin, r.gGraMax, 'g');

    var total = r.kPro + r.kCar + r.kGra || 1;
    $('barPro').style.width = (r.kPro / total * 100) + '%';
    $('barCar').style.width = (r.kCar / total * 100) + '%';
    $('barGra').style.width = (r.kGra / total * 100) + '%';

    // Extras
    $('resAgua').innerHTML     = fmt1(r.agua) + '<small>L</small>';
    $('resImc').textContent    = fmt1(r.imc);
    $('resImcTxt').textContent = textoIMC(r.imc);

    pintarRitmo(d, r);

    // Avisos
    var suelo = $('suelo');
    if (r.topado) {
      $('sueloTxt').innerHTML = 'Ese ritmo te dejaba por debajo de tu metabolismo basal, así que ' +
        'la horquilla sube hasta <b>' + fmt(r.objMin) + ' kcal</b>. Bajar de ahí no acelera nada: ' +
        'te quita músculo, energía y ganas.';
      suelo.hidden = false;
    } else if (r.apretado) {
      $('sueloTxt').innerHTML = 'Con esa proteína no queda hueco para el carbohidrato. ' +
        'Baja los gramos por kilo en «Ajustes avanzados» o sube las calorías.';
      suelo.hidden = false;
    } else {
      suelo.hidden = true;
    }

    ultimo = { d: d, r: r };
    pintarVeredicto();
  }

  /* El ritmo, sin sopa de signos. La dirección va en la etiqueta («Bajarías»,
     «Subirías») y el valor se queda solo con la magnitud, de menos a más. */
  function pintarRitmo(d, r) {
    var etiqueta = $('resRitmoLbl');
    var valor    = $('resRitmo');

    if (d.objetivo === 'mantener') {
      etiqueta.textContent = 'Ritmo';
      var margen = Math.max(Math.abs(r.semanalMin), Math.abs(r.semanalMax));
      valor.innerHTML = (margen < 0.05 ? 'Estable' : '±' + fmt1(margen))
                      + '<small>kg/sem</small>';
      return;
    }

    etiqueta.textContent = d.objetivo === 'perder' ? 'Bajarías' : 'Subirías';

    var a = Math.abs(r.semanalMin), b = Math.abs(r.semanalMax);
    var bajo = Math.min(a, b), alto = Math.max(a, b);
    var mismo = fmt1(bajo) === fmt1(alto);

    valor.innerHTML = (mismo ? fmt1(alto) : fmt1(bajo) + '<i>–</i>' + fmt1(alto))
                    + '<small>kg/sem</small>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     LAS SEIS PREGUNTAS
     ----------------------------------------------------------------------
     No tocan el cálculo. Lo que hacen es decirle a la persona qué tiene
     que pasar para que ese número signifique algo en su vida real.
     ══════════════════════════════════════════════════════════════════════ */

  var PREGUNTAS = {
    dieta:   { corto: 'el historial de dietas',
               largo: 'vengo de meses a dieta baja en calorías' },
    ojo:     { corto: 'las raciones a ojo',
               largo: 'calculo las raciones a ojo, sin pesar' },
    fuerza:  { corto: 'poco entrenamiento de fuerza',
               largo: 'entreno fuerza menos de dos días por semana' },
    finde:   { corto: 'el fin de semana',
               largo: 'mi fin de semana no se parece a mi semana' },
    salud:   { corto: 'la medicación o la condición médica',
               largo: 'tomo medicación o tengo una condición médica' },
    aplicar: { corto: 'llevarlo al plato',
               largo: 'no sabría montar un día de comidas con esos gramos' }
  };

  function marcadas() {
    return $$('#fiarLista input[type="checkbox"]')
      .filter(function (i) { return i.checked; })
      .map(function (i) { return i.getAttribute('data-q'); });
  }

  /* «a», «a y b», «a, b y c» */
  function enumerar(lista) {
    if (lista.length === 0) return '';
    if (lista.length === 1) return lista[0];
    return lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1];
  }

  function pintarVeredicto() {
    var m = marcadas();
    var n = m.length;
    var caja = $('veredicto');
    var cortos = m.map(function (k) { return PREGUNTAS[k].corto; });

    $('veredictoPin').textContent = n + '/6';
    caja.classList.toggle('veredicto--ojo', n > 0);

    var titulo, texto;

    if (n === 0) {
      titulo = 'Ninguna te pasa';
      texto = 'Entonces tu horquilla es un punto de partida sólido. Aun así sigue ' +
              'siendo eso: un punto de partida. Saber cuántas calorías te tocan no es ' +
              'lo mismo que saber <b>qué pones en el plato el martes por la noche</b>, ' +
              'ni qué haces el día que la báscula lleva tres semanas parada.';
    } else if (n <= 2) {
      titulo = n === 1 ? 'Hay una cosa que mueve este número'
                       : 'Hay dos cosas que mueven este número';
      texto = 'Has marcado ' + enumerar(cortos) + '. Con eso encima, tu número real tira ' +
              'hacia <b>el extremo bajo de la horquilla</b>, y conviene comprobarlo antes ' +
              'de dar por buena ninguna cifra.';
    } else if (n <= 4) {
      titulo = 'Tu caso hay que medirlo, no estimarlo';
      texto = 'Has marcado ' + n + ' de seis: ' + enumerar(cortos) + '. Cada una por ' +
              'separado ya desplaza el resultado; juntas, la fórmula se queda corta. ' +
              'Aquí ya no se trata de calcular mejor, sino de <b>seguir tus datos ' +
              'semana a semana</b> y ajustar sobre lo que pase de verdad.';
    } else {
      titulo = 'Esta horquilla, sola, no te va a servir';
      texto = 'Has marcado ' + n + ' de seis: ' + enumerar(cortos) + '. No es una mala ' +
              'noticia y no significa que no puedas: significa que <b>el problema no era ' +
              'el número</b>. Ninguna calculadora te va a resolver esto, porque lo que ' +
              'falta no es el cálculo.';
    }

    $('veredictoTit').textContent = titulo;
    $('veredictoTxt').innerHTML = texto;

    var cta = $('ctaResTxt');
    if (cta) {
      cta.textContent = n >= 3
        ? 'Cuéntale tu caso a Álvaro'
        : 'Que Álvaro me lo convierta en un plan';
    }

    actualizarCtaResultado();
    guardar();
  }

  var NOMBRE_OBJ = { perder: 'perder grasa', mantener: 'mantenerme', ganar: 'ganar músculo' };

  function resumen() {
    if (!ultimo) return '';
    var d = ultimo.d, r = ultimo.r;

    var linea = function (etiqueta, a, b, u) {
      return '• ' + etiqueta + ': ' + (a === b ? fmt(a) : fmt(a) + '-' + fmt(b)) + ' ' + u;
    };

    var txt = 'Mis números de la calculadora del Método F90:\n\n' +
      '• Objetivo: ' + NOMBRE_OBJ[d.objetivo] + '\n' +
      '• Metabolismo basal: ' + fmt(r.tmb) + ' kcal\n' +
      linea('Mantenimiento', r.tdeeMin, r.tdeeMax, 'kcal') + '\n' +
      linea('Comer al día', r.objMin, r.objMax, 'kcal') + '\n' +
      linea('Proteína', r.gProMin, r.gProMax, 'g') + '\n' +
      linea('Carbohidratos', r.gCarMin, r.gCarMax, 'g') + '\n' +
      linea('Grasas', r.gGraMin, r.gGraMax, 'g');

    /* Lo que ha marcado es la parte que de verdad te sirve a ti: es su
       situación contada por ella misma, sin tener que preguntársela. */
    var m = marcadas();
    if (m.length) {
      txt += '\n\nDe las seis preguntas he marcado ' + m.length + ':\n' +
        m.map(function (k) { return '• ' + PREGUNTAS[k].largo; }).join('\n');
    } else {
      txt += '\n\nDe las seis preguntas no he marcado ninguna.';
    }

    return txt;
  }

  function actualizarCtaResultado() {
    var a = $('ctaRes');
    if (!a) return;
    var url = enlaceContacto('Hola Álvaro, vengo de la calculadora.\n\n' + resumen() +
                             '\n\nYa tengo el número; lo que no sé es cómo llevarlo a mi día a día. ' +
                             '¿Me echas una mano?');
    if (url) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    } else {
      a.href = '#contacto';
      a.removeAttribute('target');
    }
  }

  var btnCopiar = $('btnCopiar');
  if (btnCopiar) {
    btnCopiar.addEventListener('click', function () {
      var txt = resumen();
      if (!txt) return;
      var etiqueta = $('btnCopiarTxt');

      function hecho() {
        etiqueta.textContent = '¡Copiado!';
        btnCopiar.classList.add('copiado');
        setTimeout(function () {
          etiqueta.textContent = 'Copiar';
          btnCopiar.classList.remove('copiado');
        }, 1800);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(hecho, copiaManual);
      } else {
        copiaManual();
      }

      // Sin API de portapapeles (http, navegadores viejos): lo hacemos a mano.
      function copiaManual() {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); hecho(); } catch (e) { /* nada que hacer */ }
        document.body.removeChild(ta);
      }
    });
  }

  var btnImprimir = $('btnImprimir');
  if (btnImprimir) btnImprimir.addEventListener('click', function () { window.print(); });

  /* ══════════════════════════════════════════════════════════════════════
     6) MEMORIA (en el dispositivo, nunca en un servidor)
     ══════════════════════════════════════════════════════════════════════ */

  var CLAVE = 'f90-calc-v1';

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({
        sexo: marcado('sexo'), objetivo: marcado('objetivo'), ritmo: marcado('ritmo'),
        formula: marcado('formula'), actividad: marcado('actividad'),
        edad: $('edad').value, altura: $('altura').value, peso: $('peso').value,
        proteina: $('proteina').value, tocada: proteinaTocada,
        marcadas: marcadas()
      }));
    } catch (e) { /* almacenamiento bloqueado: la página funciona igual */ }
  }

  function recuperar() {
    var g;
    try { g = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { return; }
    if (!g) return;

    ['sexo', 'objetivo', 'ritmo', 'formula', 'actividad'].forEach(function (n) {
      if (!g[n]) return;
      var el = form.querySelector('input[name="' + n + '"][value="' + g[n] + '"]');
      if (el) el.checked = true;
    });
    ['edad', 'altura', 'peso', 'proteina'].forEach(function (n) {
      if (g[n]) $(n).value = g[n];
    });
    proteinaTocada = !!g.tocada;

    if (Array.isArray(g.marcadas)) {
      g.marcadas.forEach(function (clave) {
        var el = document.querySelector('#fiarLista input[data-q="' + clave + '"]');
        if (el) el.checked = true;
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     7) REACCIONES DEL FORMULARIO
     ══════════════════════════════════════════════════════════════════════ */

  var proteinaTocada = false;

  /* El campo de proteína sigue al objetivo mientras nadie lo haya tocado.
     En cuanto alguien escribe un valor propio, se respeta y deja de moverse. */
  function sincronizarProteina() {
    if (proteinaTocada) return;
    var obj = marcado('objetivo') || 'perder';
    // Con punto: en un <input type="number"> la coma invalida el valor
    // y el campo se quedaría vacío.
    $('proteina').value = String(proteinaPorDefecto(obj));
  }

  $('proteina').addEventListener('input', function () {
    proteinaTocada = this.value.trim() !== '';
  });

  /* El ritmo no pinta nada si el objetivo es mantenerse. */
  function sincronizarRitmo() {
    var obj = marcado('objetivo');
    var campo = $('campoRitmo');
    campo.hidden = (obj === 'mantener');

    var hint = $('hintRitmo');
    if (obj === 'ganar') hint.textContent = 'Más agresivo es ganar más grasa por el camino';
    else hint.textContent = 'Cuanto más agresivo, más difícil de sostener';
  }

  function actualizar() {
    sincronizarRitmo();
    sincronizarProteina();

    var lectura = leer();
    if (lectura.ok) pintar(lectura.datos, calcular(lectura.datos));
    else mostrarVacio(lectura.error, lectura.campo);

    guardar();
  }

  /* Las seis preguntas están en el panel del resultado, fuera del <form>,
     así que no las alcanza el listener de abajo: van por su cuenta. */
  var lista = $('fiarLista');
  if (lista) lista.addEventListener('change', pintarVeredicto);

  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* ══════════════════════════════════════════════════════════════════════
     8) DETALLES DE LA PÁGINA
     ══════════════════════════════════════════════════════════════════════ */

  /* Cabecera: línea inferior solo cuando se ha bajado. */
  var header = $('siteHeader');
  if (header) {
    var stuck = false;
    var alScroll = function () {
      var ahora = window.pageYOffset > 8;
      if (ahora !== stuck) { stuck = ahora; header.classList.toggle('is-stuck', ahora); }
    };
    window.addEventListener('scroll', alScroll, { passive: true });
    alScroll();
  }

  /* Revelado de las secciones al entrar en pantalla. */
  var reveals = $$('.reveal');
  if (!('IntersectionObserver' in window) || reducido) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { obs.observe(el); });
  }

  /* ── Arranque ──────────────────────────────────────────────────────────── */
  pintarEnlaces();
  recuperar();
  actualizar();

})();
