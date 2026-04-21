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
  Install via the [Pybricks web installer](https://www.install.pybricks.com/)
  (requires a microUSB cable). Prime Hub API docs:
  [docs.pybricks.com/hubs/primehub](https://docs.pybricks.com/en/latest/hubs/primehub.html).
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

## ⚠️ Timing note before you buy

**LEGO Education SPIKE Prime 45678 retires June 30, 2026.** As of April 2026
it is still in stock at retail ($429.95), but after retirement expect used
prices to climb the same way Robot Inventor 51515 did — that set is now
commanding ~$727+ used on eBay despite being discontinued.

**Translation:** if you're going with Option A, buy before July. If you miss
that window, the EV3 sub-option (B-2) becomes the realistic budget path,
not Robot Inventor.

## Shopping list — Option A: Single-kit path (recommended)

Cleanest build. Both motors have absolute encoders out of the box.

| # | Item | Qty | Price | Link | Notes |
|---|------|-----|-------|------|-------|
| 1 | LEGO Education SPIKE Prime Set 45678 | 1 | $429.95 | [LEGO Education](https://education.lego.com/en-us/products/lego-education-spike-prime-set/45678/) · [LEGO.com](https://www.lego.com/en-us/product/lego-education-spike-prime-set-45678) · [Amazon](https://www.amazon.com/LEGO-Education-Spike-Prime-Set/dp/B07QN7ZJF9) | Hub + 2× Medium + 1× Large motor, sensors, Technic |
| 2 | SPIKE Prime Expansion Set 45680 | 1 | ~$110 | [Amazon](https://www.amazon.com/LEGO-Education-Spike-Expansion-45680/dp/B07QM9GQP6) · [LEGO Education](https://education.lego.com/en-us/products/lego-education-spike-prime-expansion-set/45681/) | Adds 1× Large + 1× Medium motor → two Large motors total |
| 3 | Technic Turntable 28-tooth, base + top (99009c01) | 1 | ~$4 | [BrickLink](https://www.bricklink.com/v2/catalog/catalogitem.page?P=99009c01) | Pan bearing — pre-assembled base + top |
| 4 | Technic Worm Screw, Long (part 4716) | 2 | ~$1 ea | [BrickLink](https://www.bricklink.com/v2/catalog/catalogitem.page?P=4716) | One per axis |
| 5 | Technic Gear 24-tooth w/ 1 axle hole (part 3648) | 2 | ~$0.50 ea | [BrickLink](https://www.bricklink.com/v2/catalog/catalogitem.page?P=3648) | Mates with worm |
| 6 | Wide silicone rubber bands, ~20 cm loop (12-pack) | 1 | ~$8 | [Amazon](https://www.amazon.com/Silicone-Different-Supplies-Wrapping-Stretchy/dp/B0CBN62DP9) | Secure iPad in cradle |
| 7 | StarTech right-angle Lightning cable, 2 m, MFi, aramid | 1 | ~$20 | [Amazon – white](https://www.amazon.com/StarTech-com-6-6ft-Angled-Lightning-Cable/dp/B07YVYPM2C) · [Amazon – black](https://www.amazon.com/StarTech-com-6-6ft-Angled-Lightning-Cable/dp/B07YVYJ7KM) | 10.5" Pro is Lightning, not USB-C |
| 8 | Clear silicone countertop/desk mat, non-slip | 1 | ~$15 | [Amazon](https://www.amazon.com/Silicone-Countertop-Protector-Resistant-Kitchen/dp/B0D87NL8ND) | Stops base creep; optional if you clamp the base |

**Subtotal: ~$590** at retail. Can often trim 20–40% by buying SPIKE Prime
used from classroom resellers on [eBay](https://www.ebay.com/p/9039222831).
Expansion set 45680 is also used-friendly.

## Shopping list — Option B: EV3 budget path

Robot Inventor 51515 used is no longer budget-friendly (~$727+). EV3 still
is. Parts are widely available individually.

| # | Item | Qty | Price | Link | Notes |
|---|------|-----|-------|------|-------|
| 1 | EV3 Intelligent Brick 45500 (used) | 1 | ~$40–60 | [eBay search](https://www.ebay.com/sch/i.html?_nkw=lego+ev3+45500) · [BrickLink](https://www.bricklink.com/v2/catalog/catalogitem.page?S=45500-1) | The hub. Run Pybricks or ev3dev |
| 2 | EV3 Large Servo Motor 45502 (used) | 2 | ~$15–25 ea | [BrickLink](https://www.bricklink.com/v2/catalog/catalogitem.page?S=45502-1) · [Brick Owl](https://www.brickowl.com/us/catalog/lego-ev3-large-servo-motor-set-45502) · [eBay](https://www.ebay.com/shop/ev3-motor?_nkw=ev3+motor) | Highest torque of any LEGO motor |
| 3 | EV3 charger + battery pack (or 6× AA) | 1 | ~$20–40 | [eBay search](https://www.ebay.com/sch/i.html?_nkw=EV3+rechargeable+battery) | Needed unless seller includes |
| 4 | Technic parts lot (beams 5/7/9/11/15, pins, axles) | 1 | ~$30–50 | [BrickLink Technic category](https://www.bricklink.com/catalogList.asp?catString=55&catType=P) | Build out the yoke/base |
| 5 | Turntable 99009c01, worm 4716 ×2, gear 3648 ×2 | 1 set | ~$7 | Same BrickLink links as Option A rows 3–5 | — |
| 6 | Silicone bands + Lightning cable + desk mat | 1 set | ~$43 | Same as Option A rows 6–8 | — |

**Subtotal: ~$190–290** depending on luck and seller.

*Alternative brick:* a [used Robot Inventor 51515](https://www.ebay.com/p/13042040481)
is mechanically a drop-in for SPIKE Prime (same hub) — but current prices
make it a worse deal than new SPIKE Prime. Only buy at ≤$300.

## Shopping list — Option C: Pybricks-first (most hackable)

Hardware = Option A or B, **plus flash [Pybricks](https://pybricks.com)**
(free) onto the hub. Unlocks MicroPython REPL + BLE, the cleanest path for
wiring pan/tilt into VoiceClaw's brain agent as a `look_at()` tool.

- Installer: [install.pybricks.com](https://www.install.pybricks.com/)
- Docs: [docs.pybricks.com/hubs/primehub](https://docs.pybricks.com/en/latest/hubs/primehub.html)
- Confirmed support: SPIKE Prime Hub, Robot Inventor Hub (identical
  hardware), EV3 Brick.

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
