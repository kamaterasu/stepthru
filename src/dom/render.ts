import { createPlayer, type Player, type PlayerState } from "../core/player.js";
import type { Trace, View } from "../core/trace.js";
import { fitTo, largest, svgSize } from "./fit.js";
import { ICONS } from "./icons.js";

export interface RenderOptions<S> {
  /** Overrides the trace's own view. Required when the trace has none. */
  view?: View<S>;
  intervalMs?: number;
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

const BUTTONS: [Action, string, string][] = [
  ["first", ICONS.first, "First step"],
  ["prev", ICONS.prev, "Previous step"],
  ["toggle", ICONS.play, "Play"],
  ["next", ICONS.next, "Next step"],
  ["last", ICONS.last, "Last step"],
];

function template(last: number): string {
  const buttons = BUTTONS.map(
    ([action, icon, label]) => `<button type="button" data-action="${action}" aria-label="${label}">${icon}</button>`,
  ).join("");
  return `<div class="stepthru-figure"></div>
<p class="stepthru-caption" aria-live="polite"></p>
<div class="stepthru-controls">${buttons}<input class="stepthru-scrub" type="range" min="0" max="${last}" aria-label="Step"><span class="stepthru-counter"></span></div>`;
}

/** Mounts a playable figure for `trace` into `el` and returns its player. */
export function render<S>(
  trace: Trace<S>,
  el: HTMLElement,
  { view = trace.view, intervalMs }: RenderOptions<S> = {},
): RenderedFigure {
  if (!view) throw new TypeError("render needs a view: pass options.view or use a structure tracer");
  const { steps } = trace;
  const last = steps.length - 1;
  // Draw every step once up front, so the figure can keep the size of its largest step.
  const markup = steps.map((step) => view(step.state));
  const sizes = markup.map(svgSize);
  const box = largest(sizes);

  el.classList.add("stepthru");
  el.tabIndex = 0;
  el.innerHTML = template(last);

  const part = <T extends Element>(selector: string) => el.querySelector<T>(selector)!;
  const figure = part<HTMLElement>(".stepthru-figure");
  const caption = part<HTMLElement>(".stepthru-caption");
  const scrub = part<HTMLInputElement>(".stepthru-scrub");
  const counter = part<HTMLElement>(".stepthru-counter");
  const toggle = part<HTMLButtonElement>('[data-action="toggle"]');

  const update = ({ index, playing }: PlayerState) => {
    figure.innerHTML = markup[index];
    if (box) fitTo(figure.querySelector("svg")!, sizes[index]!, box);
    // Announce only steps the reader moves to; during playback a caption every interval is noise.
    caption.setAttribute("aria-live", playing ? "off" : "polite");
    caption.textContent = steps[index].caption;
    scrub.value = String(index);
    counter.textContent = `${index + 1} / ${steps.length}`;
    toggle.innerHTML = playing ? ICONS.pause : ICONS.play;
    toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
  };

  const player = createPlayer(steps.length, update, intervalMs);
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
