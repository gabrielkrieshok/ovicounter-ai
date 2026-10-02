# OvicounterAI

An open-source app that helps health workers and researchers count mosquito eggs on ovitrap strips, using an ordinary phone, with or without an internet connection.

You photograph a strip, and the app marks every speck that could be an egg. You can fine-tune how it detects eggs, then correct the marks by hand (confirming, removing and adding eggs), and the count is yours. A session saves each strip as you go, and any result or set of settings can be saved as a file or shared.

Live at [ovicounterai.gabrielkrieshok.com](https://ovicounterai.gabrielkrieshok.com/). The earlier classical version is kept at classic.ovicounterai.gabrielkrieshok.com and on the `classic` branch.

## Status

A working proof of concept, shared with partners to try on real strips. No surveillance program uses it yet, and its counts have not been checked against careful hand counts.

- **Today:** classical computer vision (OpenCV), no neural network, running in the browser. It is an assistive tool for manual counting, not an automatic counter.
- **Being built:** a way for programs to upload checked strips into a shared repository of training data. In development.
- **Next:** a detector trained on that repository, behind the same review (it proposes, the person decides), and presets for different programs and environments.

The About page in the app tells this story in full.

## Run it

Needs Node 20 or newer.

```bash
npm install
npm run dev       # http://localhost:5199/ (the port is fixed; the tools below rely on it)
npm run build     # static site in dist/
npm run preview   # serve dist/ at http://localhost:4173/
```

Vite also prints a Network URL; open it on a phone on the same wifi to check sunlight legibility and tap accuracy. On a laptop (900px and wider) the phone frame goes away; add `?frame=1` to the URL to keep it.

## Check your changes

With `npm run dev` running:

```bash
node tools/walk-flow.mjs       # clicks the demo and a session end to end; run after touching any screen
node tools/run-harness.mjs     # the real CV pipeline over every bundled photograph
node tools/check-i18n.mjs      # missing translation keys (they fall back to English silently)
```

## Where things are

```text
src/views/       one file per named screen
src/cv/          the pipeline, run in a Web Worker
src/i18n/        all copy: en.js, es.js, pt.js
src/styles/      tokens.css, the design contract
public/          opencv.js, fonts, and the demo and sample photographs
tools/           walker, CV harness, i18n check (dev only, not in the build)
docs/            file-formats.md: the strip, session and settings files
```

[AGENTS.md](AGENTS.md) holds the build spec: the decided stack, the non-negotiables, the copy rules, and what is known about the CV pipeline. Read it before changing anything in `src/cv/`.

## Team

Gabriel Krieshok, Carolina Torres Gutierrez, Gonçalo Seixas and Gonçalo Alves.

## License

Apache 2.0, see [LICENSE](LICENSE).
