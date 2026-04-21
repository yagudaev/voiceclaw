# LEGO iPad Gimbal — Project Plan & Shopping List

A two-axis LEGO pan/tilt head that cradles a 10.5" iPad Pro (2017) and rotates
it on the pan (Y, left/right) and tilt (X, up/down) axes under program control
so the camera/screen can face the user.

Natural fit for VoiceClaw: the brain agent can expose a `look_at(target)` tool
that maps to pan/tilt setpoints, giving the voice assistant physical presence.

## Target device

**10.5" iPad Pro (2017)** — model A1701 / A1709.

| Spec | Value |
|------|-------|
| Dimensions | 250.6 × 174.1 × 6.1 mm |
| Weight | 469 g (Wi-Fi) / 477 g (cellular) |
| Charging | **Lightning** (not USB-C — this generation predates USB-C iPads) |
| Smart Connector | Long edge (landscape: left side) |
| Front camera | Top-center in portrait |
| Rear camera | Top-left corner (back) |
| Speakers | Four corners |

Design target: hold ~480 g securely, leave all cameras/speakers/ports/Smart
Connector unobstructed.

## Core design decisions

**1. Two motors, both heavily geared down.**
A 0.48 kg iPad on a ~13 cm yoke produces ~0.6 N·m of static torque worst case
(flat, fully extended). A SPIKE Prime Large motor stalls around 0.56 N·m and
should run ~40% of that continuously. Direct drive = overheat and sag.
Use a **worm + 24T reduction (~24:1)** on both axes. Worms don't back-drive,
so the pose holds with the motors off.

