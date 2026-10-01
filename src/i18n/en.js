/* English copy.
 *
 * Copy rules (design brief §8, enforced): plain language, low-literacy
 * tolerant, must survive translation to Spanish. Banned words: model,
 * algorithm, inference, confidence, machine learning, learn, teach, train,
 * upload, loading. The machine "finds" and "marks"; the person "checks",
 * "confirms", "removes", "adds". Mechanism copy stays physical ("light and
 * dark separated", never "thresholding").
 *
 * "AI" was on that list in both source documents and has been taken off it
 * (Aug 2026) — it is the product's name, and every other word on the list is
 * mechanism vocabulary. Nothing here describes the tool as doing something with
 * AI, but that falls out of the other rules rather than from banning the word.
 *
 * Strings marked RATIFIED come verbatim from the hi-fi handoff and must not be
 * reworded. Strings marked DRAFT were written here because the handoff has no
 * copy for that state; they are listed in docs/copy-to-ratify.md and need a
 * decision before this ships to a technician.
 */

export default {
  app: {
    /* The wordmark itself is not here — a product name is not copy. See
       components/AppWordmark.vue. */
    // RATIFIED
    /* DRAFT — the hi-fi opens straight onto the two buttons with no explanation
       at all. This says what the tool does in the operator's own terms before
       they commit to a session, and it states who owns the count, which is the
       one thing the whole design turns on. */
    intro:
      'Photograph a strip of ovitrap paper. The app marks what it finds. You check the marks — the count is yours.',
  },

  /* DRAFT — the whole menu. The handoff has no app bar at all ("No tab bar —
     the flow is linear"), so none of this has been through a design pass. */
  menu: {
    open: 'Menu',
    close: 'Close',
    home: 'Home',
    language: 'Language',
    endSession: 'End this session',
    about: 'Everything runs on this phone. Nothing is sent anywhere unless you share it.',
    /* Leaving mid-strip. Accurate rather than alarming: finished strips are
       written to the device as they are counted, so the only thing at risk is
       the one in hand. */
    /* DRAFT (Oct 2026) — settings as files: the measured egg, the slider
       values and the band scale. "Open", never "upload". */
    settings: 'Settings',
    exportSettings: 'Save settings',
    importSettings: 'Open settings',
    clearSettings: 'Stop using them',
    settingsInUse: 'New counts start from {name}.',
    settingsSaved: 'Saved to this device’s downloads.',
    settingsOpened: 'Opened. New counts start from these settings; the demos do not.',
    settingsBad: 'That file is not OvicounterAI settings.',
    settingsNewer: 'That file is from a newer OvicounterAI. Update the app to open it.',
    settingsNone: 'Count a strip first — then its settings can be saved.',
    leaveTitle: 'Leave this strip?',
    leaveBody:
      'This strip has not been counted yet, so it will be lost. Strips you already finished are saved.',
    leaveStay: 'Stay on this strip',
    leaveGo: 'Leave it',
  },

  welcome: {
    // RATIFIED
    previousSessions: 'Previous sessions',
    stripCount: '{n} strips',
    /* DRAFT — the resume card exists only as wireframe 2a, never designed in
       hi-fi. The wireframe reads "Interrupted yesterday · 4 of ~12 strips", but
       nothing knows how many strips a sitting was going to be — there is no cap
       and no plan — so the total is dropped rather than guessed at. The `~`
       would also collide with the rule that a leading `~` means a machine
       estimate. */
    /* DRAFT (Field Manual brief §4) — the resume card, first in the history
       column. Replaces "Resume this session" / "Interrupted · {done} counted
       so far". */
    resumeDay: 'Resume {day}',
    resumeNext: 'Unfinished · strip {n} next',
    /* DRAFT — the third door (Sep 2026, brief §4): photo → crop → marks → fix
       if wanted → number. No session, nothing saved unless the person asks. */
    /* DRAFT (Sep 30, 2026) — Welcome's doors: one line under each so they read
       as different things, and the two other demos behind "Other demo photos". */
    demoClean: 'A clean strip',
    demoCleanNote: 'Dense and evenly lit — the easy case.',
    demoField: 'A field strip, zoomed out',
    demoFieldNote: 'Stained and creased, with the table around it to crop away.',
    demoPattern: 'A test pattern',
    demoPatternNote: 'Ovoids drawn on this phone. The result says how many.',
    /* DRAFT (Oct 2026) — one way in, then where the photograph comes from.
       "Choose a photo", never "upload": nothing leaves the phone. */
    countSingle: 'Count a single paper strip',
    /* DRAFT (Oct 2026) — the line under each of Welcome's two buttons, and the
       footer's heading. */
    countSingleNote: 'With the camera, a photo already on this phone, or one of three demo photos. Nothing is saved unless you ask.',
    guideNote: 'The five steps from photograph to count, and what each mark means.',
    footerLinks: 'More',
    useCamera: 'Use the camera',
    useCameraNote: 'Photograph the strip now. The app will ask to use the camera.',
    choosePhoto: 'Choose a photo',
    choosePhotoNote: 'A photo of a strip already on this phone.',
    orDemo: 'Or try a demo photo',
    sessionLink: 'Counting several strips? Start a session',
    // DRAFT (Oct 2026) — deleting a previous session, confirmed first.
    delete: 'Delete',
    deleteTitle: 'Delete {day}’s session?',
    deleteBody: 'Its {n} strips, with their photos and marks, will be removed from this phone. This cannot be undone.',
    deleteStay: 'Keep it',
    deleteGo: 'Delete',
  },

  capture: {
    // RATIFIED
    strip: 'Strip {n}',
    guide: 'Fill the box with the strip',
    fromPhotos: 'from phone photos',
    checkedTitle: 'Checked as it comes in',
    chipSharp: 'sharp ✓',
    chipClose: 'close ✓',
    chipEggs: 'eggs visible ✓',
    // DRAFT — session code format is a mock placeholder ("SESSION A · TUE").
    sessionCode: '{code} · {day}',
    // DRAFT — no camera-unavailable state is drawn in the handoff.
    noCamera: 'No camera on this device. Open a photo from the gallery instead.',
  },

  refusal: {
    // RATIFIED — the "too far away" case, the one the hi-fi draws.
    tooFarTitle: 'Too far away to count',
    tooFarBody:
      'The eggs in this photo are too small to see. Move closer so the strip fills the frame, and take it again.',
    // DRAFT — the handoff says reason copy varies by failure but only draws one.
    tooBlurryTitle: 'Too blurry to count',
    tooBlurryBody:
      'The eggs in this photo have soft edges. Hold the phone still against the table, and take it again.',
    tooDarkTitle: 'Too dark to count',
    tooDarkBody:
      'The paper in this photo is too dark to tell eggs from shadow. Move it into better light, and take it again.',
    noEggsTitle: 'No eggs found in this photo',
    noEggsBody:
      'Nothing on this paper looks like an egg. Check the strip is in the frame, and take it again.',
    // RATIFIED
    yourPhoto: 'YOUR PHOTO',
    closeEnough: 'CLOSE ENOUGH',
    takeAgain: 'Take it again',
  },

  crop: {
    // RATIFIED
    title: 'Crop to the strip',
    stripBadge: 'STRIP {n}',
    straighten: 'straighten',
    /* DRAFT (Oct 2026) — the rotate and straighten pairs, undo and reset.
       Retires the RATIFIED "⟲ rotate" and the lone "⟳", which read as undo. */
    rotate: 'Rotate',
    rotateLeftName: 'Rotate left',
    rotateRightName: 'Rotate right',
    straightenLeftName: 'Straighten left',
    straightenRightName: 'Straighten right',
    undo: '↩ Undo',
    reset: 'Reset',
    caption: 'Box proposed automatically — drag the corners if it missed.',
    useThisPhoto: 'Use this photo',
  },

  calibrate: {
    // RATIFIED
    title: 'Tap one egg you can see clearly',
    sub: 'Its size and darkness tune the search on every strip today.',
    echo: 'Found {n} more the same size',
    pickAnother: 'Pick another',
    go: 'Looks right — go',
    // DRAFT — no copy drawn for a tap that lands on bare paper.
    missed: 'That spot is bare paper. Tap directly on an egg.',
    /* DRAFT — a tap that disagrees with the probe's measurement (Sep 2026). More
       than twice the median area is most likely a clump; less than half, a
       fragment or a speck. Said before the operator commits, not after. */
    tapBigger: 'That looks bigger than most eggs here. Pick another?',
    tapSmaller: 'That looks smaller than most eggs here. Pick another?',
    /* DRAFT — the way back when this screen was opened from Refine and the
       operator decides the marks were fine after all. */
    keepMarks: 'Keep the marks',
  },

  processing: {
    // RATIFIED
    title: 'Measuring on this phone…',
    stepLightDark: 'LIGHT / DARK',
    stepDarkSpecks: 'DARK SPECKS',
    stepBoxes: 'BOXES',
    stepMarks: 'MARKS',
    badgeBoxes: 'BOXES DRAWN',
    // DRAFT — only "BOXES DRAWN" is drawn; the other three buffer badges are new.
    badgeLightDark: 'LIGHT AND DARK SPLIT',
    badgeDarkSpecks: 'DARK SPECKS KEPT',
    badgeMarks: 'MARKS PLACED',
    /* DRAFT (Oct 2026) — Measure reopened from the step list: the same four
       pictures, chosen by the person, nothing measured again for the count. */
    lookTitle: 'How the marks were found',
    lookHint: 'Tap a step to see that picture. Zoom in to look closer; hold to see the photo.',
    /* DRAFT (Oct 2026, Gabriel) — the pictures named for the OpenCV operation
       that made each one, replacing the RATIFIED "LIGHT / DARK", "DARK SPECKS",
       "BOXES", "MARKS" as the picture labels (the badges keep plain words).
       The soft hyphens (\u00AD) are where a long name may break in the five
       narrow columns on a phone, rather than at any letter. */
    cvBlackHat: 'Black-hat',
    cvThreshold: 'Thres\u00ADhold',
    cvComponents: 'Compo\u00ADnents',
    cvWatershed: 'Water\u00ADshed',
    stepPhoto: 'PHOTO',
    badgePhoto: 'THE PHOTO',
  },

  refine: {
    // RATIFIED
    ghostCaption: 'faint rings = lost since you started moving',
    lightDarkSplit: 'Light / dark split',
    speckSize: 'Speck size',
    tickCaption:
      'Pink tick = the egg you marked. Sliding past it means your own egg would be lost.',
    backToStart: 'Back to start',
    /* DRAFT — when the calibration was measured by the app rather than tapped,
       "the egg you marked" would be false. Same sentence, true subject. */
    tickCaptionAuto:
      'Pink tick = the size of the eggs found here. Sliding past it means eggs that size would be lost.',
    /* DRAFT — the way back to Mark one egg now that it is no longer the entry. */
    /* DRAFT (Oct 2026, Gabriel) — the sliders under their OpenCV names, each
       with what it does in plain words. Replace the RATIFIED "Light / dark
       split" and "Speck size". */
    threshold: 'Threshold',
    thresholdNote: 'How much darker than its own paper a speck must be.',
    minArea: 'Minimum area',
    minAreaNote: 'How big a speck must be, in pixels.',
    markAnEgg: 'Marks look wrong? Mark an egg',
  },

  fixes: {
    // Gabriel, Oct 2026 — was the RATIFIED "Check the marks": since Refine's
    // sliders moved into Measure, this is the hand pass, and is named so.
    title: 'Manually refine',
    // RATIFIED
    undo: '↩ undo',
    done: 'Done — count them',
    /* DRAFT — a quick count arrives here without passing Refine; this is the
       way to the sliders for anyone who wants them. */
    adjust: 'Marks look wrong? Adjust them',
    /* DRAFT (Oct 2026) — the tools on Manually refine: one finger paints with
       the chosen tool, two fingers move the strip. They replace the instruction
       row "Tap = remove · Hold = add · Line = split". Uppercase is CSS only.  */
    toolsLabel: 'What one finger does',
    toolRemove: 'Remove',
    toolKeep: 'Keep',
    toolAdd: 'Add',
    hintRemove: 'Paint over marks to remove them.',
    hintKeep: 'Paint over marks to keep them — a removed mark comes back.',
    hintAdd: 'Touch empty paper to add an egg, or a mark or a clump to add one more to it.',
    twoFingers: 'Two fingers move the strip.',
    /* DRAFT (Oct 2026) — after five fixes, the way to Measure says why. */
    /* DRAFT (Oct 2026) — the clump pass on Manually refine. */
    clumpsOpen: 'Check the clumps · {done} of {total}',
    clumpOf: 'Clump {n} of {total}',
    clumpHint: 'The app marked ~{app}; its size fits about {size}. Set how many eggs you see.',
    clumpFewer: 'One fewer egg',
    clumpMore: 'One more egg',
    clumpPrev: 'Previous',
    clumpNext: 'Next clump',
    clumpLast: 'Finish the clumps',
    clumpsDone: 'Back to the tools',
    nudgeBody: '{n} fixes so far. If the marks are off the same way across the strip, adjusting Measure may fit it better than fixing them one by one.',
    nudgeGo: 'Adjust Measure',
    nudgeDismiss: 'Keep fixing',
    /* DRAFT — coverage: parts of the strip wholly on screen at zoom ≥ 2. The
       person's effort, never the machine's count. */
    lookedAt: 'Looked at close up · {n} of {total} parts',
    // DRAFT — accessible names for the zoom buttons.
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
  },

  result: {
    // RATIFIED
    title: 'Strip {n} — done',
    sentence: '{n} eggs, checked by you — this strip is {band}',
    /* DRAFT — the operator went through Your fixes without touching anything.
       No band, no "checked by you": a machine count is shown as one. */
    unchecked: '~{n} found by the app. You made no changes.',
    /* DRAFT (Oct 2026, Gabriel) — the app's own total beside the person's
       count, labelled rather than struck through, which read as an error. */
    appFound: 'app found ~{n}',
    // DRAFT — the test-pattern demo knows how many it drew.
    // DRAFT (Oct 2026) — the record as a file (lib/export.js).
    saveJson: 'Save as a file (JSON)',
    testDrawn: 'Test pattern: {n} drawn',
    saved: 'SAVED ON THIS PHONE ✓',
    /* DRAFT — the handoff draws only the saved state, because it assumes a
       record was written. These cover the two cases where none was. */
    notSavedDemo: 'DEMO — NOT SAVED',
    notSavedYet: 'NOT SAVED YET',
    endSession: 'End session',
    nextStrip: 'Next strip →',
    /* DRAFT — the quick-count result (Sep 2026, brief §4). "Yet" would be a
       promise, and a quick count never saves. */
    notSavedQuick: 'NOT SAVED',
    countAnother: 'Count another',
    startSession: 'Start a session with these settings',
  },

  summary: {
    // DRAFT (Oct 2026) — the session's results as files.
    saveCsv: 'Save as a spreadsheet (CSV)',
    saveJson: 'Save everything (JSON)',
    /* DRAFT — the whole screen. Session summary exists only as wireframe 2j and
       has never had a hi-fi pass; these strings are the wireframe's own words,
       which is the best source available but is not a ratified one. */
    title: 'Session done',
    meta: '{day} · {minutes} min',
    stripsCounted: 'strips counted',
    retakesAsked: 'retakes asked',
    bands: 'bands',
    saved: 'Record saved on this phone — photos, settings, and every mark you checked.',
    demoNotSaved: 'This was the demo. Nothing was saved.',
    backHome: 'Back to home',
  },

  /* DRAFT (Oct 2026) — Share on Strip result: the system share sheet on a
     phone; on a laptop, the images are saved and the summary copied. */
  share: {
    button: 'Share',
    saved: 'Saved the picture and copied the summary.',
    what: 'One picture: your photo, the marks and the count.',
    previewAlt: 'The picture that will be shared',
    photoLabel: 'Your photo',
    marksChecked: 'The marks, checked by you',
    marksFound: 'The marks the app found',
    countLabel: 'The count',
    footer: 'Counted on this phone with OvicounterAI',
  },

  /* DRAFT (Oct 2026, Gabriel) — the About page (views/AboutScreen.vue), for
     partners and anyone curious: a proof of concept, where AI sits today and
     next, and why the person stays in charge. It is the one place that talks
     about trained detectors and neural networks, because it explains the
     roadmap; it still never says the app learns, and says plainly that it
     does not. Names no partner or funder. `origin` is Gabriel's history:
     confirm before sharing. Paragraphs are split on blank lines. */
  about: {
    link: "About",
    version: "Version {version}",
    lede: "A free, open-source app that helps health workers count mosquito eggs on ovitrap paper — offline, on an ordinary phone.",
    pocTitle: "A proof of concept",
    poc: "OvicounterAI is a working proof of concept, shared with partners so it can be tried on real strips and improved. No surveillance programme uses it yet, and its counts have not yet been scored against careful hand counts. Treat its numbers as a test of the approach, not as data to act on.",
    problemTitle: "Why count mosquito eggs",
    problem: "An ovitrap is a cup of water with a strip of paper in it. Aedes mosquitoes — the ones that spread dengue, Zika and chikungunya — lay their eggs on the paper. Traps cost pennies and go out by the hundreds, and the eggs are the earliest sign that mosquito numbers are changing, weeks before biting adults appear.\n\nThe weak link is the counting. A technician counts specks the size of poppy seeds, often hundreds on one strip, by eye. It is slow and tiring, and two people rarely reach the same number.",
    whatTitle: "What it does",
    what: "You photograph a strip; the app marks what it finds; you check every mark — removing, keeping and adding — and the count is yours.",
    whyTitle: "Why it marks too much",
    why: "The app marks more than it should on purpose. Removing a wrong mark takes one tap; finding an egg that was missed means searching the whole strip. So the app proposes, and you decide.",
    aiNowTitle: "Where the AI is today",
    aiNow: "Today there is no neural network in the loop, on purpose. The app finds eggs with classical computer vision (OpenCV): it removes the paper’s own shading (a black-hat transform), keeps what is clearly darker than the paper (a threshold), separates the dark specks (connected components), and pulls touching eggs apart (a watershed). Measure shows each of these pictures, so you can see how every mark was found.\n\nThe setting made that choice. The app has to work offline, on a mid-range phone, without a large download, at sites whose paper and light differ — so its settings come from an egg measured on each strip, and the sliders can move them. And every step has to be open to the person who signs the count.\n\nIt has a cost. Classical vision is less accurate than a well-trained detector, most of all where eggs pile on one another. That is why clumps are shown as clumps, with the app’s number marked as a guess for you to confirm.",
    authorityTitle: "Why the person stays in charge",
    authority: "The app proposes; you decide, and a few rules follow. No total is shown while you move the sliders, because a visible number invites tuning until it matches what you expected. The app’s guesses and your judgments never look alike: its count is grey with a ~, yours is black. A strip nobody checked says so, on screen and in the record.\n\nAnd nothing learns on the phone. The same photograph with the same settings gives the same marks every time, so any count can be checked again.",
    aiNextTitle: "Where AI fits next",
    aiNext: "The real output is not the number. It is the record: the photograph, the settings, and the egg positions a person checked. Each checked strip is a labelled example of what an egg looks like on that paper, in that light.\n\nA few hundred of them, from several sites, could train a detector to take the place of today’s classical steps. It would sit behind the same review — it would still only propose, and you would still confirm. It would be trained beforehand, fixed and versioned, and shipped with the app, never changing quietly on the phone; and it would be released under an open licence like the rest.\n\nThe classical version comes first because it earns trust and gathers the records a trained one needs. It is a question of order, not of belief. Records can already be saved as files (JSON and CSV) for this.",
    unknownsTitle: "What is not known yet",
    unknowns: "How close the counts are to careful hand counts. The next step is to run the app over about a thousand public strip photos that already carry technicians’ counts, and later over strips marked egg by egg.\n\nHow small an egg can be and still be counted. Below about six pixels across its shape is gone, and the app asks for another photo. The blur check has not yet been set against a truly blurred field photo.\n\nWhether a tired person on their eighteenth strip really checks the marks or simply accepts them. The design rests on the first, and it has not been tested.\n\nThe Spanish and Portuguese have not yet been reviewed in the field.",
    recordTitle: "What is kept",
    record: "In a session, each strip is saved on this phone with its photo, its settings and every mark you kept, removed or added, so a count can always be checked again. Counting a single strip saves nothing unless you ask. Results and settings can also be saved as files, to use elsewhere.",
    phoneTitle: "On this phone",
    phone: "Everything runs on this phone. Nothing is sent anywhere unless you choose to share it, and once the app has opened it works without a connection.",
    originTitle: "Where it comes from",
    origin: "OvicounterAI grows out of an earlier ovitrap-counting tool built in 2018–19 for the Zika response in Jamaica, El Salvador and Guatemala. It is a fresh rebuild, not a copy, with a different idea at its centre: the person checks every mark.",
    openSourceTitle: "Open source",
    openSource: "OvicounterAI is open source, under the Apache 2.0 licence. The code, and the reasoning behind it, are public.",
  },

  /* DRAFT (Sep 30, 2026) — the Guide (views/GuideScreen.vue): one section per
     step, under the step names in `steps`. Written to the copy rules: the app
     finds and marks, the person checks, removes and adds; nothing learns and
     nothing leaves the phone. */
  guide: {
    open: 'How it works',
    title: 'How it works',
    intro: 'One strip at a time. The app marks what it finds; you check the marks, and the count is yours. Everything runs on this phone.',
    photo: 'Lay the strip flat in good light and fill the box with it. If the eggs are too small or the photo is soft, the app says so and asks for another.',
    crop: 'The app proposes a box around the strip. Drag the corners if it missed, and straighten the strip if it is tilted.',
    measure: 'The app finds a typical egg on this strip and marks every speck of that size and darkness, showing each picture it makes on the way. Then two sliders set how dark a speck must be and how big; move them until the rings sit on eggs and not on dirt. If the marks still look wrong, mark one egg yourself and it measures again from that.',
    check: 'Now the marks are yours to judge. Pick a tool — Remove, Keep or Add — and use it with one finger: paint over marks to remove or keep them; touch empty paper to add an egg, or a mark or a clump to add one more egg to it. Touching eggs are drawn as one outline with a number; check the clumps one by one and set each number. Two fingers, or + and −, move the strip and look closer. A mark stays blue until you have looked at its part of the strip up close.',
    count: 'The count is every mark you did not remove. It places the strip in a band. A grey number with ~ in front is the app’s alone: nobody checked those marks.',
    done: 'Got it',
  },

  /* DRAFT (Sep 30, 2026) — the step list and step strip (lib/steps.js), and
     the two confirmations asked before finding the marks again on a strip the
     person has worked on. The bodies name what is lost rather than counting it:
     "your 1 fixes" is wrong in English and worse in translation. */
  steps: {
    photo: 'Photograph',
    crop: 'Crop',
    measure: 'Measure',
    check: 'Manually refine',
    count: 'Count',
    position: 'Step {n} of {total}',
    skipped: 'skipped',
    backTo: 'Back to {step}',
    continueTo: 'Continue to {step}',
    redoTitle: 'Find the marks again?',
    redoBody: 'This finds the marks on this strip again from the start. The marks you removed, added or split will be lost.',
    redoStay: 'Keep my fixes',
    redoGo: 'Find them again',
    retakeTitle: 'Take a new photo?',
    retakeBody: 'A new photo starts this strip again. The marks you removed, added or split on it will be lost.',
    retakeStay: 'Keep this strip',
    retakeGo: 'Take a new photo',
  },

  /* DRAFT (Field Manual brief, Sep 30, 2026) — the mark language in one
     wording everywhere (components/MarkKey.vue). Replaces Welcome's four lines
     and Your fixes' "machine, kept" / "✕ removed" / "+ added" legend; "found by
     the app" is new, the other three were Welcome's. */
  markKey: {
    /* DRAFT (Oct 2026) — the clump in Welcome's picture. */
    clump: 'you confirm them',
    found: 'found by the app',
    kept: 'you kept it',
    removed: 'you removed it',
    added: 'you added one',
  },

  /* DRAFT — labels under the judgment tally's numerals
     (components/JudgmentTally.vue). Human judgments only. */
  tally: {
    kept: 'kept',
    removed: 'removed',
    added: 'added',
    clumps: 'clumps checked',
  },

  /* DRAFT — the dashed badge for a strip whose marks nobody checked. */
  badge: {
    notChecked: 'Not checked',
    notCheckedCount: '{n} not checked',
  },

  bands: {
    // RATIFIED as placeholders. Names and edges are configurable per program;
    // see src/lib/bands.js.
    none: 'none',
    few: 'few',
    many: 'many',
    heavy: 'heavy',
  },
}
