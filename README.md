# Five Dice Push

A dependency-free progressive web app for a two-player five-dice game.

## Play Locally

From this directory:

```sh
cd app
python3 -m http.server 5173
```

Open `http://localhost:5173`.

## GitHub Pages

The app is fully static and deploys from the `app` directory through GitHub Actions.

1. Push this repository to GitHub.
2. In the repository settings, enable Pages.
3. Set the Pages source to GitHub Actions.
4. Push to `main` or run the `Deploy GitHub Pages` workflow manually.

## Rules

- Players roll five dice up to three times.
- Player 2 can be another person or Codex.
- After each roll, the player can hold any dice and reroll the rest.
- The challenger gets only as many rolls as the target used.
- More matching dice wins.
- If the count is tied, higher face value wins.
- If count and face are tied, fewer rolls wins.
- Exact match is a push: no point, same starter leads the next round.
- If the challenger fails, the starter scores.
- If the challenger beats the starter, the challenger scores and starts the next round.
