import type { DatasetManifest, DataLayerName } from "./dataset.ts";
import { t } from "./i18n.ts";
import { icon } from "./icons.ts";

export interface Panel {
  showLayers(manifest: DatasetManifest, onToggle: (layer: DataLayerName, visible: boolean) => void): void;
  setOpen(open: boolean): void;
  toggle(): void;
}

const OPEN_STATE_STORAGE_KEY = "codename-run.map-viewer.settings-open";

export function createPanel(container: HTMLElement, toggleButton: HTMLButtonElement): Panel {
  const title = element("h1", t("mapViewer.settings.title"));
  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-button";
  close.setAttribute("aria-label", t("mapViewer.settings.close"));
  close.append(icon("close"));
  const header = document.createElement("div");
  header.className = "sheet-header";
  header.append(title, close);
  const layerList = element("fieldset", "");
  layerList.hidden = true;
  const hint = element("p", t("mapViewer.inspectHint"));
  hint.className = "hint";
  hint.hidden = true;
  container.replaceChildren(header, layerList, hint);

  toggleButton.setAttribute("aria-label", t("mapViewer.settings.open"));
  toggleButton.setAttribute("aria-controls", container.id);
  toggleButton.append(icon("sliders"));

  const setOpen = (open: boolean): void => {
    container.dataset.open = String(open);
    container.inert = !open;
    toggleButton.setAttribute("aria-expanded", String(open));
    rememberOpenState(open);
  };
  const toggle = (): void => setOpen(container.dataset.open !== "true");
  toggleButton.addEventListener("click", toggle);
  close.addEventListener("click", () => {
    setOpen(false);
    toggleButton.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && container.dataset.open === "true") setOpen(false);
  });
  setOpen(readOpenState());

  return {
    showLayers(manifest, onToggle) {
      layerList.replaceChildren(
        element("legend", t("mapViewer.layersLegend")),
        ...manifest.layers.map((layer) => layerToggle(layer.name, layer.featureCount, onToggle)),
      );
      layerList.hidden = false;
      hint.hidden = false;
    },
    setOpen,
    toggle,
  };
}

function readOpenState(): boolean {
  try {
    return window.localStorage.getItem(OPEN_STATE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberOpenState(open: boolean): void {
  try {
    window.localStorage.setItem(OPEN_STATE_STORAGE_KEY, String(open));
  } catch {
    return;
  }
}

function layerToggle(
  layer: DataLayerName,
  featureCount: number,
  onToggle: (layer: DataLayerName, visible: boolean) => void,
): HTMLLabelElement {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = true;
  checkbox.addEventListener("change", () => onToggle(layer, checkbox.checked));
  const label = document.createElement("label");
  const text = t("mapViewer.layerWithCount", { label: t(`mapViewer.layer.${layer}`), count: featureCount });
  label.append(checkbox, document.createTextNode(text));
  return label;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
