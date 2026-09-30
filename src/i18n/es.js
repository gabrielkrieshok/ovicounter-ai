/* Spanish copy.
 *
 * Written against the same rules as en.js. The banned list translates too, and
 * the Spanish equivalents are the ones that would slip in most easily: modelo,
 * algoritmo, inferencia, confianza, aprender, enseñar, entrenar, subir,
 * cargando. None of them appear here. "Midiendo en este teléfono", never
 * "Cargando" — the whole point of that line is that nothing leaves the device.
 *
 * "IA" is not banned, following the same decision as en.js, but it also never
 * appears — the product name stays "Ovicounter AI" untranslated, as names do.
 *
 * Register: `usted` throughout. These are instructions to a technician at work,
 * and the refusals in particular have to stay courteous while blaming the
 * photograph rather than the person.
 *
 * ---------------------------------------------------------------------------
 * NEEDS FIELD REVIEW before this goes to a Spanish-speaking technician
 *
 *   1. THE BAND NAMES. ninguno / pocos / muchos / abundante are a translation
 *      of placeholders. The English names are not settled either (§5.6), and
 *      these should be re-decided with the program that sets the edges, not
 *      carried over from a guess.
 *
 *   2. THE REFUSALS. They read correctly to me, but "blames the photo, never
 *      the person" is a question of register rather than vocabulary, and it is
 *      the one place where a stiff translation does real damage — this is the
 *      screen where a technician decides whether the tool is on their side.
 *
 *   3. REGIONAL FIT. The deployments in view are Guatemala, El Salvador,
 *      Jamaica and Portugal. Nothing here is Iberian-specific, but "recuadro",
 *      "mota" and "tira" are all worth checking against what technicians in
 *      those programs actually call these things.
 */

