import { t } from "../i18n.ts";

const DATA_STATES = [
  { id: "demo", dataset: "small-town" },
  { id: "worst", dataset: "worst-case" },
  { id: "missing", dataset: "zlin-district-with-surrounding-municipalities-2026-11-23" },
  { id: "real", dataset: "zlin-district" },
] as const;

export function mountDataToggle(currentDataset: string): void {
  const toggle = document.createElement("nav");
  toggle.className = "dev-data-toggle";
  toggle.setAttribute("aria-label", t("devData.label"));
  for (const state of DATA_STATES) {
    const link = document.createElement("a");
    const url = new URL(window.location.href);
    url.searchParams.set("dataset", state.dataset);
    url.hash = "";
    link.href = url.toString();
    link.textContent = t(`devData.${state.id}`);
    if (state.dataset === currentDataset) link.setAttribute("aria-current", "page");
    toggle.append(link);
  }
  document.body.append(toggle);
}
