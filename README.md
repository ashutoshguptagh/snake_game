# 🐍 Neon Snake — Slither Arena

> A modern snake.io-style browser game with glowing RGB visuals, AI opponents,
> smooth mouse steering, and a live leaderboard — built with **pure HTML, CSS & JavaScript**.

![Neon Snake Banner](screenshots/banner.png)

---

## ✨ Features

- 🎮 **Snake.io-style gameplay** — Steer with your mouse, eat orbs, grow longer.
- 🤖 **8 AI opponents** — Bots hunt food, dodge walls, and avoid each other.
- 🏆 **Live leaderboard** — Top 5 snakes ranked by score, updated in real time.
- 🗺️ **Minimap** — Track every snake's position in the circular arena.
- 🌈 **Neon RGB aesthetic** — Glowing trails, hue-shifting snakes, bright food orbs.
- 🎥 **Dynamic camera** — Smooth follow with zoom-out as you grow.
- 💥 **Collision & death** — Hit another snake or the wall, and you explode into orbs.
- 📱 **Responsive** — Works on desktop (mouse) and mobile (touch).
- 🚫 **Zero dependencies** — No frameworks, no build tools. Just open and play.

---

## 🖼️ Screenshots

| Start Screen | In-Game |
|--------------|---------|
| ![Start](screenshots/start.png) | ![Gameplay](screenshots/gameplay.png) |

| Leaderboard & Minimap | Game Over |
|-----------------------|-----------|
| ![HUD](screenshots/hud.png) | ![Over](screenshots/gameover.png) |

---

## 🚀 Live Demo

👉 **[Play Neon Snake](https://your-username.github.io/neon-snake/)**
*(Replace with your GitHub Pages URL)*

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, gradients, backdrop-filter) |
| Game Logic | Vanilla JavaScript (ES6+, IIFE scoped) |
| Rendering | HTML5 Canvas 2D |
| Fonts | Google Fonts — Orbitron |

---

## 📁 Project Structure

```
neon-snake/
│
├── index.html          # Markup, HUD, overlays
├── style.css           # Neon UI, layout, animations
├── script.js           # Game loop, AI, rendering, input
├── screenshots/        # Preview images for README
└── README.md
```

---

## 🕹️ How to Play

1. Open `index.html` in any modern browser (or visit the live demo).
2. Click **PLAY** on the start screen.
3. **Move your mouse** — your snake follows the cursor.
4. **Eat glowing orbs** to grow longer and gain score.
5. **Avoid other snakes' bodies** and the **arena boundary** — touching either ends your run.
6. Check the **leaderboard** and **minimap** to plan your next move.
7. Try to reach **#1** before you're taken down!

---

## 🎯 Game Rules & Scoring

| Action | Effect |
|--------|--------|
| Eat an orb | +5 score, +1.5 segments |
| Touch a wall | 💀 Die |
| Hit another snake's body | 💀 Die |
| Death | Body scatters into orbs for others |
| Growth | Radius increases with score (max +14px) |
| Camera zoom | Zooms out as you grow, keeping the arena visible |

---

## 🧩 Customization

Make it your own — all tunable values are at the top of `script.js`:

| What to change | Variable |
|----------------|----------|
| Arena size | `WORLD_R` (default `1800`) |
| Food density | `FOOD_COUNT` (default `320`) |
| AI opponents | `BOT_COUNT` (default `8`) |
| Snake speed | `this.speed = 3.4` in `Snake` class |
| Player turn rate | `0.1 * dt` in `update()` |
| Bot turn rate | `0.06 * dt` in `update()` |
| Snake hues | `HUES` array |
| Colors & fonts | `:root` variables in `style.css` |

---

## 🧪 Browser Support

✅ Chrome · ✅ Firefox · ✅ Edge · ✅ Safari · ✅ Brave
*(Requires Canvas 2D + `requestAnimationFrame` — all modern browsers qualify.)*

---

## 🎨 Design Notes

- **Glowing trails** are rendered with a two-pass stroke: a wide low-opacity glow, then a solid core.
- **Food orbs** use the `lighter` composite operation for a soft additive glow.
- **Camera easing** and **dynamic zoom** keep the action readable as snakes grow.
- **Leaderboard & minimap** sit in the corners for a clean, unobtrusive HUD.
- **Overlays** use backdrop blur + glowing Orbitron text for a modern arcade feel.

---

## 🤝 Contributing

Ideas, fixes and PRs are welcome!

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-idea`
3. Commit: `git commit -m "Add your idea"`
4. Push: `git push origin feature/your-idea`
5. Open a Pull Request

---

## 📄 License

MIT License — free to use, modify and share.

---

## 🙌 Acknowledgements

- Font: [Orbitron](https://fonts.google.com/specimen/Orbitron) by Google Fonts
- Inspired by [slither.io](https://slither.io) and the classic Snake game
- All rendering hand-crafted in Canvas 2D 🎨

---

<p align="center">
  <b>Made with 💜 and a lot of neon.</b><br>
  ⭐ Star this repo if Neon Snake kept you hooked!
</p>
