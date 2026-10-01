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
    useCamera: 'Use the camera',
    useCameraNote: 'Photograph the strip now. The app will ask to use the camera.',
    choosePhoto: 'Choose a photo',
    choosePhotoNote: 'A photo of a strip already on this phone.',
    orDemo: 'Or try a demo photo',
    sessionLink: 'Counting several strips? Start a session',
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
    rotateLeft: '⟲ rotate',
    straighten: 'straighten',
    rotateRight: '⟳',
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
    lookHint: 'Tap a step to see that picture. Press and hold the picture to see the photo under it.',
    stepPhoto: 'PHOTO',
    badgePhoto: 'THE PHOTO',
  },

  refine: {
    // RATIFIED
    title: 'Refine the marks',
    photoToggle: 'photo 👁',
    ghostCaption: 'faint rings = lost since you started moving',
    lightDarkSplit: 'Light / dark split',
    speckSize: 'Speck size',
    tickCaption:
      'Pink tick = the egg you marked. Sliding past it means your own egg would be lost.',
    backToStart: 'Back to start',
    marksLookRight: 'Marks look right →',
    /* DRAFT — when the calibration was measured by the app rather than tapped,
       "the egg you marked" would be false. Same sentence, true subject. */
    tickCaptionAuto:
      'Pink tick = the size of the eggs found here. Sliding past it means eggs that size would be lost.',
    /* DRAFT — the way back to Mark one egg now that it is no longer the entry. */
    markAnEgg: 'Marks look wrong? Mark an egg',
  },

  fixes: {
    // RATIFIED
    title: 'Check the marks',
    undo: '↩ undo',
    done: 'Done — count them',
    /* DRAFT — a quick count arrives here without passing Refine; this is the
       way to the sliders for anyone who wants them. */
    adjust: 'Marks look wrong? Adjust them',
    /* DRAFT (Field Manual brief §3) — the instruction row on the phone and the
       numbered steps on the laptop. They replace the RATIFIED "Tap a mark to
       remove it · press and hold empty paper to add an egg" and "draw a line
       across a clump to split it". Uppercase is CSS only. */
    cellTap: 'Tap = remove',
    cellHold: 'Hold = add',
    cellLine: 'Line = split',
    step1: 'Tap a mark to remove it',
    step2: 'Hold empty paper to add an egg',
    step3: 'Draw across a clump to split it',
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
    /* DRAFT — open question 1 (Sep 30): the count includes machine marks in
       parts never looked at close up; they stay blue, and this says so. */
    partsNotLooked: 'Not looked at close up: {n} of {total} parts',
    // DRAFT — the test-pattern demo knows how many it drew.
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
    saved: 'Saved the marked and original photos, and copied the summary.',
  },

  /* DRAFT (Oct 2026) — the About page (views/AboutScreen.vue), from the menu.
     Names no partner or funder; that is for Gabriel to add. */
  about: {
    link: 'About',
    version: 'Version {version}',
    whatTitle: 'What it does',
    what: 'Ovicounter AI helps count mosquito eggs on ovitrap paper. You photograph a strip; the app marks what it finds; you check every mark. The count is yours.',
    whyTitle: 'Why it marks too much',
    why: 'The app marks more than it should on purpose. Removing a wrong mark takes one tap; finding an egg that was missed means searching the whole strip. So the app proposes, and you decide.',
    recordTitle: 'What is kept',
    record: 'In a session, each strip is saved on this phone with its photo, its settings and every mark you kept, removed or added, so a count can always be checked again. Counting a single strip saves nothing unless you ask.',
    phoneTitle: 'On this phone',
    phone: 'Everything runs on this phone. Nothing is sent anywhere unless you choose to share it, and once the app has opened it works without a connection.',
    openSourceTitle: 'Open source',
    openSource: 'Ovicounter AI is open source, under the Apache 2.0 licence.',
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
    measure: 'The app finds a typical egg on this strip and marks every speck of that size and darkness. If the marks look wrong, you can mark one egg yourself and it measures again from that.',
    refine: 'Two sliders: how dark a speck must be, and how big. Move them until the rings sit on eggs and not on dirt. The pink tick shows the size of the eggs found.',
    check: 'Every mark is yours to judge. Tap a mark to remove it. Hold empty paper to add an egg. Draw a line across a clump to split it. Pinch, or use + and −, to look closer. A mark stays blue until you have looked at its part of the strip up close.',
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
    refine: 'Refine',
    check: 'Check the marks',
    count: 'Count',
    position: 'Step {n} of {total}',
    skipped: 'skipped',
    optional: 'optional',
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
    split: 'split',
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
