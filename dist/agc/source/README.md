# Corresponding source and attribution

The unmodified `yaAGC.wasm` is from Michael Karl Franzl's webAGC repository at commit `0575ea7a1231e3948bae7d2c22a6ac146da0c38d` (binary introduced in commit `3b4ebf88c7b9406e9aae90cfa3dc03f54e073b1d`). Upstream identifies its complete emulator source as Michael Karl Franzl's Virtual AGC fork at commit `ddc65e7bed41f1301921b934fcbaaee93db99dda`; the exported version string independently reports `2020-12-24 ddc65e7be`.

The `yaAGC/` directory includes the exact C source files, headers, version function and upstream Makefile used by that WebAssembly target. They remain unmodified, preserving their copyright notices. The runtime adapter and DSKY UI are additional Apollo Rope Lab code under GPL-2.0-or-later. The included licence is in `../LICENSE`.

Rebuild the emulator using the supplied upstream Makefile with a WASI SDK (clang, wasm-ld, WASI libc), Binaryen `wasm-opt` and WABT `wasm-strip` installed:

```
cd yaAGC
make WASI=yes WASI_SDK_PATH=/opt/wasi-sdk NVER='2020-12-24 ddc65e7be' yaAGC.wasm
```

The upstream binary's exact compiler/tool versions were not recorded in webAGC; this gives corresponding source and build instructions, not a guarantee of a byte-identical rebuild. The original full repository is available at https://github.com/michaelfranzl/virtualagc/tree/ddc65e7bed41f1301921b934fcbaaee93db99dda . The WASI SDK/runtime dependencies carry their own licences; consult the chosen SDK distribution when rebuilding.

`Validation/` includes the emulator test-program source from Virtual AGC commit `92a74ef1c88aede2e4ba0a86c6585c9ea911226d`. It is a modern, GPL-licensed regression program, not Apollo flight code. Some instruction-test placeholders in that suite were unimplemented; completing the available tests is not exhaustive CPU certification.

`Luminary099.binsource` is the separately proofed, public-domain octal listing at that same Virtual AGC revision. Its 36,864 information words are compared against the runtime rope in the integration tests. Original flight source and page-image provenance: https://github.com/virtualagc/virtualagc/tree/92a74ef1c88aede2e4ba0a86c6585c9ea911226d/Luminary099 and https://www.ibiblio.org/apollo/Luminary.html .

The hashes and upstream revisions in `../provenance.json` pin the distributed assets. Hash agreement verifies exact bytes; it does not independently prove a historical mission took place.
