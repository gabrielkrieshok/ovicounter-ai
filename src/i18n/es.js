/* Spanish copy.
 *
 * Written against the same rules as en.js. The banned list translates too, and
 * the Spanish equivalents are the ones that would slip in most easily: modelo,
 * algoritmo, inferencia, confianza, aprender, enseñar, entrenar, subir,
 * cargando. None of them appear here. "Midiendo en este teléfono", never
 * "Cargando" — the whole point of that line is that nothing leaves the device.
 *
 * "IA" is not banned, following the same decision as en.js, but it also never
 * appears — the product name stays "OvicounterAI" untranslated, as names do.
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
    intro:
      'Fotografíe una tira de papel de ovitrampa. La aplicación marca lo que encuentra. Usted revisa las marcas — el conteo es suyo.',
  },

  menu: {
    open: 'Menú',
    close: 'Cerrar',
    home: 'Inicio',
    language: 'Idioma',
    endSession: 'Terminar esta sesión',
    about: 'Todo funciona en este teléfono. No se envía nada a ninguna parte a menos que usted lo comparta.',
    leaveTitle: '¿Salir de esta tira?',
    leaveBody:
      'Esta tira aún no se ha contado, así que se perderá. Las tiras que ya terminó están guardadas.',
    leaveStay: 'Quedarme en esta tira',
    leaveGo: 'Salir',
  },

  welcome: {
    previousSessions: 'Sesiones anteriores',
    stripCount: '{n} tiras',
    resumeDay: 'Continuar el {day}',
    resumeNext: 'Sin terminar · sigue la tira {n}',
    demoClean: 'Una tira limpia',
    demoCleanNote: 'Densa y con luz pareja — el caso fácil.',
    demoField: 'Una tira de campo, vista de lejos',
    demoFieldNote: 'Manchada y arrugada, con la mesa alrededor para recortar.',
    demoPattern: 'Un patrón de prueba',
    demoPatternNote: 'Óvalos dibujados en este teléfono. El resultado dice cuántos.',
    countSingle: 'Contar una sola tira de papel',
    countSingleNote: 'Con la cámara, una foto que ya está en este teléfono o una de tres fotos de demostración. No se guarda nada a menos que lo pida.',
    guideNote: 'Los cinco pasos de la foto al conteo, y qué significa cada marca.',
    footerLinks: 'Más',
    useCamera: 'Usar la cámara',
    useCameraNote: 'Fotografíe la tira ahora. La aplicación pedirá usar la cámara.',
    choosePhoto: 'Elegir una foto',
    choosePhotoNote: 'Una foto de una tira que ya está en este teléfono.',
    orDemo: 'O pruebe con una foto de ejemplo',
    sessionLink: '¿Va a contar varias tiras? Empiece una sesión',
    delete: 'Borrar',
    deleteTitle: '¿Borrar la sesión del {day}?',
    deleteBody: 'Sus {n} tiras, con sus fotos y marcas, se borrarán de este teléfono. No se puede deshacer.',
    deleteStay: 'Conservarla',
    deleteGo: 'Borrar',
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
    straighten: 'enderezar',
    rotate: 'Girar',
    rotateLeftName: 'Girar a la izquierda',
    rotateRightName: 'Girar a la derecha',
    straightenLeftName: 'Enderezar a la izquierda',
    straightenRightName: 'Enderezar a la derecha',
    undo: '↩ Deshacer',
    reset: 'Restablecer',
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
    lookTitle: 'Cómo se encontraron las marcas',
    lookHint: 'Toque un paso para ver esa imagen. Acerque para mirar de cerca; mantenga pulsado para ver la foto.',
    stepPhoto: 'FOTO',
    badgePhoto: 'LA FOTO',
  },

  refine: {
    ghostCaption: 'los anillos tenues se perdieron desde que empezó a mover',
    lightDarkSplit: 'Separación claro / oscuro',
    speckSize: 'Tamaño de la mota',
    tickCaption:
      'La marca rosa es el huevo que usted señaló. Pasarse de ahí haría que se perdiera su propio huevo.',
    backToStart: 'Volver al inicio',
    tickCaptionAuto:
      'La marca rosa es el tamaño de los huevos encontrados aquí. Pasarse de ahí haría que se perdieran los huevos de ese tamaño.',
    markAnEgg: '¿Las marcas se ven mal? Marque un huevo',
  },

  fixes: {
    title: 'Ajustar a mano',
    undo: '↩ deshacer',
    done: 'Listo — contarlas',
    adjust: '¿Las marcas se ven mal? Ajústelas',
    toolsLabel: 'Lo que hace un dedo',
    toolRemove: 'Quitar',
    toolKeep: 'Conservar',
    toolAdd: 'Añadir',
    toolSplit: 'Separar',
    hintRemove: 'Pase el dedo sobre las marcas para quitarlas.',
    hintKeep: 'Pase el dedo sobre las marcas para conservarlas; una marca quitada vuelve.',
    hintAdd: 'Toque un huevo sin marcar; un primer plano muestra dónde queda.',
    hintSplit: 'Pase el dedo a través de un grupo para separarlo.',
    twoFingers: 'Con dos dedos se mueve la tira.',
    clumpsOpen: 'Revisar los grupos · {done} de {total}',
    clumpOf: 'Grupo {n} de {total}',
    clumpHint: 'La app marcó ~{app}; por su tamaño caben unos {size}. Indique cuántos huevos ve.',
    clumpFewer: 'Un huevo menos',
    clumpMore: 'Un huevo más',
    clumpPrev: 'Anterior',
    clumpNext: 'Siguiente grupo',
    clumpLast: 'Terminar los grupos',
    clumpsDone: 'Volver a las herramientas',
    nudgeBody: '{n} correcciones hasta ahora. Si las marcas fallan igual en toda la tira, ajustar Medir puede encajar mejor que corregirlas una a una.',
    nudgeGo: 'Ajustar Medir',
    nudgeDismiss: 'Seguir corrigiendo',
    lookedAt: 'Revisado de cerca · {n} de {total} partes',
    zoomOut: 'Alejar',
    zoomIn: 'Acercar',
  },

  result: {
    title: 'Tira {n} — lista',
    sentence: '{n} huevos, revisados por usted — esta tira es {band}',
    unchecked: '~{n} encontrados por la aplicación. Usted no hizo cambios.',
    appFound: 'la app encontró ~{n}',
    testDrawn: 'Patrón de prueba: {n} dibujados',
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

  share: {
    button: 'Compartir',
    saved: 'Se guardó la imagen y se copió el resumen.',
    what: 'Una imagen: su foto, las marcas y el conteo.',
    previewAlt: 'La imagen que se compartirá',
    photoLabel: 'Su foto',
    marksChecked: 'Las marcas, revisadas por usted',
    marksFound: 'Las marcas que encontró la aplicación',
    countLabel: 'El conteo',
    footer: 'Contado en este teléfono con OvicounterAI',
  },

  about: {
    link: 'Acerca de',
    version: 'Versión {version}',
    whatTitle: 'Qué hace',
    what: 'OvicounterAI ayuda a contar huevos de mosquito en el papel de ovitrampa. Usted fotografía una tira; la aplicación marca lo que encuentra; usted revisa cada marca. El conteo es suyo.',
    whyTitle: 'Por qué marca de más',
    why: 'La aplicación marca más de lo debido a propósito. Quitar una marca equivocada es un toque; encontrar un huevo que se pasó por alto obliga a revisar toda la tira. Por eso la aplicación propone y usted decide.',
    recordTitle: 'Qué se guarda',
    record: 'En una sesión, cada tira se guarda en este teléfono con su foto, sus ajustes y cada marca que usted conservó, quitó o agregó, para que el conteo siempre pueda revisarse de nuevo. Contar una sola tira no guarda nada a menos que usted lo pida.',
    phoneTitle: 'En este teléfono',
    phone: 'Todo funciona en este teléfono. No se envía nada a ninguna parte a menos que usted decida compartirlo, y una vez abierta la aplicación funciona sin conexión.',
    openSourceTitle: 'Código abierto',
    openSource: 'OvicounterAI es de código abierto, con licencia Apache 2.0.',
  },

  guide: {
    open: 'Cómo funciona',
    title: 'Cómo funciona',
    intro: 'Una tira a la vez. La aplicación marca lo que encuentra; usted revisa las marcas, y el conteo es suyo. Todo funciona en este teléfono.',
    photo: 'Ponga la tira plana con buena luz y llene el recuadro con ella. Si los huevos se ven muy pequeños o la foto está borrosa, la aplicación lo dice y pide otra.',
    crop: 'La aplicación propone un recuadro alrededor de la tira. Arrastre las esquinas si no acertó, y enderece la tira si está inclinada.',
    measure: 'La aplicación encuentra un huevo típico en esta tira y marca cada mota de ese tamaño y tono, mostrando cada imagen que produce. Luego dos controles fijan qué tan oscura y qué tan grande debe ser una mota; muévalos hasta que los anillos queden sobre huevos y no sobre suciedad. Si las marcas aún se ven mal, marque usted un huevo y vuelve a medir a partir de él.',
    check: 'Ahora las marcas las juzga usted. Elija una herramienta —Quitar, Conservar, Añadir o Separar— y úsela con un dedo: pase el dedo sobre las marcas para quitarlas o conservarlas, toque un huevo sin marcar para añadirlo, pase el dedo a través de un grupo para separarlo. Con dos dedos, o con + y −, mueve la tira y mira de cerca. Una marca sigue azul hasta que usted haya visto de cerca su parte de la tira.',
    count: 'El conteo es cada marca que usted no quitó. Ubica la tira en un nivel. Un número gris con ~ delante es solo de la aplicación: nadie revisó esas marcas.',
    done: 'Entendido',
  },

  steps: {
    photo: 'Fotografiar',
    crop: 'Recortar',
    measure: 'Medir',
    check: 'Ajustar a mano',
    count: 'Contar',
    position: 'Paso {n} de {total}',
    skipped: 'omitido',
    backTo: 'Volver a {step}',
    continueTo: 'Seguir a {step}',
    redoTitle: '¿Buscar las marcas de nuevo?',
    redoBody: 'Esto vuelve a buscar las marcas de esta tira desde el principio. Se perderán las marcas que usted quitó, agregó o separó.',
    redoStay: 'Conservar mis cambios',
    redoGo: 'Buscarlas de nuevo',
    retakeTitle: '¿Tomar una foto nueva?',
    retakeBody: 'Una foto nueva empieza esta tira otra vez. Se perderán las marcas que usted quitó, agregó o separó en ella.',
    retakeStay: 'Conservar esta tira',
    retakeGo: 'Tomar una foto nueva',
  },

  markKey: {
    clump: 'usted los confirma',
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
