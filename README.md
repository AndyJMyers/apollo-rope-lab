# Apollo Rope Lab

Second checkpoint for Andy J Myers. A playable teaching model and a separate original AGC workbench. Static HTML/CSS/JavaScript/WebAssembly; all runtime assets are served locally by the Site.

## Core-rope construction

![Looping animation: sense wires thread through or bypass a magnetic core to encode 1011, followed by a set/reset read cycle.](docs/animations/core-rope.gif)

**Through the core = 1; bypassing it = 0.** This enlarged four-wire cutaway illustrates the principle. Actual Apollo cores served many words; selection, inhibit wiring, strand switching and sense amplifiers are omitted. [Technical reference](https://github.com/shirriff/rope-simulator#how-core-rope-works).

The animation repeats automatically. Regenerate it with `python3 tools/render_core_rope.py` (requires Pillow).

## Listen to the song

[**Play Hope, Hope, Hope (Burn, Baby, Burn) — Andy J Myers**](https://apollo-rope-lab.magicbell8.chatgpt.site/music.html)

The private listening page combines the album cover, a five-minute stereo track and the repeating core-rope animation. The web player uses a 192 kbps MP3 made from the original 48 kHz stereo WAV; the original WAV master is retained separately. Playback starts when you press play.

## Run locally

Serve `dist/` over HTTP (required for ES modules and WebAssembly): `python3 -m http.server 8000 --directory dist`. Open http://localhost:8000 .

Private web prototype: https://apollo-rope-lab.magicbell8.chatgpt.site

## Original AGC workbench

Select **Original AGC**, then **Boot Apollo 11**. This runs the preserved LMY99 revision 001 flight program in the unmodified yaAGC WebAssembly core distributed by Michael Karl Franzl's webAGC. Use **V35** for the original lamp/display test and **V16 N65** to monitor software time. The keys send genuine AGC input-channel packets; output channels drive the DSKY display, indicators and octal inspection panels. Pause, cycle stepping and reset are available. A step is a memory cycle, not a complete instruction.

**Run CPU validation** temporarily loads a separate modern regression program. It must reach PROG 77; some tests in that upstream suite are placeholders, so completion is not exhaustive CPU certification. Boot Apollo 11 again afterwards.

The original computer is not yet connected to the landing game's physics, IMU or radar. It is an operational computer bench, not a validated historical descent reconstruction. Browser clocks approximate real-time execution and pause while the document is hidden. No browser rendering QA was available in the build environment.

`dist/agc/provenance.json` pins emulator/program source commits, SHA-256 hashes and byte sizes. The emulator's exported version string agrees with its documented source revision. All 36,864 information words in the flight binary agree with the separately proofed octal listing. The native build comparison checks host integration against the same source; it is not an independent CPU implementation.

Corresponding emulator and CPU-test source, build instructions and licence are under `dist/agc/source/` and `dist/agc/LICENSE`. Emulator, adapters and CPU tests are GPL-2.0-or-later; original flight software is public domain. Attribution: Ronald S. Burkey, Michael Karl Franzl and the Virtual AGC contributors. Keep the source, notices and licence with distributions.

## Scope

The **Flight Deck teaching model** does not execute original AGC software. It models two-dimensional near-surface lunar descent with a modern proportional guidance controller, constant lunar gravity, fuel-dependent mass and a throttled/tilted engine. It has an illustrative workload/restart model, not a cycle-accurate Apollo Executive. P63/P64/P66 display labels are illustrative.

Start at 600 m, 350 m from the pad. Default auto guidance lands safely. Add 25 workload units and compare protection enabled versus disabled, resetting between runs. Disable auto to fly by throttle and tilt. Landing requires |vertical velocity| ≤3 m/s, |horizontal velocity| ≤2 m/s and |pad offset| ≤40 m. Those are teaching thresholds, not historical certification limits.

## Validation

Run `node tests/engine.test.js` and `node tests/agc.test.mjs`. The latter verifies pinned asset hashes, every flight-rope information word, emulator version, boot behaviour, original V35 and V16 N65 commands, DSKY decoding, input bounds and upstream CPU-test completion.

The optional `tests/native_agc_oracle.c` builds against the corresponding source to compare all 2,048 erasable words after a deterministic boot/lamp-test sequence; zero differences were observed against WebAssembly. Browser QA remains separately required before compatibility claims.

## Next steps

1. Expand CPU coverage beyond the partial upstream validation suite and add historical self-test scenarios.
2. Independently verify flight-bank checksums against archival engineering drawings and identify the exact assembler toolchain for reproducible rebuilding.
3. Establish DSKY/sensor initialisation procedures and mission-specific pad loads before flight coupling.
4. Couple inertial/radar inputs, coordinate frames, engine lag and spacecraft dynamics. Establish nominal behaviour and compare against documented simulation/flight data.
5. Recreate resource exhaustion and separately investigate throttle stability. Record uncertainty and parameter sensitivity.
6. Add accessible DSKY input, procedures, mission replay and game challenges; preserve clear distinctions between historical and simplified modes.
7. Design touch controls and portrait/landscape layouts before an Android wrapper; package offline assets and lifecycle handling.

`dist/article.html` contains a first evidence-led article draft. Its source is `article.md`.