**2. SPIKE Prime / Robot Inventor — not classic Powered Up.**
A gimbal needs **absolute-position encoders** on every boot, otherwise homing
is ambiguous. SPIKE / Robot Inventor Large motors have them; classic Power
Functions / basic Powered Up motors do not. SPIKE is Python-programmable, and
flashing [Pybricks](https://pybricks.com) opens up MicroPython + Bluetooth LE
from a laptop or the iPad itself.

**3. Balance the tilt axis through the iPad center of mass.**
Geometric center works in practice. Eliminates static sag and drops motor
demand to friction + acceleration only.

**4. Wide, weighted base.**
The iPad's moment arm will tip a small base. Use a wide Technic baseplate
plus ballast (books, a plate) or a silicone mat, or clamp to the desk.

**5. Don't rely on friction to hold the iPad.**
U-shaped cradle with Technic beam clamps top + bottom, plus two wide silicone
bands across the back. Leave cutouts for front camera, rear camera, all four
speakers, Lightning port, and the Smart Connector strip.

## Torque / gearing sanity check

| Axis | Load | Arm | Static torque | Reduction | Motor torque needed |
|------|------|-----|---------------|-----------|---------------------|
| Tilt (balanced through CoG) | friction + accel | ~0 | ~0.1 N·m | 24:1 | ~0.004 N·m — trivial |
| Tilt (unbalanced worst case) | 0.48 kg × 0.13 m × g | 0.13 m | ~0.61 N·m | 24:1 | ~0.026 N·m — fine |
| Pan (turntable) | near-zero radial | ~0 | ~0.05 N·m | 24:1 | trivial |

Worm reduction is the lynchpin — motor sizing becomes a non-issue and the
pose locks when idle.

## Mechanical layout

```
           [ iPad in cradle ]           silicone bands + beam clamps
                  |
     [ tilt pivot through iPad CoG ]
           /                \
          [ yoke arms ]                 L-shape Technic beams
                |
      [ tilt motor + worm + 24T ]       mounted on one yoke arm
                |
       [ turntable 28x28 bearing ]
                |
       [ pan motor + worm + 24T ]       inside base
                |
       [ wide base / ballast ]
```

## Build milestones

1. **M1 — Static cradle.** Yoke only, no motors. Verify iPad is secure and
   nothing is blocked (cameras, speakers, Lightning, Smart Connector).
2. **M2 — Tilt axis.** Add tilt motor + worm + 24T. Confirm hold torque with
   power off. Implement `tilt(deg)`.
3. **M3 — Pan axis.** Turntable + pan motor + worm + 24T + base. Implement
   `pan(deg)`.
4. **M4 — Homing + BLE.** Flash Pybricks, drive each axis into a mechanical
   stop to zero encoders, expose BLE pan/tilt commands.
5. **M5 — VoiceClaw integration.** Wire `look_at(target)` into the brain
   agent as a tool.

## Programming plan

- **Firmware:** [Pybricks](https://pybricks.com) on the Prime Hub.
- **Homing:** slow-drive each motor to a mechanical endstop on boot, zero the
  encoder there.
- **Motion API:** `pan(deg)` and `tilt(deg)` over Bluetooth LE, clamped to
  safe ranges (pan ±150°, tilt −30° to +45° initially).
- **Face tracking source** (pick one):
  - *On-iPad:* `AVCaptureDevice` + Vision `VNDetectFaceRectanglesRequest`,
    compute offset angles, send over BLE.
  - *On-desktop:* MediaPipe on the webcam stream, push angles over BLE.
  - *Preset-only (v1):* agent calls `look_at(user|screen|default)` → preset
    angles. Simplest to ship.
- **Safety:** rate-limit commands, ramp acceleration, go to a rest pose on
  disconnect.

## Shopping list — Option A: Single-kit path (recommended)

Cleanest build. Both motors have absolute encoders out of the box.

| # | Item | Qty | ~USD | Notes |
|---|------|-----|------|-------|
| 1 | LEGO Education SPIKE Prime Set 45678 | 1 | ~$340 | Hub + 2× Medium + 1× Large motor, sensors, Technic |
| 2 | SPIKE Prime Expansion Set 45680 | 1 | ~$110 | Adds 1× Large + 1× Medium motor → gives two Large motors total |
| 3 | Technic Large Turntable 28×28 (99010c01 / 18938) | 1 | ~$8 | Pan bearing |
| 4 | Technic Worm gear (part 4716) | 2 | ~$2 | One per axis |
| 5 | Technic Gear 24-tooth (part 3648) | 2 | ~$2 | Mates with worm |
| 6 | Wide silicone / rubber bands, ~20 cm loop | 4 | ~$5 | Secure iPad |
| 7 | **Right-angle Lightning cable**, 2 m | 1 | ~$12 | Charging while rotating (10.5" Pro is Lightning) |
| 8 | Non-slip silicone mat (or Sugru pads) | 1 | ~$8 | Stops base creep |

**Subtotal: ~$490.** SPIKE Prime is sold through LEGO Education resellers.
Used classroom kits on eBay often run ~40% off.

## Shopping list — Option B: Budget / eBay path

Uses discontinued but readily available hardware.

| # | Item | Qty | ~USD | Notes |
|---|------|-----|------|-------|
| 1 | LEGO MINDSTORMS Robot Inventor 51515 (used) | 1 | ~$250 | 4× Medium motors, same hub. Use 2-stage reduction to compensate for no Large |
| 1b | *OR* EV3 Brick 45500 + 2× EV3 Large Motors 45502 (used) | 1 set | ~$200 | Highest torque. Run Pybricks or ev3dev |
| 2 | Assorted Technic lot from BrickLink (beams 5/7/9/11/15, pins, axles) | 1 | ~$40 |  |
| 3 | Large turntable + worm + 24T (as Option A rows 3–5) | 1 set | ~$12 |  |
| 4 | Silicone bands + right-angle Lightning cable + silicone mat | 1 set | ~$25 |  |

**Subtotal: ~$280–330.** More sourcing work; cheaper.

## Shopping list — Option C: Pybricks-first (most hackable)

Hardware = Option A or B, **plus flash Pybricks** (free) onto the hub.
Unlocks MicroPython REPL + BLE, which is the cleanest path for wiring into
VoiceClaw's brain agent.

Hardware cost: same as chosen option. Software cost: $0.

## Risks / watch-outs

- **Cable wrap:** pan sweeping beyond ~180° wraps the Lightning cable. Either
  soft-limit the pan range in firmware, add a slip-ring (overkill), or just
  dock/undock for charging.
- **Heat:** an iPad streaming video for an hour warms up. Don't fully enclose
  the back — leave airflow.
- **Base tipping:** bench-test at full tilt extension before trusting it near
  a desk edge.
- **Lightning port location:** the port is dead-center on the short edge; the
  bottom cradle clamp must leave a notch for the plug.
- **Smart Connector:** on the landscape-left long edge. Don't occlude if you
  ever want to attach a keyboard.

## Open questions (decide before buying)

1. **Orientation:** is the iPad held in landscape (camera sideways) or
   portrait (camera up)? Affects cradle design and which axis is "pan".
2. **Charging during use:** always plugged in, or battery-only sessions?
   Decides whether cable routing is a hard constraint or a nice-to-have.
3. **Face tracking source:** on-iPad vision, on-desktop vision, or preset
   angles for v1? Decides what software work lands on the critical path.
