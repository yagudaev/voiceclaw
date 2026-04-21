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

## Canadian sourcing strategy (all prices CAD)

**Two things that shape the shopping below.**

1. **SPIKE Prime 45678 retires June 30, 2026.** LEGO.com Canada lists MSRP at
   **$630 CAD** but is currently *sold out* as of April 2026. Canadian
   education resellers (Studica, Spectrum Educational, Robotix Education,
   TOYTAG, JR Toy) are the realistic channel. Watch for sales.
2. **MINDSTORMS Robot Inventor 51515 is a dead end in Canada too.** Original
   MSRP was $459.99 CAD but it's retired everywhere; secondary market is
   ~$770 USD (≈ $1050+ CAD). The EV3 budget path is the realistic
   alternative, not 51515.

Canadian BrickLink sellers — cluster your parts order with one to save on
shipping: [Canada First Bricks](https://store.bricklink.com/canadafirst) ·
[Toronto Bricks](https://store.bricklink.com/Torontolego) ·
[BrickBeaver](https://store.bricklink.com/BrickBeaver.com) ·
[Canadian Bricks](https://store.bricklink.com/HKY) ·
[Parts Store Canada](https://store.bricklink.com/TOOLMANALAN). On any part
page, use **"Sellers From: Canada"** to avoid cross-border fees.

## Shopping list — Option A: SPIKE Prime path (recommended, Canada)

Cleanest build. Both motors have absolute encoders out of the box. All
prices CAD, retail. Several vendors listed per line — buy from whichever is
in stock / cheapest on the day.

| # | Item | Qty | Price CAD | Buy from (Canada) | Notes |
|---|------|-----|-----------|-------------------|-------|
| 1 | LEGO Education SPIKE Prime Set 45678 | 1 | $500–$630 | [LEGO.com CA](https://www.lego.com/en-ca/product/lego-education-spike-prime-set-45678) · [Studica CA](https://www.studica.ca/en/lego-education-spike-prime-set-45678) · [Spectrum Ed](https://spectrumed.ca/en/lego-education-spike-prime-set) · [Robotix Education](https://robotixeducation.ca/products/lego-education-spike-prime-set) · [TOYTAG](https://www.toytag.com/products/lego-education-spike-prime-set) · [Amazon.ca](https://www.amazon.ca/Lego-Education-Spike-Prime-Set/dp/B07QN7ZJF9) | Hub + 2× Medium + 1× Large motor, sensors, Technic. LEGO.ca is $630; education resellers often run 15–20% lower |
| 2 | SPIKE Prime Expansion Set 45680 | 1 | $150–$180 | [Robotix Education](https://robotixeducation.ca/products/lego-education-spike-prime-expansion-set) · [Studica CA](https://www.studica.ca/en/lego-education-store) · [Amazon.ca](https://www.amazon.ca/s?k=LEGO+Education+Spike+Prime+Expansion+45680) | Adds the 2nd Large + 1 Medium motor — you need this for two Large motors |
| 3 | Technic Turntable 28T base+top (99009c01) | 1 | $3–$5 | [BrickLink part 99009c01](https://www.bricklink.com/v2/catalog/catalogitem.page?P=99009c01) → filter Canadian sellers · [Brick Owl CA](https://www.brickowl.com/ca/catalog/search?query=99009c01) | Pan bearing, pre-assembled |
| 4 | Technic Worm Screw, Long (4716) | 2 | $1–$2 ea | [BrickLink part 4716](https://www.bricklink.com/v2/catalog/catalogitem.page?P=4716) → Canadian sellers | One per axis |
| 5 | Technic Gear 24-tooth, 1 axle hole (3648) | 2 | $0.50–$1 ea | [BrickLink part 3648](https://www.bricklink.com/v2/catalog/catalogitem.page?P=3648) → Canadian sellers | Mates with worm |
| 6 | Wide silicone rubber bands (pack) | 1 | $12–$15 | [Amazon.ca – silicone rubber bands](https://www.amazon.ca/silicone-rubber-bands/s?k=silicone+rubber+bands) | Any 15–20 cm loop pack works |
| 7 | StarTech right-angle Lightning 2 m, MFi, aramid | 1 | $25–$30 | [Amazon.ca – RUSBLTMM2MWR white](https://www.amazon.ca/6-6ft-Angled-Lightning-USB-Cable/dp/B07YVYPM2C) · [Amazon.ca – USBLT2MWR](https://www.amazon.ca/StarTech-com-USBLT2MWR-Angled-Lightning-Cable/dp/B00XLB0P9G) | 10.5" iPad Pro is Lightning, not USB-C |
| 8 | Non-slip silicone mat | 1 | $15–$25 | [Amazon.ca – non-slip desk mat](https://www.amazon.ca/non-slip-desk-mat/s?k=non+slip+desk+mat) | Optional if you clamp the base |

**Target total (Canada, retail): ~$720–$860 CAD.**

**Ways to cut cost:**
- Buy SPIKE Prime used from Canadian classroom resellers on
  [eBay.ca](https://www.ebay.ca/sch/i.html?_nkw=LEGO+SPIKE+Prime+45678) or
  [Kijiji](https://www.kijiji.ca/b-canada/lego-spike-prime/k0l0) — typical
  saving 20–40%.
- Skip the Expansion 45680 and use 2× Medium motors on the base set with
  tighter gear reduction to compensate. Saves ~$160 CAD.
- Harvest the turntable/worm/24T from the Expansion set parts pool instead
  of buying separately (verify the inventory first on BrickLink).

**Cost-optimized target (used base + trimmed extras): ~$450–$550 CAD.**

## Shopping list — Option B: EV3 budget path (Canada)

If Option A is over budget, EV3 is well-stocked on eBay.ca and Kijiji.
Highest torque of any LEGO motor, fully Pybricks-compatible.

| # | Item | Qty | Price CAD | Buy from (Canada) | Notes |
|---|------|-----|-----------|-------------------|-------|
| 1 | EV3 Intelligent Brick 45500 (used) | 1 | $50–$100 | [eBay.ca – EV3 45500](https://www.ebay.ca/sch/i.html?_nkw=lego+ev3+45500) · [Kijiji – EV3](https://www.kijiji.ca/b-canada/lego-ev3/k0l0) · [BrickLink 45500-1](https://www.bricklink.com/v2/catalog/catalogitem.page?S=45500-1) | The hub |
| 2 | EV3 Large Servo Motor 45502 (used) | 2 | $20–$40 ea | [eBay.ca – EV3 motor](https://www.ebay.ca/sch/i.html?_nkw=lego+ev3+large+motor+45502) · [BrickLink 45502-1](https://www.bricklink.com/v2/catalog/catalogitem.page?S=45502-1) · [Brick Owl](https://www.brickowl.com/us/catalog/lego-ev3-large-servo-motor-set-45502) | Highest-torque LEGO motor |
| 3 | EV3 charger + rechargeable battery (or 6× AA) | 1 | $25–$50 | [eBay.ca search](https://www.ebay.ca/sch/i.html?_nkw=EV3+rechargeable+battery) | Needed unless seller includes. AA batteries in holder work too |
| 4 | Technic parts lot (beams 5/7/9/11/15, pins, axles) | 1 | $40–$70 | [BrickLink Technic sellers in Canada](https://www.bricklink.com/browseStores.asp?countryID=CA&groupState=Y) · [Kijiji – lego bulk](https://www.kijiji.ca/b-canada/lego-bulk/k0l0) | Build out the yoke/base |
| 5 | Turntable 99009c01 + worm 4716 ×2 + 24T 3648 ×2 | 1 set | ~$8 | Same BrickLink part pages as Option A | — |
| 6 | Silicone bands + Lightning cable + non-slip mat | 1 set | ~$55 | Same Amazon.ca links as Option A rows 6–8 | — |

**Target total (Canada, used-market): ~$220–$350 CAD.**

*Stay away from used Robot Inventor 51515 in Canada — pricing is now
collector-tier and there's no mechanical advantage over SPIKE Prime or EV3
for this build.*

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
