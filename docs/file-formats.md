# OvicounterAI file formats

Version 1, October 2026. Written by `src/lib/export.js`.

The app saves three kinds of file. Every file is JSON, except the session spreadsheet, which is CSV. Every JSON file starts with the same envelope:

```json
{
  "format": "ovicounterai/strip",
  "version": 1,
  "app": { "name": "OvicounterAI", "version": "0.2.0" },
  "exportedAt": "2026-10-01T22:23:31.937Z"
}
```

`format` is one of `ovicounterai/strip`, `ovicounterai/session` or `ovicounterai/settings`. `version` is the format's version, not the app's. A reader should refuse a version higher than it knows, and the app does.

Nothing is sent anywhere. Saving puts the file in the device's downloads; opening reads a file the person picked.

## Coordinates

Mark and clump positions are normalised to 0–1 against the **working image**: the photograph after crop, quarter turns and straightening, about 1200px on its long edge. Each strip carries that image's size as `image: { width, height }`, so `x * width` gives pixels. The photograph itself is not included.

## Strip: `ovicounterai/strip`

Saved from Strip result ("Save as a file (JSON)").

```json
{
  "...envelope": "",
  "strip": {
    "index": 0,
    "count": 393,
    "checked": true,
    "appFound": 392,
    "band": "heavy",
    "judgments": { "removed": 0, "added": 0, "clumpsChecked": 1 },
    "image": { "width": 1200, "height": 551 },
    "crop": { "box": { "l": 0, "t": 0, "r": 1, "b": 1 }, "quarterTurns": 0, "straightenAngle": 0 },
    "params": { "contrastFloor": 97, "minArea": 18, "...": "" },
    "looked": [true, false, "..."],
    "clumps": [
      { "id": 0, "cx": 0.41, "cy": 0.52, "rx": 0.012, "ry": 0.006, "angle": 1.2,
        "area": 160, "byArea": 3, "watershed": 1, "found": 2, "checked": true, "count": 2 }
    ],
    "marks": [
      { "x": 0.1234, "y": 0.5678, "w": 0.006, "h": 0.013, "status": "kept", "source": "machine" },
      { "x": 0.41, "y": 0.52, "w": 0.006, "h": 0.013, "status": "kept", "source": "machine", "clump": 0, "placed": true }
    ]
  }
}
```

- `count` is the person's count when `checked` is true. When it is false, nobody reviewed the strip, and `count` is the app's total.
- `appFound` is the app's own total, before the person changed anything.
- A mark's `status` is `proposed` (found, not yet looked at), `kept`, `removed` or `added` (placed by hand). `source` is `machine` or `hand`. A mark with `clump` belongs to that clump; `placed` means the app or the person set the clump's number and the mark's position was spread over the clump, not detected.
- For each clump: `watershed` is how many pieces the watershed cut it into; `byArea` is its area divided by a single egg's; `found` is how many marks the app put in it; `count` and `checked` are the person's answer, if any.
- `rx` and `ry` are fractions of the image **width** (the image always scales uniformly).
- `looked` has one entry per eighth of the strip: whether that part was wholly on screen at zoom 2 or more.

## Session: `ovicounterai/session`

Saved from Session summary ("Save everything (JSON)").

```json
{
  "...envelope": "",
  "session": {
    "id": "smuq3p4kh",
    "startedAt": "2026-10-01T22:23:31.937Z",
    "endedAt": "2026-10-01T22:25:02.101Z",
    "minutes": 2,
    "refusals": 0,
    "calibration": { "areaPx": 50, "rPx": 4, "contrast": 97, "source": "probe" },
    "bands": [ { "key": "none", "min": 0, "max": 0 }, "...", { "key": "heavy", "min": 100, "max": null } ],
    "strips": [ "...each one as in a strip file's `strip`..." ]
  }
}
```

## Session spreadsheet (CSV)

Saved from Session summary ("Save as a spreadsheet (CSV)"). One row per strip:

```
session,started,strip,count,checked,app_found,band,removed,added,clumps_checked
smuq3p4kh,2026-10-01T22:23:31.937Z,1,392,false,392,heavy,0,0,0
```

`strip` starts at 1. `checked` is `true` or `false`, with the same meaning as in the strip file.

## Settings: `ovicounterai/settings`

Saved and opened from the menu ("Save settings", "Open settings").

```json
{
  "...envelope": "",
  "settings": {
    "calibration": { "areaPx": 50, "rPx": 4, "contrast": 97, "wPx": 4, "hPx": 11, "longEdgePx": 11, "source": "probe" },
    "params": { "contrastFloor": 97, "minArea": 18, "backgroundKernel": 31, "medianEggArea": 50, "...": "" },
    "bands": [
      { "key": "none", "letter": "N", "min": 0, "max": 0, "weight": 0.6, "heavyweight": false },
      { "key": "few", "letter": "F", "min": 1, "max": 24, "weight": 1, "heavyweight": false },
      { "key": "many", "letter": "M", "min": 25, "max": 99, "weight": 1.4, "heavyweight": true },
      { "key": "heavy", "letter": "H", "min": 100, "max": null, "softMax": 400, "weight": 1, "heavyweight": true }
    ]
  }
}
```

- `calibration` is the measured egg. While these settings are in use, a new session or quick count starts from it instead of measuring the egg again.
- `params` are the pipeline settings, including the two sliders: `contrastFloor` (Threshold) and `minArea` (Minimum area). They are applied over what the egg would seed.
- `bands` is the band scale. `max: null` means open-ended. Band names are looked up by `key` in the app's translations, so a new `key` shows as itself until it is translated.
- Any of the three may be `null` or left out.

Opened settings stay on the device until "Stop using them". They are never applied to the demos. A file that isn't OvicounterAI settings is refused, and so is a file from a newer format version.
