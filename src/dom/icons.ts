// 16×16 control icons. They draw in currentColor, so they follow the button's text color.
const icon = (path: string) =>
  `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="${path}"/></svg>`;

export const ICONS = {
  first: icon("M3 3h2v10H3zM13 3v10L6 8z"),
  prev: icon("M12 3v10L4 8z"),
  play: icon("M4 3v10l9-5z"),
  pause: icon("M4 3h3v10H4zM9 3h3v10H9z"),
  next: icon("M4 3v10l8-5z"),
  last: icon("M11 3h2v10h-2zM3 3v10l7-5z"),
};
