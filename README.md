# Apollo Rope Lab

First playable educational prototype for Andy J Myers. Static HTML/CSS/JavaScript; no network services or external dependencies at runtime.

## Run locally

Open `dist/index.html` in a modern browser, or serve the directory with `python3 -m http.server 8000 --directory dist`. Run tests with `node tests/engine.test.js`.

Private web prototype: https://apollo-rope-lab.magicbell8.chatgpt.site

## Scope

This build **does not execute original AGC software**. It models two-dimensional near-surface lunar descent with a modern proportional guidance controller, constant lunar gravity, fuel-dependent mass and a throttled/tilted engine. It has an illustrative workload/restart model, not a cycle-accurate Apollo Executive. P63/P64/P66 display labels are illustrative.

Start at 600 m, 350 m from the pad. Default auto guidance lands safely. Add 25 workload units and compare protection enabled versus disabled, resetting between runs. Disable auto to fly by throttle and tilt. Landing requires |vertical velocity| ≤3 m/s, |horizontal velocity| ≤2 m/s and |pad offset| ≤40 m. Those are teaching thresholds, not historical certification limits.

## Validation

Run `node tests/engine.test.js` and syntax checks. Browser QA is separately required before claims about browser compatibility.

## Next steps

1. Audit Virtual AGC architecture, licences and web implementations; prefer an established validated core over a fresh instruction emulator.
2. Pin source commit, assembler version and the actual Apollo 11 LM flight binary. Verify words and bank checksums against independent archival evidence.
3. Run CPU/instruction/self-test regressions before attaching the visual interface.
4. Couple inertial/radar inputs, coordinate frames, engine lag and spacecraft dynamics. Establish nominal behaviour and compare against documented simulation/flight data.
5. Recreate resource exhaustion and separately investigate throttle stability. Record uncertainty and parameter sensitivity.
6. Add accessible DSKY input, procedures, mission replay and game challenges; preserve clear distinctions between historical and simplified modes.
7. Design touch controls and portrait/landscape layouts before an Android wrapper; package offline assets and lifecycle handling.

`dist/article.html` contains a first evidence-led article draft. Its source is `article.md`.
