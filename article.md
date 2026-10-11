# Apollo 11: Software You Could Weave
### A computer small enough to fly, and a release process involving copper wire

*Andy J Myers — first draft, October 2026*

There is a particular pleasure in reading old source code. The official photograph shows solemn men doing momentous things. The listing reveals someone hoping a temporary arrangement will not become permanent.

In the preserved Apollo lunar landing guidance source, beside an assembly instruction, sits this magnificent expression of professional confidence:

> TEMPORARY, I HOPE HOPE HOPE

There it is. Across the gulf between our laptops and their lunar spacecraft, a familiar voice. Every experienced programmer knows that a temporary solution can acquire tenure, a pension and considerable authority over its successors. Apollo's listing records the hope; by itself it cannot tell us whether the author later regretted it. [1]

Elsewhere is a section called *BURN, BABY, BURN*, the master ignition routine. This is rather more memorable than `PropulsionServiceFactoryImpl`. The online file also contains a later note explaining the name through a recollection from the developers' fortieth-anniversary gathering. That detail matters: the repository contains both preserved program comments and subsequent editorial material. We should check which century a joke belongs to before putting it in an astronaut's mouth. [2]

## Firmware with haberdashery

The Block II Apollo Guidance Computer had 36,864 words of fixed memory and 2,048 words of erasable memory. Each word contained fifteen information bits and a parity bit. Those are words, not modern bytes; comparisons advertising “72 KB” generally count the sixteen-bit storage representation. It is a small machine whichever convention we choose. [3]

The fixed program lived in core-rope memory, encoded through the physical routing of wires relative to magnetic cores. Working data lived separately in writable magnetic-core memory. A program change affecting the rope therefore had a manufacturing consequence. Firmware is a fair description of its deployed form, although designing, assembling and verifying the program remained software work. [4]

Today, a release may consist of pressing a button and discovering that someone has changed an authentication setting. Here, the release acquired physical substance. Imagine explaining to management that the patch was ready but needed weaving. Imagine being asked whether the production problem could be corrected by Friday, and replying that Friday depended on the manufacture and acceptance of a replacement component.

Modern engineers have not escaped physical constraints; power electronics, aircraft and medical devices remain stubbornly real. But much everyday software has gained enough distance from machinery to develop extravagant habits. Apollo offers the refreshing spectacle of a requirement that cannot be satisfied by adding another decorative animation.

## Primitive is a relative word

A small instruction set and an austere display can make old computing look intellectually simple. That confuses the available furniture with what its occupants were doing.

The AGC's development involved an early commitment to integrated circuits. Its human interface presented numeric programs, verbs and nouns rather than windows and icons. The crew needed to learn that language; the computer was not conducting a friendly conversation about their ambitions. [5]

The engineering question is whether that interface and processing budget were sufficient for the assigned job. “My phone is more powerful” answers a different question. A contemporary machine can devote enormous resources to an activity that merely needs to look agreeable. A flight controller must produce the right output at the right time, with a defensible response when something goes wrong.

We should also resist the inverse romance: that all old software was lean and perfect, while modern programmers spend their days animating cookie notices. Constraints encourage ingenuity. They also encourage compromises, difficult interfaces and ingenious arrangements whose fragility emerges later.

## The computer that knew what to abandon

The familiar Apollo 11 alarm story has a worthwhile technical core. Don Eyles's account describes a rendezvous-radar interface problem stealing approximately thirteen per cent of the computer's duty cycle. Resource exhaustion produced 1201 and 1202 alarms. Priority scheduling and restart protection allowed essential work to resume while expendable work disappeared. [6]

That is an unusually vivid illustration of a general rule: when demand exceeds capacity, survival depends on deciding what matters.

Our daily software does not always show such discretion. A machine may be busy rendering an unsolicited recommendation while the thing we actually requested waits. Apollo's engineering invites a pointed comparison: what has our abundance purchased, and how much of it is consumed accommodating demands nobody asked for?

It is tempting to turn the alarms into a perfect redemption story. Eyles also describes a marginally stable throttle-control algorithm and erroneous data causing thrust oscillations. The overall lesson includes both recovery and weakness. [6]

