# Name Picker

A small name wheel for your daily. Plain HTML, CSS and JavaScript, with no dependencies, build step, accounts, analytics or external assets.

Open `index.html` in a modern browser. Paste one name per line, uncheck anyone away, then pick someone. Everyone gets one turn per round by default. Use **Start fresh** to reset the round, or disable **Everyone gets a turn** to allow repeats.

Names stay in the browser. **Remember my list** optionally saves names, attendance and the repeat setting in this browser's local storage. Turn it off to remove that saved data. Picks are session-only. Do not commit real team names to the repository or put them in URLs. Anyone sharing this browser profile can see a saved list.

The picker supports up to 100 unique names. Exact duplicates count once; add initials for people with the same name. Selection uses `crypto.getRandomValues` with rejection sampling; the animation follows the result. Reduced-motion preferences are respected.

## GitHub Pages

1. Create a repository named `name-picker` under `danny-molnar`.
2. Upload `index.html`, `style.css`, `app.js` and `.nojekyll` to the root of its `main` branch.
3. Under **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then `main` and `/ (root)`.
4. After deployment, open `https://danny-molnar.github.io/name-picker/`.

No secrets or GitHub Actions workflow are required. The application files use relative paths so project Pages hosting works.

## Local checks

```sh
node --check app.js
python3 -m http.server 8080
```

Visit `http://localhost:8080`. Check example names, attendance, a full no-repeat round, reset, repeat mode, and opting in/out of remembering names. Check keyboard use and reduced-motion mode too.
