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
  speed: string;
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
  speed: "Speed",
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

type Action = "first" | "prev" | "toggle" | "next" | "last" | "speed";

const KEYS: Record<string, Action> = {
  Home: "first",
  ArrowLeft: "prev",
  " ": "toggle",
  ArrowRight: "next",
  End: "last",
};

// Action, icon, label, key for aria-keyshortcuts, key as shown in the tooltip.
const BUTTONS: [Action, keyof typeof ICONS, keyof Labels, string, string][] = [
  ["first", "first", "first", "Home", "Home"],
  ["prev", "prev", "prev", "ArrowLeft", "←"],
  ["toggle", "play", "play", "Space", "Space"],
  ["next", "next", "next", "ArrowRight", "→"],
  ["last", "last", "last", "End", "End"],
];

const SPEEDS = [0.5, 1, 2, 4];
const speedText = (speed: number) => `${speed}×`;
const withKey = (label: string, key: string) => `${label} (${key})`;

// Markup pieces shared by render() and toHTML(), so the static and live figure are the same.

/** A value as the reader would write it. Never throws: watched values can be cyclic or not JSON at all. */
const show = (v: unknown): string => {
  if (typeof v === "number") return String(v); // JSON would print NaN and Infinity as null
  if (typeof v === "bigint") return `${v}n`;
  try {
    const json = JSON.stringify(v, (_, x) =>
      typeof x === "bigint" ? `${x}n` : x instanceof Map ? Object.fromEntries(x) : x instanceof Set ? [...x] : x);
    return json ?? String(v);
  } catch {
    return "[circular]";
  }
};

const varsItems = (vars: Vars | undefined) =>
  Object.entries(vars ?? {})
    .filter(([, v]) => v !== undefined)
    .map(([name, v]) => `<div><dt>${escape(name)}</dt><dd>${escape(show(v))}</dd></div>`)
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
  if (steps.length === 0) throw new RangeError("the trace has no steps");
  if (code !== undefined) {
    const count = code.replace(/\n$/, "").split("\n").length;
    const bad = steps.find((step) => step.line !== undefined && step.line > count);
    if (bad) throw new RangeError(`a step is tagged with line ${bad.line}, but the code has ${count} lines`);
  }
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
    ([action, icon, label, key, keyText]) =>
      `<button type="button" data-action="${action}" aria-label="${escape(text[label])}" aria-keyshortcuts="${key}"`
      + ` title="${escape(withKey(text[label], keyText))}">${ICONS[icon]}</button>`,
  ).join("");
  return `<div class="stepthru-figure">${markup[0]}</div>`
    + (hasVars ? `<dl class="stepthru-vars" aria-label="${escape(text.variables)}">${varsItems(first.vars)}</dl>` : "")
    + `<p class="stepthru-caption" aria-live="polite">${escape(first.caption)}</p>`
    + `<div class="stepthru-controls"${controlsHidden ? " hidden" : ""}>${buttons}`
    + `<input class="stepthru-scrub" type="range" min="0" max="${last}" value="0" aria-label="${escape(text.step)}">`
    + `<span class="stepthru-counter">${counterText(0, steps.length)}</span>`
    + `<button type="button" class="stepthru-speed" data-action="speed" aria-label="${escape(`${text.speed} ${speedText(1)}`)}"`
    + ` title="${escape(text.speed)}">${speedText(1)}</button></div>`
    + (code ? `<pre class="stepthru-code" aria-label="${escape(text.code)}"><code>${codeLines(code)}</code></pre>` : "");
}

/**
 * The figure's first step as an HTML string, for server or build-time rendering. Put it inside an
 * element with class `stepthru`; the controls stay hidden until `render` runs on that element.
 */
export function toHTML<S>(trace: Trace<S>, options: RenderOptions<S> = {}): string {
  return figureHTML(prepare(trace, options), true);
}

// The figure mounted on each element, so rendering again into it first tears down the old one.
const mounted = new WeakMap<HTMLElement, RenderedFigure>();

/** Keeps `line` in view by scrolling `box` only, never the page. */
function scrollWithin(box: HTMLElement, line: HTMLElement) {
  const top = line.offsetTop;
  const bottom = top + line.offsetHeight;
  if (top < box.scrollTop) box.scrollTop = top;
  else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
}

/** Mounts a playable figure for `trace` into `el` and returns its player. Replaces what `el` holds. */
export function render<S>(trace: Trace<S>, el: HTMLElement, options: RenderOptions<S> = {}): RenderedFigure {
  const prepared = prepare(trace, options);
  mounted.get(el)?.destroy();
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
  const speedButton = part<HTMLButtonElement>(".stepthru-speed")!;
  const vars = part<HTMLElement>(".stepthru-vars");
  const codeBox = part<HTMLElement>(".stepthru-code");
  const lines = [...el.querySelectorAll<HTMLElement>(".stepthru-line")];

  const update = ({ index, playing, speed }: PlayerState) => {
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
      if (current) {
        line.setAttribute("aria-current", "step");
        if (codeBox) scrollWithin(codeBox, line);
      } else line.removeAttribute("aria-current");
    }
    scrub.value = String(index);
    counter.textContent = counterText(index, steps.length);
    toggle.innerHTML = playing ? ICONS.pause : ICONS.play;
    toggle.setAttribute("aria-label", playing ? text.pause : text.play);
    toggle.title = withKey(playing ? text.pause : text.play, "Space");
    speedButton.textContent = speedText(speed);
    speedButton.setAttribute("aria-label", `${text.speed} ${speedText(speed)}`);
  };

  const player = createPlayer(steps.length, update, options.intervalMs);
  const actions: Record<Action, () => void> = {
    first: () => player.seek(0),
    prev: player.prev,
    toggle: player.toggle,
    next: player.next,
    last: () => player.seek(last),
    speed: () => player.setSpeed(SPEEDS.find((s) => s > player.state.speed) ?? SPEEDS[0]),
  };

  const listeners = new AbortController();
  const { signal } = listeners;
  el.addEventListener("click", (e) => {
    const action = (e.target as Element).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action) actions[action as Action]();
  }, { signal });
  el.addEventListener("keydown", (e) => {
    // The slider handles its own arrows, Home and End; a focused button handles its own space.
    const onButton = e.target instanceof HTMLButtonElement && e.key !== " ";
    if ((e.target !== el && !onButton) || !(e.key in KEYS)) return;
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
  const figureApi: RenderedFigure = {
    ...player,
    get state() {
      return player.state;
    },
    destroy() {
      if (player.state.playing) player.pause();
      listeners.abort();
      observer?.disconnect();
      if (mounted.get(el) === figureApi) mounted.delete(el);
    },
  };
  mounted.set(el, figureApi);
  return figureApi;
}
