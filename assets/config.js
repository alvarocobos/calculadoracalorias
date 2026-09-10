/* ============================================================================
   MÉTODO F90 — CONFIGURACIÓN DE LA CALCULADORA
   ----------------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas tocar para poner la página en marcha.
   Mismos datos que en transformaciones.alvarocobos.com, para que todo apunte
   al mismo sitio.
   ========================================================================== */

const CONFIG = {
  marca:  "Álvaro Cobos",
  metodo: "Método F90",

  // Tu número de WhatsApp con prefijo de país y SIN espacios, + ni guiones.
  whatsapp: "34633164871",

  // Mensaje con el que se abre WhatsApp desde los botones generales.
  mensajeWhatsapp:
    "Hola Álvaro, vengo de la calculadora de calorías y quiero información sobre el Método F90",

  // Tu usuario de Instagram, sin la @
  instagram: "_alvarotrainer",

  // OPCIONAL: si tienes formulario de aplicación o calendario (Typeform,
  // Calendly, Tally...), pon aquí la URL y los botones apuntarán ahí en vez
  // de a WhatsApp. Déjalo vacío ("") para seguir usando WhatsApp.
  urlAplicar: "",

  // Enlaces a tus otras páginas (salen en la cabecera y en el pie).
  webCambios:    "https://transformaciones.alvarocobos.com",
  webBienvenida: "https://bienvenida.alvarocobos.com",

  /* --------------------------------------------------------------------------
     AJUSTES DE CÁLCULO
     Solo tócalos si sabes lo que haces: cambian los números que ve la gente.
     ----------------------------------------------------------------------- */
  ajustes: {
    // Porcentaje sobre el gasto total según el objetivo y el ritmo elegido.
    // Negativo = déficit (perder grasa). Positivo = superávit (ganar músculo).
    ritmos: {
      perder:    { suave: -10, moderado: -20, agresivo: -25 },
      mantener:  { unico: 0 },
      ganar:     { suave: +5,  moderado: +10, agresivo: +15 }
    },

    // Gramos de proteína por kilo de peso corporal, según objetivo.
    proteina: { perder: 2.2, mantener: 1.8, ganar: 2.0 },

    // Porcentaje de las calorías que van a grasa (con un mínimo por kilo,
    // para no bajar de lo que el sistema hormonal necesita).
    grasaPorcentaje: 25,
    grasaMinimaPorKg: 0.6,

    // Suelo de seguridad: nunca se recomienda comer por debajo de este
    // porcentaje del metabolismo basal.
    sueloSobreTMB: 1.0,

    // Mililitros de agua por kilo de peso corporal.
    aguaPorKg: 35
  }
};
