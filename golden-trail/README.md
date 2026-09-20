# Golden Trail — Knights of the Dragon Road

A Golden-Axe-style arcade beat-'em-up built for phones. Pick one of four knights
and fight your way down a six-stage trail of bandits, treasure and dragons.
Plain HTML, CSS and canvas — no build step, no dependencies, no sprite sheets:
every knight, drake and wyrm is drawn with canvas paths at runtime.

Play it at `golden-trail/index.html` (locally: `npx http-server -p 8146 .` then open
`http://localhost:8146/golden-trail/`).

## Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move | left stick (8 directions) | arrows or WASD |
| Attack | ⚔ button | space or J |
| Heavy blow | hold ⚔, then release | hold space, then release |
| Jump | ⤒ button | K or shift |
| Magic | ✦ button | L or E |
| Pause | pause button | P or Esc |
| Sound | speaker button | M |

The road has depth: walking up and down moves you between the near and far edges
of the band, and a blow only lands when you and your target share a line.

## The four knights

| Knight | Weapon | Plays like | Magic |
| --- | --- | --- | --- |
| Sir Alden | longsword | balanced, forgiving | Hallowed Nova |
| Brynn Ironmane | great axe | slow, heavy armour, huge damage | Mountainfall |
| Kael Swiftlance | spear | fast, long reach, thin armour | Gale Edge |
| Mira Emberveil | runeblade | weak melee, devastating magic | Dragonfire |

## Fighting

- **Combos.** Three light blows chain together; the third knocks a foe down.
  Holding the attack button winds up a heavy blow that launches on contact.
- **Jump attacks.** Leap first, swing in the air, and you come down on top of them.
- **Magic.** Blue vials are spent all at once — the more you have saved, the
  bigger the spell. Each knight's spell looks and hits differently.
- **Rewards.** Gnome thieves drop loot when you hit them, strongboxes break open,
  and the road leaves behind gold, meat (health), vials and rune shards
  (a permanent bite to your blows for the rest of the stage).
- **Dragons.** Wyrm riders patrol the later stages. Unseat one and the drake is
  yours to ride: it moves faster, breathes fire on the attack button, and soaks
  every hit until it has had enough and throws you off. Two great wyrms — the
  Ember Wyrm and the Ashen Wyrm — close out their stages with claw, breath and,
  in the Ashen Wyrm's case, a flight that rains fireballs down the road.

## The trail

Six stages, each a scrolling road broken into bands that lock the camera until
they are cleared: Greenwood Road, The Broken Bridge, Ashfall Pass (Ember Wyrm),
Frostwatch Keep, The Bonefield, and The Dragon's Spine (Ashen Wyrm). Progress,
gold and the stage you reached are saved to `localStorage`, so **Continue** on
the title screen picks the trail back up where you left it.

## Under the hood

- `game.js` — the whole game in one IIFE: entities, combat, enemy AI, stage flow
  and the renderer.
- `style.css` — HUD, overlays and the touch controls.
- `sw.js` + `manifest.json` — installable and playable offline.

The world is measured in design pixels on a 640-tall stage and scaled to fit
whatever screen it lands on. Fighters live at `(x, y, z)`: `x` scrolls with the
road, `y` is the ground line inside the walkable band (which also drives draw
order and sprite scale), and `z` is height above the ground for jumps.
