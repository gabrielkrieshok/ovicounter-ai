/* Portuguese copy — European Portuguese (pt-PT).
 *
 * Written against the same rules as en.js. The banned list translates too, and
 * the Portuguese equivalents that would slip in most easily are: modelo,
 * algoritmo, inferência, confiança, aprender, ensinar, treinar — and CARREGAR,
 * which in Portuguese is both "upload" and "loading", so it is doubly out. None
 * of them appear here. "A medir neste telemóvel", never "A carregar".
 *
 * "IA" is not banned, following en.js, but it never appears — the product name
 * stays "Ovicounter AI" untranslated, as names do.
 *
 * Register: formal, third-person imperative with no pronoun ("Toque", "Tire-a
 * de novo"), and "por si" where a subject is needed. That is the courteous
 * register in Portugal; "você" can read as curt there and is avoided.
 *
 * ---------------------------------------------------------------------------
 * NEEDS FIELD REVIEW before this goes to a Portuguese-speaking technician
 *
 *   1. PORTUGAL, NOT BRAZIL. The device language is matched on its base tag,
 *      so a phone set to pt-BR gets this bundle too. It reads as European
 *      Portuguese to a Brazilian — "telemóvel" (BR: celular), "câmara"
 *      (câmera), "aplicação" (aplicativo), "ecrã" is avoided — understandable
 *      but foreign. If a Brazilian program comes into view, it needs its own
 *      bundle, not edits to this one.
 *
 *   2. THE BAND NAMES AND THE RESULT SENTENCE. English says "this strip is
 *      {band}"; Portuguese cannot put "nenhum" after "é", so the sentence reads
 *      "nível desta tira: {band}" instead. nenhum / poucos / muitos / intenso
 *      are translations of placeholders, like es.js, and should be re-decided
 *      with the program that sets the edges.
 *
 *   3. THE VOCABULARY OF THE TRAP. "ovitrampa", "tira" and "ponto" (for a dark
 *      speck) are the obvious words; what technicians in the Portuguese
 *      surveillance programme actually call the strip and the paper is worth
 *      checking — "palheta" is used for a wooden paddle in some programmes.
 *
 *   4. THE REFUSALS, for the same reason as es.js: they blame the photograph,
 *      never the person, and that is register rather than vocabulary.
 */

