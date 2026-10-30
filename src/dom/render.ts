import { escape } from "../core/escape.js";
import { createPlayer, type Player, type PlayerState } from "../core/player.js";
import type { Trace, Vars, View } from "../core/trace.js";
import { fitTo, largest, svgSize } from "./fit.js";
import { ICONS } from "./icons.js";

/** Text for the controls and panels, for screen readers and tooltips. Translate them with `labels`. */
export interface Labels {
  first: string;
  prev: string;
  play: string;
  pause: string;
  next: string;
  last: string;
  step: string;
  code: string;
  variables: string;
}

export const LABELS: Labels = {
  first: "First step",
  prev: "Previous step",
  play: "Play",
  pause: "Pause",
  next: "Next step",
  last: "Last step",
  step: "Step",
  code: "Code",
  variables: "Variables",
};

export interface RenderOptions<S> {
  /** Overrides the trace's own view. Required when the trace has none. */
  view?: View<S>;
  intervalMs?: number;
  /** Source code to show under the figure. Steps tagged with `t.at(line)` highlight that line. */
  code?: string;
  labels?: Partial<Labels>;
}

export interface RenderedFigure extends Player {
  /** Stops playback and removes the figure's listeners and observer. Leaves the markup in place. */
  destroy(): void;
}

type Action = "first" | "prev" | "toggle" | "next" | "last";

const KEYS: Record<string, Action> = {
  Home: "first",
  ArrowLeft: "prev",
  " ": "toggle",
  ArrowRight: "next",
  End: "last",
};

const BUTTONS: [Action, keyof typeof ICONS, keyof Labels][] = [
  ["first", "first", "first"],
  ["prev", "prev", "prev"],
  ["toggle", "play", "play"],
  ["next", "next", "next"],
  ["last", "last", "last"],
];

// Markup pieces shared by render() and toHTML(), so the static and live figure are the same.

const varsItems = (vars: Vars | undefined) =>
  Object.entries(vars ?? {})
    .filter(([, v]) => v !== undefined)
    .map(([name, v]) => `<div><dt>${escape(name)}</dt><dd>${escape(JSON.stringify(v) ?? String(v))}</dd></div>`)
    .join("");

const codeLines = (code: string) =>
  code
    .replace(/\n$/, "")
    .split("\n")
    .map((text, i) => `<span class="stepthru-line" data-line="${i + 1}">${escape(text)}</span>`)
    .join("");

const counterText = (index: number, length: number) => `${index + 1} / ${length}`;

function prepare<S>(trace: Trace<S>, { view = trace.view, labels, code }: RenderOptions<S>) {
  if (!view) throw new TypeError("render needs a view: pass options.view or use a structure tracer");
  const { steps } = trace;
  return {
    steps,
    // Draw every step once up front, so the figure can keep the size of its largest step.
    markup: steps.map((step) => view(step.state)),
    text: { ...LABELS, ...labels },
    code,
    hasVars: steps.some((step) => step.vars),
  };
}

function figureHTML({ steps, markup, text, code, hasVars }: ReturnType<typeof prepare>, controlsHidden: boolean) {
  const [first] = steps;
  const last = steps.length - 1;
  const buttons = BUTTONS.map(
    ([action, icon, label]) =>
      `<button type="button" data-action="${action}" aria-label="${escape(text[label])}">${ICONS[icon]}</button>`,
  ).join("");
  return `<div class="stepthru-figure">${markup[0]}</div>`
    + (hasVars ? `<dl class="stepthru-vars" aria-label="${escape(text.variables)}">${varsItems(first.vars)}</dl>` : "")
    + `<p class="stepthru-caption" aria-live="polite">${escape(first.caption)}</p>`
    + `<div class="stepthru-controls"${controlsHidden ? " hidden" : ""}>${buttons}`
    + `<input class="stepthru-scrub" type="range" min="0" max="${last}" value="0" aria-label="${escape(text.step)}">`
    + `<span class="stepthru-counter">${counterText(0, steps.length)}</span></div>`
    + (code ? `<pre class="stepthru-code" aria-label="${escape(text.code)}"><code>${codeLines(code)}</code></pre>` : "");
}

/**
 * The figure's first step as an HTML string, for server or build-time rendering. Put it inside an
 * element with class `stepthru`; the controls stay hidden until `render` runs on that element.
 */
export function toHTML<S>(trace: Trace<S>, options: RenderOptions<S> = {}): string {
  return figureHTML(prepare(trace, options), true);
}

/** Mounts a playable figure for `trace` into `el` and returns its player. Replaces what `el` holds. */
export function render<S>(trace: Trace<S>, el: HTMLElement, options: RenderOptions<S> = {}): RenderedFigure {
  const prepared = prepare(trace, options);
  const { steps, markup, text } = prepared;
  const last = steps.length - 1;
  const sizes = markup.map(svgSize);
  const box = largest(sizes);

  el.classList.add("stepthru");
  el.tabIndex = 0;
  el.innerHTML = figureHTML(prepared, false);

  const part = <T extends Element>(selector: string) => el.querySelector<T>(selector);
  const figure = part<HTMLElement>(".stepthru-figure")!;
  const caption = part<HTMLElement>(".stepthru-caption")!;
  const scrub = part<HTMLInputElement>(".stepthru-scrub")!;
  const counter = part<HTMLElement>(".stepthru-counter")!;
  const toggle = part<HTMLButtonElement>('[data-action="toggle"]')!;
  const vars = part<HTMLElement>(".stepthru-vars");
  const lines = [...el.querySelectorAll<HTMLElement>(".stepthru-line")];

  const update = ({ index, playing }: PlayerState) => {
    const step = steps[index];
    figure.innerHTML = markup[index];
    if (box) fitTo(figure.querySelector("svg")!, sizes[index]!, box);
    // Announce only steps the reader moves to; during playback a caption every interval is noise.
    caption.setAttribute("aria-live", playing ? "off" : "polite");
    caption.textContent = step.caption;
    if (vars) vars.innerHTML = varsItems(step.vars);
    for (const line of lines) {
      const current = Number(line.dataset.line) === step.line;
      line.classList.toggle("is-current", current);
      if (current) line.setAttribute("aria-current", "step");
      else line.removeAttribute("aria-current");
    }
    scrub.value = String(index);
    counter.textContent = counterText(index, steps.length);
    toggle.innerHTML = playing ? ICONS.pause : ICONS.play;
    toggle.setAttribute("aria-label", playing ? text.pause : text.play);
  };

  const player = createPlayer(steps.length, update, options.intervalMs);
  const actions: Record<Action, () => void> = {
    first: () => player.seek(0),
    prev: player.prev,
    toggle: player.toggle,
    next: player.next,
    last: () => player.seek(last),
  };

  const listeners = new AbortController();
  const { signal } = listeners;
  el.addEventListener("click", (e) => {
    const action = (e.target as Element).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action) actions[action as Action]();
  }, { signal });
  el.addEventListener("keydown", (e) => {
    // Buttons and the slider already handle their own keys.
    if (e.target !== el || !(e.key in KEYS)) return;
    e.preventDefault();
    actions[KEYS[e.key]]();
  }, { signal });
  scrub.addEventListener("input", () => player.seek(Number(scrub.value)), { signal });

  // Pause when the figure scrolls out of view, so it does not run where nobody can see it.
  const observer = typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && player.state.playing) player.pause();
    });
  observer?.observe(el);

  update(player.state);
  return {
    ...player,
    get state() {
      return player.state;
    },
    destroy() {
      if (player.state.playing) player.pause();
      listeners.abort();
      observer?.disconnect();
    },
  };
}
