const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const ICON_SIZE = "18";

const PATHS = {
  sliders: ["M4 7h10", "M18 7h2", "M4 17h2", "M10 17h10", "M16 4v6", "M8 14v6"],
  close: ["M6 6l12 12", "M18 6L6 18"],
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", ICON_SIZE);
  svg.setAttribute("height", ICON_SIZE);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  for (const d of PATHS[name]) {
    const path = document.createElementNS(SVG_NAMESPACE, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