export default {
  app: {
    offline: 'FUNCIONA SEM INTERNET ✓',
    intro:
      'Fotografe uma tira de papel da ovitrampa. A aplicação marca o que encontra. Verifique as marcas — a contagem é sua.',
  },

  menu: {
    open: 'Menu',
    close: 'Fechar',
    home: 'Início',
    language: 'Idioma',
    endSession: 'Terminar esta sessão',
    about: 'Tudo funciona neste telemóvel. Nada é enviado para lado nenhum.',
    leaveTitle: 'Sair desta tira?',
    leaveBody:
      'Esta tira ainda não foi contada, por isso vai perder-se. As tiras que já terminou estão guardadas.',
    leaveStay: 'Ficar nesta tira',
    leaveGo: 'Sair',
  },

  welcome: {
    startSession: 'Começar uma sessão nova',
    tryDemo: 'Experimentar com uma foto de exemplo',
    previousSessions: 'Sessões anteriores',
    stripCount: '{n} tiras',
    demoNote:
      'A foto de exemplo percorre todo o processo com uma tira incluída. Nada é guardado.',
    resumeDay: 'Retomar {day}',
    resumeNext: 'Por terminar · segue a tira {n}',
    countOne: 'Contar uma tira',
    otherDemos: 'Outras fotos de exemplo',
    demoField: 'Uma tira de campo, vista de longe',
    demoFieldNote: 'Manchada e amarrotada, com a mesa à volta para recortar.',
    demoPattern: 'Um padrão de teste',
    demoPatternNote: 'Ovais desenhadas neste telemóvel. O resultado diz quantas.',
    countOneNote: 'De uma foto a um número. Nada é guardado a não ser que peça.',
    startSessionNote: 'Tira após tira, com as definições mantidas e cada tira guardada neste telemóvel.',
  },

  capture: {
    strip: 'Tira {n}',
    guide: 'Preencha o enquadramento com a tira',
    fromPhotos: 'das fotos do telemóvel',
    checkedTitle: 'Verificada ao chegar',
    chipSharp: 'nítida ✓',
    chipClose: 'perto ✓',
    chipEggs: 'ovos visíveis ✓',
    sessionCode: '{code} · {day}',
    noCamera: 'Este aparelho não tem câmara. Abra uma foto da galeria.',
  },

  refusal: {
    tooFarTitle: 'Demasiado longe para contar',
    tooFarBody:
      'Os ovos nesta foto são demasiado pequenos para se verem. Aproxime-se até a tira preencher o enquadramento, e tire-a de novo.',
    tooBlurryTitle: 'Demasiado desfocada para contar',
    tooBlurryBody:
      'Os ovos nesta foto têm os contornos esbatidos. Apoie o telemóvel na mesa para não se mexer, e tire-a de novo.',
    tooDarkTitle: 'Demasiado escura para contar',
    tooDarkBody:
      'O papel nesta foto está demasiado escuro para distinguir os ovos da sombra. Coloque-o com melhor luz, e tire-a de novo.',
    noEggsTitle: 'Não se encontraram ovos nesta foto',
    noEggsBody:
      'Nada neste papel parece um ovo. Confirme que a tira está no enquadramento, e tire-a de novo.',
    yourPhoto: 'A SUA FOTO',
    closeEnough: 'SUFICIENTEMENTE PERTO',
    takeAgain: 'Tirar de novo',
  },

  crop: {
    title: 'Recortar à volta da tira',
    stripBadge: 'TIRA {n}',
    rotateLeft: '⟲ rodar',
    straighten: 'endireitar',
    rotateRight: '⟳',
    caption: 'Recorte proposto automaticamente — arraste os cantos se não acertou.',
    useThisPhoto: 'Usar esta foto',
  },

  calibrate: {
    title: 'Toque num ovo que veja bem',
    sub: 'O tamanho e o tom desse ovo afinam a procura em todas as tiras de hoje.',
    echo: 'Encontrados mais {n} do mesmo tamanho',
    pickAnother: 'Escolher outro',
    go: 'Parece bem — seguir',
    missed: 'Aí só há papel. Toque diretamente num ovo.',
    tapBigger: 'Esse parece maior do que a maioria dos ovos aqui. Escolher outro?',
    tapSmaller: 'Esse parece mais pequeno do que a maioria dos ovos aqui. Escolher outro?',
    keepMarks: 'Manter as marcas',
  },

  processing: {
    title: 'A medir neste telemóvel…',
    stepLightDark: 'CLARO / ESCURO',
    stepDarkSpecks: 'PONTOS ESCUROS',
    stepBoxes: 'CAIXAS',
    stepMarks: 'MARCAS',
    badgeBoxes: 'CAIXAS DESENHADAS',
    badgeLightDark: 'CLARO E ESCURO SEPARADOS',
    badgeDarkSpecks: 'PONTOS ESCUROS MANTIDOS',
    badgeMarks: 'MARCAS COLOCADAS',
  },

  refine: {
    title: 'Afinar as marcas',
    photoToggle: 'foto 👁',
    ghostCaption: 'anéis ténues = perdidos desde que começou a mexer',
    lightDarkSplit: 'Separação claro / escuro',
    speckSize: 'Tamanho do ponto',
    tickCaption:
      'Traço rosa = o ovo que marcou. Passar dele faz perder o seu próprio ovo.',
    backToStart: 'Voltar ao início',
    marksLookRight: 'As marcas estão bem →',
    tickCaptionAuto:
      'Traço rosa = o tamanho dos ovos encontrados aqui. Passar dele faz perder os ovos desse tamanho.',
    markAnEgg: 'As marcas parecem erradas? Marque um ovo',
  },

  fixes: {
    title: 'Verifique as marcas',
    undo: '↩ anular',
    done: 'Concluído — contá-las',
    adjust: 'As marcas parecem erradas? Ajuste-as',
    cellTap: 'Tocar = retirar',
    cellHold: 'Premir = acrescentar',
    cellLine: 'Linha = separar',
    step1: 'Toque numa marca para a retirar',
    step2: 'Mantenha premido o papel vazio para acrescentar um ovo',
    step3: 'Trace uma linha sobre um aglomerado para o separar',
    lookedAt: 'Vista de perto · {n} de {total} partes',
    zoomOut: 'Afastar',
    zoomIn: 'Aproximar',
  },

  result: {
    title: 'Tira {n} — concluída',
    sentence: '{n} ovos, verificados por si — nível desta tira: {band}',
    unchecked: '~{n} encontrados pela aplicação. Não fez alterações.',
    partsNotLooked: 'Não vistas de perto: {n} de {total} partes',
    testDrawn: 'Padrão de teste: {n} desenhados',
    saved: 'GUARDADO NESTE TELEMÓVEL ✓',
    notSavedDemo: 'EXEMPLO — NÃO GUARDADO',
    notSavedYet: 'AINDA NÃO GUARDADO',
    endSession: 'Terminar sessão',
    nextStrip: 'Tira seguinte →',
    notSavedQuick: 'NÃO GUARDADO',
    countAnother: 'Contar outra',
    startSession: 'Começar uma sessão com estas definições',
  },

  summary: {
    title: 'Sessão concluída',
    meta: '{day} · {minutes} min',
    stripsCounted: 'tiras contadas',
    retakesAsked: 'fotos repetidas',
    bands: 'níveis',
    saved:
      'Registo guardado neste telemóvel — fotos, definições e cada marca que verificou.',
    demoNotSaved: 'Isto foi o exemplo. Nada foi guardado.',
    backHome: 'Voltar ao início',
  },

  guide: {
    open: 'Como funciona',
    title: 'Como funciona',
    intro: 'Uma tira de cada vez. A aplicação marca o que encontra; verifica as marcas, e a contagem é sua. Tudo funciona neste telemóvel.',
    photo: 'Coloque a tira plana com boa luz e preencha o enquadramento com ela. Se os ovos parecerem demasiado pequenos ou a foto estiver desfocada, a aplicação diz e pede outra.',
    crop: 'A aplicação propõe um recorte à volta da tira. Arraste os cantos se não acertou, e endireite a tira se estiver inclinada.',
    measure: 'A aplicação encontra um ovo típico nesta tira e marca cada ponto desse tamanho e tom. Se as marcas parecerem erradas, pode marcar um ovo e ela volta a medir a partir dele.',
    refine: 'Dois controlos: quão escuro tem de ser um ponto, e quão grande. Mova-os até os anéis ficarem sobre ovos e não sobre sujidade. O traço rosa mostra o tamanho dos ovos encontrados.',
    check: 'Cada marca é sua para julgar. Toque numa marca para a retirar. Mantenha premido o papel vazio para acrescentar um ovo. Trace uma linha sobre um aglomerado para o separar. Afaste os dedos, ou use + e −, para ver de perto. Uma marca fica azul até ter visto de perto a parte da tira onde está.',
    count: 'A contagem é cada marca que não retirou. Coloca a tira num nível. Um número cinzento com ~ à frente é só da aplicação: ninguém verificou essas marcas.',
    done: 'Entendido',
  },

  steps: {
    photo: 'Fotografar',
    crop: 'Recortar',
    measure: 'Medir',
    refine: 'Afinar',
    check: 'Verificar as marcas',
    count: 'Contar',
    position: 'Passo {n} de {total}',
    redoTitle: 'Procurar as marcas de novo?',
    redoBody: 'Isto volta a procurar as marcas desta tira desde o início. Perdem-se as marcas que retirou, acrescentou ou separou.',
    redoStay: 'Manter as minhas correções',
    redoGo: 'Procurá-las de novo',
    retakeTitle: 'Tirar uma foto nova?',
    retakeBody: 'Uma foto nova recomeça esta tira. Perdem-se as marcas que retirou, acrescentou ou separou nela.',
    retakeStay: 'Manter esta tira',
    retakeGo: 'Tirar uma foto nova',
  },

  markKey: {
    found: 'encontrada pela aplicação',
    kept: 'mantida por si',
    removed: 'retirada por si',
    added: 'acrescentada por si',
  },

  tally: {
    kept: 'mantidas',
    removed: 'retiradas',
    added: 'acrescentadas',
    split: 'separadas',
  },

  badge: {
    notChecked: 'Não verificada',
    notCheckedCount: '{n} não verificadas',
  },

  bands: {
    none: 'nenhum',
    few: 'poucos',
    many: 'muitos',
    heavy: 'intenso',
  },
}
