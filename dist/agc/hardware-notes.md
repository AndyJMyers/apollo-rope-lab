# Hardware coupling checkpoint

The flight rope and emulator are unchanged. This is a staged hardware test,
not an autonomous Apollo landing or a reconstructed flight initial state.

## Accelerometers

`hardware.mjs` sends unprogrammed-counter packets to PIPAX 0037, PIPAY 0040
and PIPAZ 0041. PINC is type 0 and MINC is type 2. Each packet is serviced
by the original core, taking a memory cycle. Fractions accumulate between
steps; signed counts use one's complement, including negative zero.

The scale 0.0585 m/s per pulse comes from Virtual AGC's LM Simulator:
`Contributed/LM_Simulator/lm_simulator.tcl`, revision
`445bbf33aa8bfd2e86fc81ceef76f4a598afbeed`. Its `modules/AGC_IMU.tcl`
defines the PIPA counter interface. The frame in this demo is deliberately
fixed: X vertical, Y out of plane, Z downrange. It is not an Apollo mission
REFSMMAT. Specific-force impulses include engine thrust and exclude gravity.
There are no radar or CDU inputs yet.

## Throttle

Luminary 099 `THROTTLE_CONTROL_ROUTINES.agc` defines FLATOUT at bank 31,
address 2370. In a newly reset, isolated core the harness seeds EB=7, FB=31
and Z=2370 after the emulator's initial GOJAM cycle. It executes the
original instructions until WOR CHAN14 enables bit 4 and THRUST 0055 holds
4096. Then it stops flight-program execution. Only input counter packets
are serviced thereafter: no invented return stub, altered fixed word or
claimed mission startup. The remaining throttle routine is not exercised.

The external hardware clock supplies DINC type 4 at 3200 pulses/s, matching
the source's 32 pulses/centisecond. The original core emits POUT 015,
MOUT 016 and ZOUT 017 on counter channel 0255. This version of the core
does not internally clock THRUST, so the external bridge supplies the clock.

The model maps 4096 pulses to a normalized travel of 0..1. That calibration
is an explicit demonstration choice, not a verified Apollo engine transfer
function. The source's THROTLAG constant is 20 centiseconds; a first-order
lag with adjustable time constant approximates its response. No historical
minimum-throttle, forbidden operating region, engine-start or shutdown
sequencing is claimed. The demand enters the plant on the next 20 ms step.

## Dynamics and time

The two-dimensional plant uses constant 1.62 m/s² lunar gravity, 45040 N
maximum thrust, 311 s specific impulse, 7000 kg dry mass and 2000 kg initial
fuel. These are teaching parameters. The final step is shortened at surface
contact. Input packets are batched in at most 128 entries, below the core's
1024-entry ring buffers; outputs are drained after each batch.

Manual mode boots the original flight software, sends V16 N21, and runs the
CPU for the vehicle's time budget, including counter cycles. In FLATOUT
mode CPU-cycle totals count the bounded command plus counter servicing,
not elapsed mission time. Telemetry records both clocks. Browsers discard
wall-time catch-up when hidden or delayed; the experiment ends at contact
or 120 simulated seconds. Reset before comparing modes or lag settings.

## Next flight-coupling work

Establish archival initial navigation state, mission pad loads, sensor
alignment and startup procedure. Add attitude and radar interfaces. Only
then engage the descent programs and compare their outputs with documented
nominal and perturbed trajectories. Browser rendering and touch QA remain
required; this checkpoint is checked with executable core and model tests.