Calling a system effective need not mean calling it flawless. A useful assessment asks where it worked, what margin it had, what support it needed and what would defeat it.

## History should bring its workings

An official account deserves examination, not automatic deference. But scepticism becomes productive when it names a claim and proposes a test.

There are three questions here. First, does the surviving digital source accurately represent the contemporary listing? Second, can that program perform its assigned function on the specified hardware, with the specified inputs? Third, did the reported historical events occur?

These questions overlap, but answering one does not answer them all.

Virtual AGC documents the source's transcription and validation. Its process includes checking octal words, bank checksums and agreement between assembled source and a separately proofed executable representation. It also identifies the Apollo 11 flight branch more precisely than the convenient label “Luminary 99”. That is evidence we can inspect, rather than a demand to admire a commemorative photograph. [7]

An emulator can then make the executable evidence active. Give it defined sensor readings and initial conditions. Couple it to a model of the spacecraft. Observe its outputs. Vary the assumptions. Measure when it misses deadlines or becomes unstable.

Yet a simulation that succeeds because we have selected agreeable parameters proves less than its designer may hope. Independent checks matter: arithmetic behaviour, instruction timing, engine response, sensor conventions and the correctness of the initial state. A convincing green display is no substitute for them.

Equally, a simulation that fails through our own modelling mistake does not refute the historical machine. The simulator itself must survive scrutiny.

## A small machine, a large experiment

This makes the source an excellent foundation for a project with two pleasures: play and investigation.

The first version can put us at a lunar landing console, trying to manage thrust, position and fuel while giving the computer more work than it can handle. It can let us compare protected and unprotected operation. Its simplified physics and invented controller must be declared openly.

The more serious version should execute a validated AGC implementation and a pinned historical program, then compare its behaviour with documented tests and flight records. Virtual AGC already provides tools and reconstruction work we should study before inventing replacements. [7]

A web interface would let people try it without installation. An Android edition could follow, once the controls and portrait layout earn their keep. There is little virtue in wrapping an impressive-looking instrument panel before discovering whether it teaches or entertains.

The enduring appeal is that the code has escaped the glass case. We can read it, question it and eventually run controlled experiments with it.

And somewhere in the machinery, a programmer still hopes that the temporary bit will be temporary.

## Sources and further examination

1. [Preserved lunar landing guidance source](https://github.com/chrislgarry/Apollo-11/blob/master/Luminary099/LUNAR_LANDING_GUIDANCE_EQUATIONS.agc). Source of the quoted comment; it should be compared with the scanned listing for publication-grade attribution.
2. [Master ignition routine and later historical annotation](https://github.com/chrislgarry/Apollo-11/blob/master/Luminary099/BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.agc). The fortieth-anniversary explanation is later editorial material.
3. [MIT Instrumentation Laboratory: AGC characteristics, Block II](https://www.ibiblio.org/apollo/hrst/archive/1000.pdf). Contemporary technical reference for memory dimensions and word structure.
4. [Apollo onboard computers: technical description](https://www.apollojournals.org/afj/compessay.html). Fixed rope and erasable memory; reproduced technical material hosted by the Apollo Flight Journal.
5. [Apollo integrated circuits and reliability: historical technical documents](https://klabs.org/history/history_docs/mit_docs/integrated_circuits_reliability.htm), and [Don Eyles's technical account](https://klabs.org/history/apollo_11_alarms/eyles_2004/eyles_2004.htm) for the DSKY interface.
6. [Don Eyles, *Tales from the Lunar Module Guidance Computer*, AAS 04-064, 2004](https://klabs.org/history/apollo_11_alarms/eyles_2004/eyles_2004.htm). Participant's technical retrospective covering overload recovery and throttle stability; its citations point to contemporary reports and change requests.
7. [Virtual AGC: Luminary versions, provenance and validation](https://www.ibiblio.org/apollo/Luminary.html). Explains transcription, binary checking and flight-version identification.

*Assessment boundary: this draft examines technical plausibility, provenance and documented weaknesses. It does not constitute a full historical authentication of Apollo 11 or a new quantitative validation of its flight software. The accompanying first simulator is an explicitly simplified teaching model.*
