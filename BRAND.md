# stepthru brand

How stepthru looks and sounds, and why. Written for someone who has never seen the project.

## Strategy

| | |
|---|---|
| **Audience** | People who explain algorithms on the web: technical writers, teachers, developers with a blog. |
| **Promise** | The code in the post is the code that drives the figure. |
| **Personality** | Precise, calm, made with care. Not playful, not corporate. |
| **Values** | Honest (the figure shows what the code did), small (no dependencies, few concepts), accessible (keyboard, screen readers, contrast). |
| **Tagline** | Trace the real code. Step through what it does. |

Every choice below follows from this. If a new choice cannot be traced back to it, question the choice.

## Name

Always `stepthru`: lowercase, one word, also at the start of a sentence.

- **Why:** it is the npm package name and the import name. One spelling means one thing to search for.
- **Not:** StepThru, Stepthru, step-thru, Step Through.
- **When to break:** never in prose. A document title may follow its own style rules, such as title case in a slide deck.

## Logo

Three bars rising left to right. The last bar is the accent color.

The bars read as a sorted array, as steps, and as progress, which are the three things stepthru shows. The accent on the last bar is the same idea as the library's highlight on the current step.

| File | Use |
|---|---|
| `brand/logo.svg` | Default. Two colors, switches to the dark palette by itself under `prefers-color-scheme: dark`. |
| `brand/logo-mono.svg` | One color (`currentColor`). For places that allow one color only: print, stamps, a single-color header. |

There is no separate wordmark file. The lockup is the mark followed by the word `stepthru` set in live text (see Typography), so it stays sharp, selectable and translatable.

**Rules**

- **Smallest size 16 px.** Why: it was drawn on a 16 × 16 grid and holds at that size; below it the gaps between bars close.
- **Clear space of one bar width (4/16 of the mark) on every side.** Why: the mark is small and quiet; crowding makes it read as a chart or an icon in a toolbar.
- **Lockup:** mark height = cap height of the wordmark × about 1.3, gap = 0.6 × the mark height. See the demo site header.
- **When the logo sits next to the word "stepthru"**, give the image `alt=""`. Why: the text already names it; `alt="stepthru"` makes screen readers say the name twice. When the logo stands alone, use `alt="stepthru"`.

**Do not**

- Recolor the bars outside the palette, or color all three with the accent. Why: the single accent bar is the idea.
- Reverse, rotate or reorder the bars. Rising left to right means "sorted" and "forward".
- Add outlines, shadows, gradients or 3D.
- Put the two-color logo on a busy or mid-tone background. Use `logo-mono.svg` in white or black there.

**Known risk:** rising bars are also a common "signal strength" icon. The accent bar and the wordmark next to it separate the two. Avoid showing the mark alone in a status-bar-like context.

## Color

The palette lives in one place: the `--stepthru-*` variables in `src/styles/theme.css`. Everything else (demo site, social image) reads those variables or copies the values below.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--stepthru-fg` | Text, idle shapes in the logo | `#1b1a24` | `#ecebf5` |
| `--stepthru-bg` | Background | `#ffffff` | `#13121a` |
| `--stepthru-muted` | Borders, idle cells, secondary text | `#767389` | `#8e8aa6` |
| `--stepthru-accent` | Brand color. Current step, highlights, links, focus | `#5b3fd9` | `#a594ff` |
| `--stepthru-done` | Marked, sorted, visited | `#1d7a4f` | `#4cc38a` |

Contrast against the background (WCAG 2.2): text and accent pass 4.5:1, muted and done pass 3:1 in both themes. Value text on the 25 % tinted cells passes 4.5:1. Check any new pair before using it.

- **One accent.** Why: the accent means "look here". A second loud color would compete with it.
- **Never use color alone to carry meaning.** Why: about 1 in 12 men has a color vision deficiency. stepthru pairs color with a second signal: stroke width for active cells, dashes for moved cells, captions for everything.
- **When to break:** a host site maps the tokens to its own palette. That is expected; the library is a guest on someone else's page.

## Typography

stepthru figures inherit the host page's font. The brand does not ship a font.

- **Why:** figures sit inside other people's articles and must look like part of them; a bundled font would also add weight and a license.
- **Brand surfaces** (demo site, social image) use the system UI stack: `system-ui, sans-serif`, and `ui-monospace, monospace` for code.
- **Wordmark:** `stepthru` in the UI stack at weight 700, letter spacing −0.02 em to −0.03 em.
- **Hierarchy on brand surfaces:** title 2.25 rem bold, tagline 1.125 rem, body 1 rem at line height 1.6, code 0.875 rem.

## Shape and spacing

- **Corners:** 4 px radius on cells and buttons, 1/16 of the mark on the logo bars. Why: soft enough to feel made, square enough to read as data.
- **Spacing:** cells sit 4 px apart; figure parts use multiples of 4 and 8. Why: one rhythm across the logo, the figures and the controls.

## Voice

The README, captions and docs share one voice.

- **Short and concrete.** "Compare 5 and 2", not "Now we will compare the two values".
- **Say what happens, not how good it is.** No "powerful", "seamless", "blazing fast".
- **Name limits plainly.** "Graphs are undirected and unweighted." Readers trust a project that tells them what it cannot do.
- **Address the reader as "you"**, in the active voice.

| Instead of | Write |
|---|---|
| A powerful, flexible visualization framework | Step-through algorithm figures |
| Seamlessly integrates with your stack | Works in any page that can give it a DOM element |
| Oops! Something went wrong | `index 9 is outside 0..5` |

## Applications

| Surface | What it uses |
|---|---|
| Demo site | `logo.svg` as favicon and in the header lockup, page colors from the tokens, tagline under the title, Open Graph image. |
| README | The mark and the wordmark as the title (absolute image URL, so it also shows on npm), tagline as the first line. |
| GitHub social preview | `brand/social.png` (1280 × 640): lockup, tagline and a real stepthru figure on the dark palette. |
| Figures in other sites | The host's colors via the tokens. No logo inside figures. Why: the figure belongs to the author's article, not to stepthru. |

`brand/social.png` is rendered from the built library, so its figure is real output. Rebuild it when the palette or the array view changes.
