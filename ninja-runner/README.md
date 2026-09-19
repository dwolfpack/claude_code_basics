# Shadow Step — Ninja Runner

A Subway-Surfers-style endless runner built for phones: three lanes, a pseudo-3D
road, swipe controls, and a friendly ninja who dodges obstacles and gathers coins.
Plain HTML, CSS and canvas — no build step, no dependencies.

Play it at `ninja-runner/index.html` (locally: `npx http-server -p 8145 .` then open
`http://localhost:8145/ninja-runner/`).

## Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Change lane | swipe left / right | ← → or A D |
| Jump | swipe up, or tap | ↑ W or space |
| Roll under | swipe down | ↓ S or shift |
| Pause | pause button | P or Esc |
| Sound | speaker button | M |

A swipe down while airborne slams the ninja to the ground and rolls on landing.

## Gameplay

- **Obstacles.** Crates are jumped, low gates are rolled under, bamboo walls have to
  be side-stepped, and long carts can be side-stepped or landed on — their roofs
  carry a coin run.
- **Power-ups.** Magnet pulls coins in, shield absorbs one hit, the sparkle doubles
  score, and dash makes the ninja briefly invincible and smashes through obstacles.
- **Three lives.** A hit costs one heart, slows the run and grants brief invulnerability.
- **Pace.** Speed climbs from 15 to 39 units/s; the gap between obstacle patterns
  scales with speed so a faster run never becomes unreadable.
- **Scenery.** The palette crossfades between four biomes every 900 m.

Best score and total coins are kept in `localStorage`. A service worker caches the
game so it runs offline, and the manifest lets it be installed to a home screen.

## Code layout

| File | Contents |
| --- | --- |
| `index.html` | Canvas, HUD, and the menu / pause / game-over cards |
| `style.css` | Mobile-first UI, safe-area insets, phone-shaped frame on desktop |
| `game.js` | Everything else: projection, spawner, physics, rendering, audio |
| `sw.js`, `manifest.json`, `icons/` | Offline cache and installable app metadata |

`game.js` is organised in sections: tuning constants, helpers, storage, a small
WebAudio synth, the projection, game state, input, the pattern spawner, physics and
collisions, the renderer, then the HUD and main loop.

### Level generation

`spawnPattern()` picks from six arrangements — single obstacle, two blocked lanes,
a full clearable row, a cart, a staircase, and a coin breather. Every arrangement
leaves at least one survivable line, and the spacing between them is derived from the
current speed. An automated bot that reacts to the nearest obstacle in its lane runs
for a full minute at top speed without taking a hit.

### Tuning

The numbers worth touching live in `CFG` at the top of `game.js`: `laneW`, `camY` and
`focalFrac` control the camera; `gravity`, `jumpV` and `rollTime` control the moves;
`startSpeed`, `maxSpeed` and `accel` control the pace.

`window.ShadowStep` exposes the game state and the move functions for automated testing.
