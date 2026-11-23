import { currentLanguage, t } from "./i18n.ts";
import type { TerritorySize } from "./lab/hexes.ts";

export interface TopBar {
  showDataset(name: string): void;
  showStatus(message: string): void;
  showTerritories(territories: readonly TerritorySize[]): void;
}

const compactNumber = new Intl.NumberFormat(currentLanguage, { notation: "compact", maximumFractionDigits: 1 });

export function createTopBar(container: HTMLElement): TopBar {
  const brand = document.createElement("p");
  brand.className = "brand";
  const title = document.createElement("strong");
  title.textContent = t("mapViewer.brand");
  const subtitle = document.createElement("span");
  brand.append(title, subtitle);
  const legend = document.createElement("ul");
  legend.className = "legend";
  legend.setAttribute("aria-label", t("mapViewer.legend.label"));
  legend.hidden = true;
  container.replaceChildren(brand, legend);

  return {
    showDataset(name) {
      subtitle.textContent = name;
      subtitle.classList.remove("status");
    },
    showStatus(message) {
      subtitle.textContent = message;
      subtitle.classList.add("status");
    },
    showTerritories(territories) {
      legend.replaceChildren(...territories.map(legendChip));
      legend.hidden = territories.length === 0;
    },
  };
}

function legendChip(territory: TerritorySize): HTMLLIElement {
  const number = territory.playerId + 1;
  const chip = document.createElement("li");
  chip.setAttribute("aria-label", t("mapViewer.legend.chip", { number, count: territory.hexes }));
  chip.style.setProperty("--player-color", territory.color);
  const name = document.createElement("span");
  name.textContent = t("mapViewer.legend.player", { number });
  const count = document.createElement("span");
  count.className = "count";
  count.textContent = compactNumber.format(territory.hexes);
  chip.append(name, count);
  return chip;
}
