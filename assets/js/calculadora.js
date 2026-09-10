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

  function calcular(d) {
    var tmb  = calcularTMB(d.formula, d.sexo, d.peso, d.altura, d.edad);
    var tdee = tmb * d.actividad;
    var pct  = porcentaje(d.objetivo, d.ritmo);

    // Objetivo, redondeado a la decena para que sea un número manejable.
    // Si no hay ajuste (mantener), el objetivo es exactamente el gasto: así la
    // cifra grande y el «mantenimiento» de al lado no se contradicen por 4 kcal.
    var objetivo = pct === 0
      ? Math.round(tdee)
      : Math.round((tdee * (1 + pct / 100)) / 10) * 10;

    // Suelo de seguridad: nunca por debajo del metabolismo basal.
    var suelo    = Math.round((tmb * (AJ.sueloSobreTMB || 1)) / 10) * 10;
    var topado   = objetivo < suelo;
    if (topado) objetivo = suelo;

    /* ── Macros ──────────────────────────────────────────────────────────
       Proteína y grasa se anclan al peso corporal (una por músculo, otra
       por salud hormonal). El carbohidrato se queda con lo que sobra. */
    var gPro = Math.round(d.proteina * d.peso);
    var kPro = gPro * 4;

    var gGraMin = (AJ.grasaMinimaPorKg || 0.6) * d.peso;
    var gGra    = Math.round(Math.max(objetivo * ((AJ.grasaPorcentaje || 25) / 100) / 9, gGraMin));
    var kGra    = gGra * 9;

    var kCar = objetivo - kPro - kGra;
    var apretado = false;
    if (kCar < 0) {
      // Caso extremo (objetivo muy bajo con proteína muy alta): en vez de dar
      // un número negativo, dejamos el carbohidrato a cero y avisamos.
      kCar = 0;
      apretado = true;
    }
    var gCar = Math.round(kCar / 4);

    // Ritmo de cambio estimado: 7.700 kcal ≈ 1 kg de grasa corporal.
    var semanal = ((objetivo - tdee) * 7) / 7700;

    var imc = d.peso / Math.pow(d.altura / 100, 2);

    return {
      tmb: Math.round(tmb),
      tdee: Math.round(tdee),
      objetivo: objetivo,
      pct: pct,
      diferencia: objetivo - Math.round(tdee),
      topado: topado,
      apretado: apretado,
      gPro: gPro, kPro: kPro,
      gCar: gCar, kCar: kCar,
      gGra: gGra, kGra: kGra,
      agua: (d.peso * (AJ.aguaPorKg || 35)) / 1000,
      semanal: semanal,
      imc: imc
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

  function pintar(d, r) {
    $('error').hidden = true;
    $$('#form input[type="number"]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
    $('vacio').hidden = true;
    $('res').hidden = false;

    // Cifra grande
    $('resLbl').textContent =
      d.objetivo === 'perder'  ? 'Para perder grasa' :
      d.objetivo === 'ganar'   ? 'Para ganar músculo' :
                                 'Para mantenerte';
    contarHasta($('resKcal'), r.objetivo);
    contarHasta($('resTmb'),  r.tmb,  '<i>kcal</i>');
    contarHasta($('resTdee'), r.tdee, '<i>kcal</i>');

    // Pastilla de diferencia
    var delta = $('resDelta');
    var uso   = delta.querySelector('use');
    var dif   = r.diferencia;
    if (dif === 0) {
      delta.classList.add('res__delta--flat');
      uso.setAttribute('href', '#i-equal');
      $('resDeltaTxt').textContent = 'Justo tu gasto: ni sube ni baja';
    } else {
      delta.classList.remove('res__delta--flat');
      uso.setAttribute('href', dif < 0 ? '#i-down' : '#i-up');
      $('resDeltaTxt').textContent =
        (dif < 0 ? '−' : '+') + fmt(Math.abs(dif)) + ' kcal · ' +
        (dif < 0 ? 'déficit' : 'superávit') + ' del ' + Math.abs(r.pct) + ' %';
    }

    // Macros
    contarHasta($('gPro'), r.gPro, '<i>g</i>');
    contarHasta($('gCar'), r.gCar, '<i>g</i>');
    contarHasta($('gGra'), r.gGra, '<i>g</i>');
    $('kcalPro').textContent = fmt(r.kPro) + ' kcal';
    $('kcalCar').textContent = fmt(r.kCar) + ' kcal';
    $('kcalGra').textContent = fmt(r.kGra) + ' kcal';

    var total = r.kPro + r.kCar + r.kGra || 1;
    $('barPro').style.width = (r.kPro / total * 100) + '%';
    $('barCar').style.width = (r.kCar / total * 100) + '%';
    $('barGra').style.width = (r.kGra / total * 100) + '%';

    // Extras
    $('resAgua').innerHTML  = fmt1(r.agua) + '<small>L</small>';
    $('resImc').textContent    = fmt1(r.imc);
    $('resImcTxt').textContent = textoIMC(r.imc);

    var s = r.semanal;
    $('resRitmo').innerHTML = (Math.abs(s) < 0.05 ? '0' : (s < 0 ? '−' : '+') + fmt1(Math.abs(s)))
                            + '<small>kg/sem</small>';

    // Avisos
    var suelo = $('suelo');
    if (r.topado) {
      $('sueloTxt').innerHTML = 'Ese ritmo te dejaba por debajo de tu metabolismo basal, así que ' +
        'lo he subido hasta <b>' + fmt(r.objetivo) + ' kcal</b>. Bajar de ahí no acelera nada: ' +
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
    actualizarCtaResultado();
  }

  /* ══════════════════════════════════════════════════════════════════════
     5) COMPARTIR EL RESULTADO
     ══════════════════════════════════════════════════════════════════════ */

  var NOMBRE_OBJ = { perder: 'perder grasa', mantener: 'mantenerme', ganar: 'ganar músculo' };

  function resumen() {
    if (!ultimo) return '';
    var d = ultimo.d, r = ultimo.r;
    return 'Mis números de la calculadora del Método F90:\n\n' +
      '• Objetivo: ' + NOMBRE_OBJ[d.objetivo] + '\n' +
      '• Metabolismo basal: ' + fmt(r.tmb) + ' kcal\n' +
      '• Mantenimiento: ' + fmt(r.tdee) + ' kcal\n' +
      '• Comer al día: ' + fmt(r.objetivo) + ' kcal\n' +
      '• Proteína: ' + fmt(r.gPro) + ' g\n' +
      '• Carbohidratos: ' + fmt(r.gCar) + ' g\n' +
      '• Grasas: ' + fmt(r.gGra) + ' g';
  }

  function actualizarCtaResultado() {
    var a = $('ctaRes');
    if (!a) return;
    var url = enlaceContacto('Hola Álvaro, vengo de la calculadora.\n\n' + resumen() +
                             '\n\n¿Me ayudas a montar el plan?');
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
        proteina: $('proteina').value, tocada: proteinaTocada
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