export default {
  app: {
    offline: 'FUNCIONA SIN CONEXIÓN ✓',
    intro:
      'Fotografíe una tira de papel de ovitrampa. La aplicación marca lo que encuentra. Usted revisa las marcas — el conteo es suyo.',
  },

  menu: {
    open: 'Menú',
    close: 'Cerrar',
    home: 'Inicio',
    language: 'Idioma',
    endSession: 'Terminar esta sesión',
    about: 'Todo funciona en este teléfono. No se envía nada a ninguna parte.',
    leaveTitle: '¿Salir de esta tira?',
    leaveBody:
      'Esta tira aún no se ha contado, así que se perderá. Las tiras que ya terminó están guardadas.',
    leaveStay: 'Quedarme en esta tira',
    leaveGo: 'Salir',
  },

  welcome: {
    startSession: 'Empezar una sesión nueva',
    tryDemo: 'Probarlo con una foto de ejemplo',
    previousSessions: 'Sesiones anteriores',
    stripCount: '{n} tiras',
    demoNote:
      'La foto de ejemplo recorre todo el proceso con una tira incluida. No se guarda nada.',
    marksTitle: 'Qué significan las marcas',
    resumeDay: 'Continuar el {day}',
    resumeNext: 'Sin terminar · sigue la tira {n}',
    countOne: 'Contar una tira',
  },

  capture: {
    strip: 'Tira {n}',
    guide: 'Llene el recuadro con la tira',
    fromPhotos: 'desde las fotos del teléfono',
    checkedTitle: 'Se revisa al momento',
    chipSharp: 'nítida ✓',
    chipClose: 'cerca ✓',
    chipEggs: 'huevos visibles ✓',
    sessionCode: '{code} · {day}',
    noCamera: 'Este dispositivo no tiene cámara. Abra una foto de la galería.',
  },

  refusal: {
    tooFarTitle: 'Demasiado lejos para contar',
    tooFarBody:
      'Los huevos de esta foto son demasiado pequeños para verlos. Acérquese hasta que la tira llene el recuadro, y tómela de nuevo.',
    tooBlurryTitle: 'Demasiado borrosa para contar',
    tooBlurryBody:
      'Los huevos de esta foto tienen los bordes difusos. Apoye el teléfono en la mesa para que no se mueva, y tómela de nuevo.',
    tooDarkTitle: 'Demasiado oscura para contar',
    tooDarkBody:
      'El papel de esta foto está demasiado oscuro para distinguir los huevos de la sombra. Póngalo con mejor luz, y tómela de nuevo.',
    noEggsTitle: 'No se encontraron huevos en esta foto',
    noEggsBody:
      'Nada en este papel parece un huevo. Revise que la tira esté en el recuadro, y tómela de nuevo.',
    yourPhoto: 'SU FOTO',
    closeEnough: 'LO SUFICIENTEMENTE CERCA',
    takeAgain: 'Tomarla de nuevo',
  },

  crop: {
    title: 'Recortar hasta la tira',
    stripBadge: 'TIRA {n}',
    rotateLeft: '⟲ girar',
    straighten: 'enderezar',
    rotateRight: '⟳',
    caption: 'El recuadro se propuso solo — arrastre las esquinas si no acertó.',
    useThisPhoto: 'Usar esta foto',
  },

  calibrate: {
    title: 'Toque un huevo que vea con claridad',
    sub: 'Su tamaño y qué tan oscuro es ajustan la búsqueda en todas las tiras de hoy.',
    echo: 'Se encontraron {n} más del mismo tamaño',
    pickAnother: 'Elegir otro',
    go: 'Se ve bien — seguir',
    missed: 'Ahí solo hay papel. Toque directamente sobre un huevo.',
    tapBigger: 'Eso parece más grande que la mayoría de los huevos aquí. ¿Elegir otro?',
    tapSmaller: 'Eso parece más pequeño que la mayoría de los huevos aquí. ¿Elegir otro?',
    keepMarks: 'Conservar las marcas',
  },

  processing: {
    title: 'Midiendo en este teléfono…',
    stepLightDark: 'CLARO / OSCURO',
    stepDarkSpecks: 'MOTAS OSCURAS',
    stepBoxes: 'RECUADROS',
    stepMarks: 'MARCAS',
    badgeBoxes: 'RECUADROS TRAZADOS',
    badgeLightDark: 'CLARO Y OSCURO SEPARADOS',
    badgeDarkSpecks: 'MOTAS OSCURAS CONSERVADAS',
    badgeMarks: 'MARCAS COLOCADAS',
  },

  refine: {
    title: 'Ajustar las marcas',
    photoToggle: 'foto 👁',
    ghostCaption: 'los anillos tenues se perdieron desde que empezó a mover',
    lightDarkSplit: 'Separación claro / oscuro',
    speckSize: 'Tamaño de la mota',
    tickCaption:
      'La marca rosa es el huevo que usted señaló. Pasarse de ahí haría que se perdiera su propio huevo.',
    backToStart: 'Volver al inicio',
    marksLookRight: 'Las marcas están bien →',
    tickCaptionAuto:
      'La marca rosa es el tamaño de los huevos encontrados aquí. Pasarse de ahí haría que se perdieran los huevos de ese tamaño.',
    markAnEgg: '¿Las marcas se ven mal? Marque un huevo',
  },

  fixes: {
    title: 'Revise las marcas',
    undo: '↩ deshacer',
    done: 'Listo — contarlas',
    adjust: '¿Las marcas se ven mal? Ajústelas',
    cellTap: 'Tocar = quitar',
    cellHold: 'Mantener = agregar',
    cellLine: 'Línea = separar',
    step1: 'Toque una marca para quitarla',
    step2: 'Mantenga pulsado el papel vacío para agregar un huevo',
    step3: 'Trace una línea sobre un grupo para separarlo',
    lookedAt: 'Revisado de cerca · {n} de {total} partes',
    zoomOut: 'Alejar',
    zoomIn: 'Acercar',
  },

  result: {
    title: 'Tira {n} — lista',
    sentence: '{n} huevos, revisados por usted — esta tira es {band}',
    unchecked: '~{n} encontrados por la aplicación. Usted no hizo cambios.',
    partsNotLooked: 'Sin revisar de cerca: {n} de {total} partes',
    saved: 'GUARDADO EN ESTE TELÉFONO ✓',
    notSavedDemo: 'EJEMPLO — NO SE GUARDÓ',
    notSavedYet: 'AÚN NO SE GUARDA',
    endSession: 'Terminar sesión',
    nextStrip: 'Siguiente tira →',
    notSavedQuick: 'NO GUARDADO',
    countAnother: 'Contar otra',
    startSession: 'Iniciar una sesión con estos ajustes',
  },

  summary: {
    title: 'Sesión terminada',
    meta: '{day} · {minutes} min',
    stripsCounted: 'tiras contadas',
    retakesAsked: 'fotos repetidas',
    bands: 'niveles',
    saved:
      'Registro guardado en este teléfono — fotos, ajustes y cada marca que usted revisó.',
    demoNotSaved: 'Esto fue el ejemplo. No se guardó nada.',
    backHome: 'Volver al inicio',
  },

  markKey: {
    found: 'encontrada por la aplicación',
    kept: 'usted la conservó',
    removed: 'usted la quitó',
    added: 'usted agregó uno',
  },

  tally: {
    kept: 'conservadas',
    removed: 'quitadas',
    added: 'agregadas',
    split: 'separadas',
  },

  badge: {
    notChecked: 'Sin revisar',
    notCheckedCount: '{n} sin revisar',
  },

  bands: {
    none: 'ninguno',
    few: 'pocos',
    many: 'muchos',
    heavy: 'abundante',
  },
}
