// Script for the per-algorithm pages: mounts the page's figure and shows the code that drives it.
import "../src/styles/theme.css";
import { FIGURES } from "./figures";

const figure = FIGURES.find((f) => f.slug === document.body.dataset.figure);
if (!figure) throw new Error(`no figure called ${document.body.dataset.figure}`);
figure.mount(document.querySelector<HTMLElement>("#figure")!);
document.querySelector("#source")!.textContent = figure.source;
