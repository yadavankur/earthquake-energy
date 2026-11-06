# A Hundred Taps or One Blow

An animated slideshow that shows why one great earthquake releases more energy than thousands of small ones. It follows the goldsmith-and-blacksmith idea: many light taps against one heavy blow.

It is plain HTML, CSS and JavaScript. There is no build step and no dependency to install. The only outside request is Google Fonts, and the page falls back to system fonts if that fails.

## Run it

Open `index.html` in a browser. To serve it locally instead:

```
python3 -m http.server 8000
```

Then visit http://localhost:8000.

Controls: Next and Back buttons, the left and right arrow keys, or a swipe on a touch screen. Tap or click a chart to replay its animation. The page follows the system light or dark theme.

## Slides

1. Title: a seismogram of small tremors, then one great quake
2. What magnitude measures: each step up is about 32 times more energy
3. How often quakes happen: each step down is 10 times more common
4. The race between count and energy
5. A century's total energy by magnitude
6. Seismic energy next to familiar events, including a 10 kg lead ball
7. An interactive b-value slider
8. The five real M9 quakes since 1900
9. The answer

## Files

| File | Purpose |
|---|---|
| `index.html` | Slide text and structure |
| `style.css` | Colours, type, layout, light and dark themes |
| `app.js` | Navigation and the canvas animation for each slide |

## The numbers

- **Energy:** log₁₀ E = 1.5 M + 4.8, with E in joules (Gutenberg and Richter). One magnitude step is a factor of 10^1.5, about 31.6.
- **Frequency:** the Gutenberg-Richter law, N ∝ 10^(−b·M). The deck uses b = 1, so each step down in magnitude gives 10 times as many quakes. Counts are scaled to about 100 quakes of M8 per century.
- **Energy per magnitude band:** count × energy per quake. With b = 1 this rises by about 3.2 times per step up.
- **TNT:** 1 tonne of TNT is defined as 4.184 GJ.
- **Real data:** the M9 quakes are Kamchatka 1952, Chile 1960, Alaska 1964, Sumatra 2004 and Tohoku 2011. Magnitudes are rounded USGS values.

## Caveats

- Energy here is radiated seismic energy only. Real quakes of the same magnitude vary in energy by a factor of a few.
- Real b-values range from about 0.8 to 1.2 depending on region.
- Counts below about M5 are theoretical, because catalogs miss many small quakes.
- The comparison events (Beirut 2020, Chelyabinsk 2013, Tunguska 1908 and others) have uncertain yields, and the deck matches energy, not damage.

## Publish with GitHub Pages

In the repository, open Settings, then Pages. Under Build and deployment, choose Deploy from a branch, select `main` and `/ (root)`, and save. The site appears at `https://<your-username>.github.io/<repository-name>/` after a minute or so.
