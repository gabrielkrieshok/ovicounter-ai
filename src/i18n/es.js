/* Spanish copy.
 *
 * Written against the same rules as en.js (AGENTS.md "Copy", Oct 2026): the
 * copy never credits the machine with a judgment it did not make, and never
 * says the app learns from use. There is no banned-words list any more —
 * "entrenar", "detector", "subir" are fine where accurate — but "Cargando" is
 * still wrong for measuring. The product name stays "OvicounterAI"
 * untranslated, as names do.
 *
 * NEW IN OCT 2026, NEEDS REVIEW: the About page (rewritten Oct 1 — today,
 * where it is going, the shared repository being built) and the short lines
 * that dropped "en este teléfono".
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
    about: "Una prueba de concepto que funciona, compartida con socios para probarla con tiras reales.",
    settings: 'Ajustes',
    exportSettings: 'Guardar ajustes',
    importSettings: 'Abrir ajustes',
    clearSettings: 'Dejar de usarlos',
    settingsInUse: 'Los conteos nuevos parten de {name}.',
    settingsSaved: 'Guardado en las descargas de este dispositivo.',
    settingsOpened: 'Abierto. Los conteos nuevos parten de estos ajustes; las demostraciones no.',
    settingsBad: 'Ese archivo no contiene ajustes de OvicounterAI.',
    settingsNewer: 'Ese archivo es de una versión más nueva de OvicounterAI. Actualice la app para abrirlo.',
    settingsNone: 'Cuente una tira primero; después podrá guardar sus ajustes.',
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
    demoPatternNote: 'Óvalos dibujados por la aplicación. El resultado dice cuántos.',
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
    title: 'Midiendo…',
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
    cvBlackHat: 'Black-hat',
    cvThreshold: 'Umbral',
    cvComponents: 'Compo\u00ADnentes',
    cvWatershed: 'Water\u00ADshed',
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
    threshold: 'Umbral',
    thresholdNote: 'Cuánto más oscura que su propio papel debe ser una mota.',
    minArea: 'Área mínima',
    minAreaNote: 'Qué tan grande debe ser una mota, en píxeles.',
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
    hintRemove: 'Pase el dedo sobre las marcas para quitarlas.',
    hintKeep: 'Pase el dedo sobre las marcas para conservarlas; una marca quitada vuelve.',
    hintAdd: 'Toque el papel vacío para añadir un huevo, o una marca o un grupo para sumarle uno más.',
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
    saveJson: 'Guardar como archivo (JSON)',
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
    saveCsv: 'Guardar como hoja de cálculo (CSV)',
    saveJson: 'Guardar todo (JSON)',
    title: 'Sesión terminada',
    meta: '{day} · {minutes} min',
    stripsCounted: 'tiras contadas',
    retakesAsked: 'fotos repetidas',
    bands: 'niveles',
    saved:
      'Registro guardado — fotos, ajustes y cada marca que usted revisó.',
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
    footer: 'Contado con OvicounterAI',
  },

  about: {
    link: "Acerca de",
    version: "Versión {version}",
    lede: "Una aplicación de código abierto que ayuda al personal de salud y a investigadores a contar huevos de mosquito en tiras de ovitrampa, con un teléfono común, con o sin conexión a internet.",
    pocTitle: "Una prueba de concepto",
    poc: "OvicounterAI («ovi», del latín «huevo») es una prueba de concepto que funciona, compartida con socios para probarla con tiras reales y mejorarla. Ningún programa de vigilancia la usa todavía, y sus conteos aún no se han comparado con conteos manuales cuidadosos, así que tome sus números como una prueba del enfoque y no como datos para actuar. El equipo trabaja en las siguientes fases de desarrollo: la recopilación de imágenes, ajustes predefinidos para distintos programas y entornos, y una asistencia más avanzada de visión por computadora con IA.",
    problemTitle: "Por qué contar huevos de mosquito",
    problem: "Una ovitrampa (trampa de oviposición) es un recipiente oscuro con agua que atrae a las hembras de los mosquitos Aedes para que pongan sus huevos en una tira de papel o una paleta de madera colocada dentro. Son los mosquitos, como Ae. aegypti y Ae. albopictus, que transmiten dengue, zika y chikungunya. Una vez seca la tira, alguien la inspecciona y cuenta (o estima) los huevos. Las trampas cuestan centavos y se colocan por cientos, y los huevos son la señal más temprana de que la población de mosquitos está cambiando, semanas antes de que aparezcan los adultos que pican.\n\nUna de las partes más lentas y difíciles del proceso es el conteo mismo, que todavía suele hacerse a mano. Un técnico cuenta motas del tamaño de una semilla de amapola (o más pequeñas), a menudo cientos en una tira, a simple vista. Es lento y cansado, y dos personas rara vez llegan al mismo número.",
    whatTitle: "Qué hace OvicounterAI",
    what: "Usted fotografía una tira y la aplicación marca cada mota que podría ser un huevo. Puede ajustar cómo detecta los huevos y luego corregir rápidamente las marcas a mano (confirmando, quitando y añadiendo huevos), y el conteo es suyo.\n\nUna vez abierta, la aplicación funciona sin conexión. Una sesión guarda cada tira sobre la marcha, y cualquier resultado o conjunto de ajustes se puede guardar como archivo o compartir.\n\nOvicounterAI es de código abierto, con licencia Apache 2.0; el código y el razonamiento detrás son públicos.",
    todayTitle: "Cómo encuentra OvicounterAI los huevos hoy",
    today: "OvicounterAI usa visión por computadora clásica (OpenCV), no una red neuronal. Quita el sombreado propio del papel (una transformación black-hat), conserva lo que es claramente más oscuro que el papel (un umbral), separa las motas oscuras (componentes conexos) y aparta los huevos que se tocan (un watershed). El paso Medir de la aplicación muestra cada una de estas imágenes, para que vea cómo se encontró cada marca.\n\nEste enfoque permite que la aplicación funcione en el navegador de un teléfono de gama media, sin una descarga grande. También la hace flexible. Se puede ajustar a distintos tipos de papel de ovitrampa y a distintas condiciones para tomar la foto, ya sea en un laboratorio de campo o en el campo mismo. No necesita una cámara especial ni equipo de posicionamiento, y no necesita cientos de fotos marcadas antes de poder usarse.\n\nAsí que hoy OvicounterAI es una herramienta de apoyo al conteo manual más que un contador automático, y cada tira contada con ella ayuda a construir los datos de entrenamiento para la siguiente fase.",
    nextTitle: "Hacia dónde va",
    next: "Cada tira revisada en OvicounterAI se convierte en un registro útil: la foto, los ajustes y la posición de cada huevo que una persona confirmó. Eso es lo que hace falta para entrenar un detector de huevos: ejemplos etiquetados de huevos en papel real, con luz real, de muchos lugares.\n\nEstamos construyendo la manera de reunir esos datos de programas de distintos países: una forma de que los equipos suban tiras revisadas y se coordinen entre sitios, programas y países, en un repositorio compartido de datos de entrenamiento.\n\nUn detector entrenado con ese repositorio sustituiría los pasos clásicos de hoy, detrás de la misma revisión: propondría, y la persona seguiría decidiendo. Cada versión se probaría, quedaría fija para su lanzamiento y se publicaría abiertamente, como el resto de la aplicación.\n\nHabrá más sobre esto a medida que avance.",
    teamTitle: "El equipo detrás de OvicounterAI",
    team: "OvicounterAI nace de una herramienta anterior para contar huevos en ovitrampas que Gabriel Krieshok y Carolina Torres Gutierrez construyeron en 2018–19 para la respuesta al zika en Jamaica, El Salvador y Guatemala. En 2025 se sumaron Gonçalo Seixas y Gonçalo Alves, en Portugal.",
    licence: "Código abierto, con licencia Apache 2.0.",
  },

  guide: {
    open: 'Cómo funciona',
    title: 'Cómo funciona',
    intro: 'Una tira a la vez. La aplicación marca lo que encuentra; usted revisa las marcas, y el conteo es suyo.',
    photo: 'Ponga la tira plana con buena luz y llene el recuadro con ella. Si los huevos se ven muy pequeños o la foto está borrosa, la aplicación lo dice y pide otra.',
    crop: 'La aplicación propone un recuadro alrededor de la tira. Arrastre las esquinas si no acertó, y enderece la tira si está inclinada.',
    measure: 'La aplicación encuentra un huevo típico en esta tira y marca cada mota de ese tamaño y tono, mostrando cada imagen que produce. Luego dos controles fijan qué tan oscura y qué tan grande debe ser una mota; muévalos hasta que los anillos queden sobre huevos y no sobre suciedad. Si las marcas aún se ven mal, marque usted un huevo y vuelve a medir a partir de él.',
    check: 'Ahora las marcas las juzga usted. Elija una herramienta —Quitar, Conservar o Añadir— y úsela con un dedo: pase el dedo sobre las marcas para quitarlas o conservarlas; toque el papel vacío para añadir un huevo, o una marca o un grupo para sumarle uno más. Los huevos que se tocan se dibujan como un solo contorno con un número; revise los grupos uno a uno y fije cada número. Con dos dedos, o con + y −, mueve la tira y mira de cerca. Una marca sigue azul hasta que usted haya visto de cerca su parte de la tira.',
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
    redoBody: 'Esto vuelve a buscar las marcas de esta tira desde el principio. Se perderán las marcas que usted quitó, agregó o cambió.',
    redoStay: 'Conservar mis cambios',
    redoGo: 'Buscarlas de nuevo',
    retakeTitle: '¿Tomar una foto nueva?',
    retakeBody: 'Una foto nueva empieza esta tira otra vez. Se perderán las marcas que usted quitó, agregó o cambió en ella.',
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
    clumps: 'grupos revisados',
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
