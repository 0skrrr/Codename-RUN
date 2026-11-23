import { t } from "../i18n.ts";
import type { LabInfo } from "./labController.ts";
import { isValidPresetName, toPresetName } from "./presetFormat.ts";
import {
  deleteSharedPreset,
  exportSettingsFile,
  importSettingsFile,
  listSharedPresets,
  loadSharedPreset,
  saveSharedPreset,
} from "./presetStorage.ts";
import { CONTROL_GROUPS, type Control, type SettingKey, type Settings } from "./settings.ts";

export interface LabPanelHandlers {
  onChange(key: SettingKey, value: Settings[SettingKey]): void;
  onReplace(settings: Settings): void;
  onReset(): void;
  onRegenerateHere(): void;
}

export interface LabPanel {
  render(settings: Settings): void;
  showInfo(info: LabInfo): void;
}

const OPEN_GROUPS: ReadonlySet<string> = new Set(["view", "hexGrid", "territory"]);
const DEFAULT_EXPORT_NAME = "map-lab-settings";
const DECIMALS_FOR_STEP_BELOW_ONE = 2;

export function createLabPanel(container: HTMLElement, handlers: LabPanelHandlers): LabPanel {
  const root = document.createElement("div");
  root.className = "lab";
  const info = paragraph("", "lab-info");
  const groups = document.createElement("div");
  const presets = presetSection(() => current, handlers);
  root.append(heading(t("lab.title")), info, groups, presets.element);
  container.append(root);

  let current: Settings | undefined;
  const openState = new Map<string, boolean>();

  return {
    render(settings) {
      current = settings;
      for (const details of groups.querySelectorAll("details")) openState.set(details.dataset.group ?? "", details.open);
      groups.replaceChildren(
        ...CONTROL_GROUPS.map((group) => controlGroup(group.id, group.controls, settings, handlers, openState)),
        actionsRow(handlers),
      );
    },
    showInfo(labInfo) {
      const lines = [
        t("lab.info.scenario", {
          players: labInfo.players,
          runs: labInfo.runs,
          tradeRoutes: labInfo.tradeRoutes,
          hexes: labInfo.territoryHexes,
        }),
        t("lab.info.hexSize", {
          edge: Math.round(labInfo.hexEdgeMeters * 10) / 10,
          area: Math.round(labInfo.hexAreaSquareMeters),
        }),
      ];
      if (labInfo.gridHidden) lines.push(t("lab.info.gridHidden"));
      if (labInfo.roadsMissing) lines.push(t("lab.info.roadsMissing"));
      info.replaceChildren(...lines.map((line) => paragraph(line, "")));
    },
  };
}

function controlGroup(
  id: string,
  controls: readonly Control[],
  settings: Settings,
  handlers: LabPanelHandlers,
  openState: ReadonlyMap<string, boolean>,
): HTMLDetailsElement {
  const details = document.createElement("details");
  details.dataset.group = id;
  details.open = openState.get(id) ?? OPEN_GROUPS.has(id);
  const summary = document.createElement("summary");
  summary.textContent = t(`lab.group.${id}`);
  details.append(summary, ...controls.map((control) => controlRow(control, settings, handlers)));
  return details;
}

function controlRow(control: Control, settings: Settings, handlers: LabPanelHandlers): HTMLElement {
  const label = document.createElement("label");
  label.className = `lab-control lab-control-${control.kind}`;
  const name = document.createElement("span");
  name.textContent = t(`lab.control.${control.key}`);
  label.append(name, controlInput(control, settings[control.key], handlers));
  return label;
}

function controlInput(control: Control, value: Settings[SettingKey], handlers: LabPanelHandlers): HTMLElement {
  const change = (next: Settings[SettingKey]): void => handlers.onChange(control.key, next);

  if (control.kind === "toggle") {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = value === true;
    input.addEventListener("change", () => change(input.checked));
    return input;
  }

  if (control.kind === "color") {
    const input = document.createElement("input");
    input.type = "color";
    input.value = String(value);
    input.addEventListener("input", () => change(input.value));
    return input;
  }

  if (control.kind === "choice") {
    const select = document.createElement("select");
    for (const option of control.options) {
      const element = document.createElement("option");
      element.value = option;
      element.textContent = t(`lab.option.${option}`);
      select.append(element);
    }
    select.value = String(value);
    select.addEventListener("change", () => change(select.value));
    return select;
  }

  const wrapper = document.createElement("span");
  wrapper.className = "lab-range";
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(control.min);
  input.max = String(control.max);
  input.step = String(control.step);
  input.value = String(value);
  const output = document.createElement("output");
  const decimals = control.step < 1 ? DECIMALS_FOR_STEP_BELOW_ONE : 0;
  const show = (): void => {
    output.textContent = `${Number(input.value).toFixed(decimals)}${control.unit ?? ""}`;
  };
  show();
  const expensive = control.key.startsWith("scenario.");
  input.addEventListener("input", () => {
    show();
    if (!expensive) change(Number(input.value));
  });
  if (expensive) input.addEventListener("change", () => change(Number(input.value)));
  wrapper.append(input, output);
  return wrapper;
}

