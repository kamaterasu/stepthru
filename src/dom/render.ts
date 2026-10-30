import { createPlayer, type Player, type PlayerState } from "../core/player";
import type { Trace, View } from "../core/trace";

export interface RenderOptions<S> {
  /** Overrides the trace's own view. Required when the trace has none. */
  view?: View<S>;
  intervalMs?: number;
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
  ["first", "⏮", "First step"],
  ["prev", "◀", "Previous step"],
  ["toggle", "▶", "Play"],
  ["next", "▶|", "Next step"],
  ["last", "⏭", "Last step"],
];

function template(last: number): string {
  const buttons = BUTTONS.map(
    ([action, icon, label]) =>
      `<button type="button" data-action="${action}" aria-label="${label}">${icon}</button>`,
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
): Player {
  if (!view) throw new TypeError("render needs a view: pass options.view or use a structure tracer");
  const { steps } = trace;
  const last = steps.length - 1;
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
    figure.innerHTML = view(steps[index].state);
    caption.textContent = steps[index].caption;
    scrub.value = String(index);
    counter.textContent = `${index + 1} / ${steps.length}`;
    toggle.textContent = playing ? "⏸" : "▶";
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

  el.addEventListener("click", (e) => {
    const action = (e.target as Element).closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action) actions[action as Action]();
  });
  el.addEventListener("keydown", (e) => {
    // Buttons and the slider already handle their own keys.
    if (e.target !== el || !(e.key in KEYS)) return;
    e.preventDefault();
    actions[KEYS[e.key]]();
  });
  scrub.addEventListener("input", () => player.seek(Number(scrub.value)));

  update(player.state);
  return player;
}
