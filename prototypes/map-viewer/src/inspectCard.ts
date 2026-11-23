import type { DataLayerName } from "./dataset.ts";
import { kindLabel } from "./featureKind.ts";
import { t } from "./i18n.ts";
import { icon } from "./icons.ts";

export interface InspectedFeature {
  layer: DataLayerName;
  kind: string;
  name: string | undefined;
}

export interface InspectCard {
  show(feature: InspectedFeature | undefined): void;
}

export function createInspectCard(container: HTMLElement): InspectCard {
  container.setAttribute("aria-label", t("mapViewer.inspect.title"));
  container.setAttribute("aria-live", "polite");
  container.hidden = true;
  const name = document.createElement("h2");
  name.dir = "auto";
  const details = document.createElement("p");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-button inspect-close";
  close.setAttribute("aria-label", t("mapViewer.inspect.close"));
  close.append(icon("close"));
  container.replaceChildren(name, details, close);

  const hide = (): void => {
    container.hidden = true;
  };
  close.addEventListener("click", hide);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });

  return {
    show(feature) {
      if (!feature) return hide();
      name.textContent = feature.name ?? t("mapViewer.inspect.unnamed");
      name.classList.toggle("unnamed", feature.name === undefined);
      details.textContent = `${kindText(feature)} · ${t(`mapViewer.layer.${feature.layer}`)}`;
      container.hidden = false;
    },
  };
}

function kindText(feature: InspectedFeature): string {
  const label = kindLabel(feature.layer, feature.kind);
  return label.kind === "message" ? t(label.key, label.values) : label.text;
}