function actionsRow(handlers: LabPanelHandlers): HTMLElement {
  const row = document.createElement("div");
  row.className = "lab-actions";
  row.append(button(t("lab.regenerateHere"), handlers.onRegenerateHere), button(t("lab.reset"), handlers.onReset));
  return row;
}

function presetSection(currentSettings: () => Settings | undefined, handlers: LabPanelHandlers): { element: HTMLElement } {
  const details = document.createElement("details");
  details.open = true;
  const summary = document.createElement("summary");
  summary.textContent = t("lab.group.presets");
  const message = paragraph("", "lab-message");
  const shared = document.createElement("div");
  shared.className = "lab-presets";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.hidden = true;

  const say = (text: string): void => {
    message.textContent = text;
  };

  const refreshShared = async (selected?: string): Promise<void> => {
    const names = await listSharedPresets();
    if (!names) {
      shared.replaceChildren(paragraph(t("lab.presets.devOnly"), "hint"));
      return;
    }
    const select = document.createElement("select");
    select.append(...names.map((name) => new Option(name, name)));
    if (selected) select.value = selected;
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = t("lab.presets.namePlaceholder");
    nameInput.setAttribute("aria-label", t("lab.presets.namePlaceholder"));

    const load = button(t("lab.presets.load"), async () => {
      const settings = select.value ? await loadSharedPreset(select.value) : undefined;
      if (!settings) return say(t("lab.presets.loadFailed"));
      handlers.onReplace(settings);
      say(t("lab.presets.loaded", { name: select.value }));
    });
    const remove = button(t("lab.presets.delete"), async () => {
      if (!select.value || !window.confirm(t("lab.presets.confirmDelete", { name: select.value }))) return;
      const name = select.value;
      say((await deleteSharedPreset(name)) ? t("lab.presets.deleted", { name }) : t("lab.presets.saveFailed"));
      await refreshShared();
    });
    const save = button(t("lab.presets.save"), async () => {
      const name = toPresetName(nameInput.value || select.value);
      const settings = currentSettings();
      if (!settings || !isValidPresetName(name)) return say(t("lab.presets.invalidName"));
      const saved = await saveSharedPreset(name, settings);
      say(saved ? t("lab.presets.saved", { name }) : t("lab.presets.saveFailed"));
      await refreshShared(name);
    });
    load.disabled = remove.disabled = names.length === 0;

    const loadRow = document.createElement("div");
    loadRow.className = "lab-actions";
    loadRow.append(select, load, remove);
    const saveRow = document.createElement("div");
    saveRow.className = "lab-actions";
    saveRow.append(nameInput, save);
    shared.replaceChildren(paragraph(t("lab.presets.sharedHint"), "hint"), loadRow, saveRow);
  };

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    const settings = await importSettingsFile(file);
    if (!settings) return say(t("lab.presets.importFailed"));
    handlers.onReplace(settings);
    say(t("lab.presets.imported", { name: file.name }));
  });

  const fileRow = document.createElement("div");
  fileRow.className = "lab-actions";
  fileRow.append(
    button(t("lab.presets.export"), () => {
      const settings = currentSettings();
      if (settings) exportSettingsFile(settings, DEFAULT_EXPORT_NAME);
    }),
    button(t("lab.presets.import"), () => fileInput.click()),
    fileInput,
  );

  details.append(summary, paragraph(t("lab.presets.autoSaved"), "hint"), shared, fileRow, message);
  void refreshShared();
  return { element: details };
}

function button(text: string, onClick: () => void | Promise<void>): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = text;
  element.addEventListener("click", () => void onClick());
  return element;
}

function heading(text: string): HTMLHeadingElement {
  const element = document.createElement("h2");
  element.textContent = text;
  return element;
}

function paragraph(text: string, className: string): HTMLParagraphElement {
  const element = document.createElement("p");
  element.textContent = text;
  if (className) element.className = className;
  return element;
}
