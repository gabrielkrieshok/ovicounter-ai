/* Portuguese copy — European Portuguese (pt-PT).
 *
 * Written against the same rules as en.js (AGENTS.md "Copy", Oct 2026): the
 * copy never credits the machine with a judgment it did not make, and never
 * says the app learns from use. There is no banned-words list any more —
 * "treinar", "detetor", "enviar" are fine where accurate — but "A carregar" is
 * still wrong for measuring. The product name stays "OvicounterAI"
 * untranslated, as names do.
 *
 * NEW IN OCT 2026, NEEDS REVIEW: the About page (rewritten Oct 1 — today,
 * where it is going, the shared repository being built) and the short lines
 * that dropped "neste telemóvel".
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
    intro:
      'Fotografe uma tira de papel da ovitrampa. A aplicação marca o que encontra. Verifique as marcas — a contagem é sua.',
  },

  menu: {
    open: 'Menu',
    close: 'Fechar',
    home: 'Início',
    language: 'Idioma',
    endSession: 'Terminar esta sessão',
    about: "Uma prova de conceito que funciona, partilhada com parceiros para ser experimentada em tiras reais.",
    settings: 'Definições',
    exportSettings: 'Guardar definições',
    importSettings: 'Abrir definições',
    clearSettings: 'Deixar de as usar',
    settingsInUse: 'As novas contagens partem de {name}.',
    settingsSaved: 'Guardado nas transferências deste dispositivo.',
    settingsOpened: 'Aberto. As novas contagens partem destas definições; as demonstrações não.',
    settingsBad: 'Esse ficheiro não contém definições do OvicounterAI.',
    settingsNewer: 'Esse ficheiro é de uma versão mais recente do OvicounterAI. Atualize a app para o abrir.',
    settingsNone: 'Conte primeiro uma tira; depois poderá guardar as suas definições.',
    leaveTitle: 'Sair desta tira?',
    leaveBody:
      'Esta tira ainda não foi contada, por isso vai perder-se. As tiras que já terminou estão guardadas.',
    leaveStay: 'Ficar nesta tira',
    leaveGo: 'Sair',
  },

  welcome: {
    previousSessions: 'Sessões anteriores',
    stripCount: '{n} tiras',
    resumeDay: 'Retomar {day}',
    resumeNext: 'Por terminar · segue a tira {n}',
    demoClean: 'Uma tira limpa',
    demoCleanNote: 'Densa e com luz uniforme — o caso fácil.',
    demoField: 'Uma tira de campo, vista de longe',
    demoFieldNote: 'Manchada e amarrotada, com a mesa à volta para recortar.',
    demoPattern: 'Um padrão de teste',
    demoPatternNote: 'Ovais desenhadas pela aplicação. O resultado diz quantas.',
    countSingle: 'Contar uma única tira de papel',
    countSingleNote: 'Com a câmara, uma foto que já está neste telemóvel ou uma de três fotos de demonstração. Nada é guardado a não ser que o peça.',
    guideNote: 'Os cinco passos da foto à contagem, e o que significa cada marca.',
    footerLinks: 'Mais',
    useCamera: 'Usar a câmara',
    useCameraNote: 'Fotografe a tira agora. A aplicação vai pedir para usar a câmara.',
    choosePhoto: 'Escolher uma foto',
    choosePhotoNote: 'Uma foto de uma tira que já está neste telemóvel.',
    orDemo: 'Ou experimente com uma foto de exemplo',
    sessionLink: 'Vai contar várias tiras? Comece uma sessão',
    delete: 'Apagar',
    deleteTitle: 'Apagar a sessão de {day}?',
    deleteBody: 'As suas {n} tiras, com as fotos e as marcas, vão ser apagadas deste telemóvel. Não é possível desfazer.',
    deleteStay: 'Mantê-la',
    deleteGo: 'Apagar',
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
    straighten: 'endireitar',
    rotate: 'Rodar',
    rotateLeftName: 'Rodar para a esquerda',
    rotateRightName: 'Rodar para a direita',
    straightenLeftName: 'Endireitar para a esquerda',
    straightenRightName: 'Endireitar para a direita',
    undo: '↩ Anular',
    reset: 'Repor',
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
    title: 'A medir…',
    stepLightDark: 'CLARO / ESCURO',
    stepDarkSpecks: 'PONTOS ESCUROS',
    stepBoxes: 'CAIXAS',
    stepMarks: 'MARCAS',
    badgeBoxes: 'CAIXAS DESENHADAS',
    badgeLightDark: 'CLARO E ESCURO SEPARADOS',
    badgeDarkSpecks: 'PONTOS ESCUROS MANTIDOS',
    badgeMarks: 'MARCAS COLOCADAS',
    lookTitle: 'Como foram encontradas as marcas',
    lookHint: 'Toque num passo para ver essa imagem. Aproxime para ver de perto; mantenha premido para ver a foto.',
    cvBlackHat: 'Black-hat',
    cvThreshold: 'Limiar',
    cvComponents: 'Compo\u00ADnentes',
    cvWatershed: 'Water\u00ADshed',
    stepPhoto: 'FOTO',
    badgePhoto: 'A FOTO',
  },

  refine: {
    ghostCaption: 'anéis ténues = perdidos desde que começou a mexer',
    lightDarkSplit: 'Separação claro / escuro',
    speckSize: 'Tamanho do ponto',
    tickCaption:
      'Traço rosa = o ovo que marcou. Passar dele faz perder o seu próprio ovo.',
    backToStart: 'Voltar ao início',
    tickCaptionAuto:
      'Traço rosa = o tamanho dos ovos encontrados aqui. Passar dele faz perder os ovos desse tamanho.',
    threshold: 'Limiar',
    thresholdNote: 'Quanto mais escuro do que o seu próprio papel tem de ser um ponto.',
    minArea: 'Área mínima',
    minAreaNote: 'Quão grande tem de ser um ponto, em píxeis.',
    markAnEgg: 'As marcas parecem erradas? Marque um ovo',
  },

  fixes: {
    title: 'Afinar à mão',
    undo: '↩ anular',
    done: 'Concluído — contá-las',
    adjust: 'As marcas parecem erradas? Ajuste-as',
    toolsLabel: 'O que faz um dedo',
    toolRemove: 'Retirar',
    toolKeep: 'Manter',
    toolAdd: 'Acrescentar',
    hintRemove: 'Passe o dedo sobre as marcas para as retirar.',
    hintKeep: 'Passe o dedo sobre as marcas para as manter; uma marca retirada volta.',
    hintAdd: 'Toque no papel vazio para acrescentar um ovo, ou numa marca ou aglomerado para lhe somar mais um.',
    twoFingers: 'Com dois dedos move-se a tira.',
    clumpsOpen: 'Rever os aglomerados · {done} de {total}',
    clumpOf: 'Aglomerado {n} de {total}',
    clumpHint: 'A app marcou ~{app}; pelo tamanho cabem cerca de {size}. Indique quantos ovos vê.',
    clumpFewer: 'Menos um ovo',
    clumpMore: 'Mais um ovo',
    clumpPrev: 'Anterior',
    clumpNext: 'Aglomerado seguinte',
    clumpLast: 'Terminar os aglomerados',
    clumpsDone: 'Voltar às ferramentas',
    nudgeBody: '{n} correções até agora. Se as marcas falham da mesma forma em toda a tira, ajustar Medir pode resultar melhor do que corrigi-las uma a uma.',
    nudgeGo: 'Ajustar Medir',
    nudgeDismiss: 'Continuar a corrigir',
    lookedAt: 'Vista de perto · {n} de {total} partes',
    zoomOut: 'Afastar',
    zoomIn: 'Aproximar',
  },

  result: {
    title: 'Tira {n} — concluída',
    sentence: '{n} ovos, verificados por si — nível desta tira: {band}',
    unchecked: '~{n} encontrados pela aplicação. Não fez alterações.',
    appFound: 'a app encontrou ~{n}',
    saveJson: 'Guardar como ficheiro (JSON)',
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
    saveCsv: 'Guardar como folha de cálculo (CSV)',
    saveJson: 'Guardar tudo (JSON)',
    title: 'Sessão concluída',
    meta: '{day} · {minutes} min',
    stripsCounted: 'tiras contadas',
    retakesAsked: 'fotos repetidas',
    bands: 'níveis',
    saved:
      'Registo guardado — fotos, definições e cada marca que verificou.',
    demoNotSaved: 'Isto foi o exemplo. Nada foi guardado.',
    backHome: 'Voltar ao início',
  },

  share: {
    button: 'Partilhar',
    saved: 'A imagem foi guardada e o resumo copiado.',
    what: 'Uma imagem: a sua foto, as marcas e a contagem.',
    previewAlt: 'A imagem que vai ser partilhada',
    photoLabel: 'A sua foto',
    marksChecked: 'As marcas, verificadas por si',
    marksFound: 'As marcas que a aplicação encontrou',
    countLabel: 'A contagem',
    footer: 'Contado com OvicounterAI',
  },

  about: {
    link: "Sobre",
    version: "Versão {version}",
    lede: "Uma aplicação de código aberto que ajuda profissionais de saúde e investigadores a contar ovos de mosquito em tiras de ovitrampa, com um telemóvel comum, com ou sem ligação à internet.",
    pocTitle: "Uma prova de conceito",
    poc: "O OvicounterAI («ovi», do latim «ovo») é uma prova de conceito que funciona, partilhada com parceiros para ser experimentada em tiras reais e melhorada. Nenhum programa de vigilância a usa ainda, e as suas contagens ainda não foram comparadas com contagens manuais cuidadosas; os seus números são um teste da abordagem, não dados para agir. A equipa está a trabalhar nas próximas fases de desenvolvimento: recolha de imagens, predefinições para diferentes programas e ambientes, e uma assistência mais avançada de visão por computador com IA.",
    problemTitle: "Porquê contar ovos de mosquito",
    problem: "Uma ovitrampa (armadilha de oviposição) é um recipiente escuro com água que atrai as fêmeas dos mosquitos Aedes a pôr os ovos numa tira de papel ou numa palheta de madeira colocada no seu interior. São os mosquitos, como Ae. aegypti e Ae. albopictus, que transmitem dengue, zika e chikungunya. Depois de seca, a tira é inspecionada e os ovos são contados (ou estimados). As armadilhas custam cêntimos e são colocadas às centenas, e os ovos são o primeiro sinal de que a população de mosquitos está a mudar, semanas antes de aparecerem os adultos que picam.\n\nUma das partes mais lentas e difíceis do processo é a própria contagem, que ainda é muitas vezes feita à mão. Um técnico conta pontos do tamanho de uma semente de papoila (ou mais pequenos), muitas vezes centenas numa tira, a olho. É lento e cansativo, e duas pessoas raramente chegam ao mesmo número.",
    whatTitle: "O que faz o OvicounterAI",
    what: "Fotografa uma tira e a aplicação marca cada ponto que pode ser um ovo. Pode afinar a forma como deteta os ovos e depois corrigir rapidamente as marcas à mão (confirmando, retirando e acrescentando ovos), e a contagem é sua.\n\nDepois de aberta, a aplicação funciona sem ligação. Uma sessão guarda cada tira à medida que avança, e qualquer resultado ou conjunto de definições pode ser guardado como ficheiro ou partilhado.\n\nO OvicounterAI é de código aberto, com licença Apache 2.0; o código e o raciocínio por trás são públicos.",
    todayTitle: "Como o OvicounterAI encontra os ovos hoje",
    today: "O OvicounterAI usa visão por computador clássica (OpenCV), não uma rede neuronal. Retira o sombreado do próprio papel (uma transformação black-hat), mantém o que é claramente mais escuro do que o papel (um limiar), separa os pontos escuros (componentes conexos) e afasta os ovos que se tocam (um watershed). O passo Medir da aplicação mostra cada uma destas imagens, para que veja como cada marca foi encontrada.\n\nEsta abordagem permite que a aplicação funcione no navegador de um telemóvel de gama média, sem uma transferência grande. Também a torna flexível. Pode ser ajustada a diferentes tipos de papel de ovitrampa e a diferentes condições para tirar a fotografia, seja num laboratório de campo ou no próprio terreno. Não precisa de uma câmara especial nem de equipamento de posicionamento, e não precisa de centenas de fotografias anotadas antes de poder ser usada.\n\nPor isso, hoje o OvicounterAI é uma ferramenta de apoio à contagem manual, mais do que um contador automático, e cada tira contada com ele ajuda a construir os dados de treino para a próxima fase.",
    nextTitle: "Para onde vai",
    next: "Cada tira verificada no OvicounterAI torna-se um registo útil: a fotografia, as definições e a posição de cada ovo que uma pessoa confirmou. É disso que se precisa para treinar um detetor de ovos: exemplos anotados de ovos em papel real, com luz real, de muitos lugares.\n\nEstamos a construir a forma de reunir esses dados de programas de diferentes países: um meio para as equipas enviarem tiras verificadas e se coordenarem entre locais, programas e países, num repositório partilhado de dados de treino.\n\nUm detetor treinado com esse repositório substituiria os passos clássicos de hoje, atrás da mesma revisão: proporia, e a pessoa continuaria a decidir. Cada versão seria testada, fixada para o seu lançamento e publicada abertamente, como o resto da aplicação.\n\nHaverá mais sobre isto à medida que avançar.",
    teamTitle: "A equipa por trás do OvicounterAI",
    team: "O OvicounterAI nasce de uma ferramenta anterior de contagem de ovos em ovitrampas que Gabriel Krieshok e Carolina Torres Gutierrez construíram em 2018–19 para a resposta ao zika na Jamaica, em El Salvador e na Guatemala. Em 2025 juntaram-se Gonçalo Seixas e Gonçalo Alves, em Portugal.",
    licence: "Código aberto, com licença Apache 2.0.",
  },

  guide: {
    open: 'Como funciona',
    title: 'Como funciona',
    intro: 'Uma tira de cada vez. A aplicação marca o que encontra; verifica as marcas, e a contagem é sua.',
    photo: 'Coloque a tira plana com boa luz e preencha o enquadramento com ela. Se os ovos parecerem demasiado pequenos ou a foto estiver desfocada, a aplicação diz e pede outra.',
    crop: 'A aplicação propõe um recorte à volta da tira. Arraste os cantos se não acertou, e endireite a tira se estiver inclinada.',
    measure: 'A aplicação encontra um ovo típico nesta tira e marca cada ponto desse tamanho e tom, mostrando cada imagem que produz. Depois dois controlos definem quão escuro e quão grande tem de ser um ponto; mova-os até os anéis ficarem sobre ovos e não sobre sujidade. Se as marcas ainda parecerem erradas, marque um ovo e ela volta a medir a partir dele.',
    check: 'Agora as marcas são suas para julgar. Escolha uma ferramenta — Retirar, Manter ou Acrescentar — e use-a com um dedo: passe o dedo sobre as marcas para as retirar ou manter; toque no papel vazio para acrescentar um ovo, ou numa marca ou aglomerado para lhe somar mais um. Os ovos que se tocam são desenhados como um só contorno com um número; reveja os aglomerados um a um e fixe cada número. Com dois dedos, ou com + e −, move a tira e vê de perto. Uma marca fica azul até ter visto de perto a parte da tira onde está.',
    count: 'A contagem é cada marca que não retirou. Coloca a tira num nível. Um número cinzento com ~ à frente é só da aplicação: ninguém verificou essas marcas.',
    done: 'Entendido',
  },

  steps: {
    photo: 'Fotografar',
    crop: 'Recortar',
    measure: 'Medir',
    check: 'Afinar à mão',
    count: 'Contar',
    position: 'Passo {n} de {total}',
    skipped: 'ignorado',
    backTo: 'Voltar a {step}',
    continueTo: 'Seguir para {step}',
    redoTitle: 'Procurar as marcas de novo?',
    redoBody: 'Isto volta a procurar as marcas desta tira desde o início. Perdem-se as marcas que retirou, acrescentou ou alterou.',
    redoStay: 'Manter as minhas correções',
    redoGo: 'Procurá-las de novo',
    retakeTitle: 'Tirar uma foto nova?',
    retakeBody: 'Uma foto nova recomeça esta tira. Perdem-se as marcas que retirou, acrescentou ou alterou nela.',
    retakeStay: 'Manter esta tira',
    retakeGo: 'Tirar uma foto nova',
  },

  markKey: {
    clump: 'confirma-os',
    found: 'encontrada pela aplicação',
    kept: 'mantida por si',
    removed: 'retirada por si',
    added: 'acrescentada por si',
  },

  tally: {
    kept: 'mantidas',
    removed: 'retiradas',
    added: 'acrescentadas',
    clumps: 'aglomerados revistos',
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
