import type { DatasetManifest, DataLayerName } from "./dataset.ts";
import { t } from "./i18n.ts";

export interface InspectedFeature {
  layer: DataLayerName;
  kind: string;
  name: string | undefined;
}

export interface Panel {
  showStatus(message: string): void;
  showLayers(manifest: DatasetManifest, onToggle: (layer: DataLayerName, visible: boolean) => void): void;
  showFeature(feature: InspectedFeature | undefined): void;
}

export function createPanel(container: HTMLElement): Panel {
  const title = element("h1", t("mapViewer.panelTitle"));
  const status = element("p", "");
  status.className = "status";
  const layerList = element("fieldset", "");
  layerList.hidden = true;
  const hint = element("p", t("mapViewer.inspectHint"));
  hint.className = "hint";
  hint.hidden = true;
  const inspected = element("dl", "");
  inspected.className = "inspected";
  container.replaceChildren(title, status, layerList, hint, inspected);

  return {
    showStatus(message) {
      status.textContent = message;
    },
    showLayers(manifest, onToggle) {
      status.textContent = t("mapViewer.dataset", { name: manifest.name });
      layerList.replaceChildren(
        element("legend", t("mapViewer.layersLegend")),
        ...manifest.layers.map((layer) => layerToggle(layer.name, layer.featureCount, onToggle)),
      );
      layerList.hidden = false;
      hint.hidden = false;
    },
    showFeature(feature) {
      if (!feature) {
        inspected.replaceChildren();
        return;
      }
      inspected.replaceChildren(
        element("dt", t("mapViewer.inspect.layer")),
        element("dd", t(`mapViewer.layer.${feature.layer}`)),
        element("dt", t("mapViewer.inspect.kind")),
        element("dd", feature.kind),
        element("dt", t("mapViewer.inspect.name")),
        element("dd", feature.name ?? t("mapViewer.inspect.unnamed")),
      );
    },
  };
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
