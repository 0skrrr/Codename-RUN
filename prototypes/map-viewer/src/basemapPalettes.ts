export const BASE_MAP_THEMES = ["standard", "paper", "night"] as const;

export type BaseMapTheme = (typeof BASE_MAP_THEMES)[number];

export interface BaseMapPalette {
  background: string;
  forest: string;
  grass: string;
  farmland: string;
  residential: string;
  industrial: string;
  cemetery: string;
  park: string;
  landcoverOther: string;
  water: string;
  railway: string;
  roadMajor: string;
  roadSecondary: string;
  roadMinor: string;
  roadCasing: string;
  path: string;
  track: string;
  building: string;
  buildingOutline: string;
  boundaryRegion: string;
  boundaryMunicipality: string;
}

export const BASE_MAP_PALETTES: Readonly<Record<BaseMapTheme, BaseMapPalette>> = {
  standard: {
    background: "#f2efe9",
    forest: "#add19e",
    grass: "#cdebb0",
    farmland: "#eef0d5",
    residential: "#e0dfdf",
    industrial: "#ebdbe8",
    cemetery: "#aacbaf",
    park: "#c8facc",
    landcoverOther: "#e6e6d8",
    water: "#aad3df",
    railway: "#707070",
    roadMajor: "#f9b29c",
    roadSecondary: "#f7fabf",
    roadMinor: "#ffffff",
    roadCasing: "#bbbbbb",
    path: "#fa8072",
    track: "#996600",
    building: "#d9d0c9",
    buildingOutline: "#c4b6ab",
    boundaryRegion: "#8d618b",
    boundaryMunicipality: "#b19bb0",
  },
  paper: {
    background: "#f6f5f1",
    forest: "#dde7d6",
    grass: "#e5eddc",
    farmland: "#f1f1e8",
    residential: "#eeede9",
    industrial: "#efebee",
    cemetery: "#dce5da",
    park: "#e0ecdb",
    landcoverOther: "#efeee9",
    water: "#cbdde6",
    railway: "#b8b6b0",
    roadMajor: "#ffffff",
    roadSecondary: "#ffffff",
    roadMinor: "#ffffff",
    roadCasing: "#dcd8d0",
    path: "#d3cdc3",
    track: "#d8cfbd",
    building: "#e4e1db",
    buildingOutline: "#d5d0c8",
    boundaryRegion: "#bbb4c6",
    boundaryMunicipality: "#d6d1dc",
  },
  night: {
    background: "#181b21",
    forest: "#1d2822",
    grass: "#202923",
    farmland: "#1e2126",
    residential: "#22252b",
    industrial: "#26232c",
    cemetery: "#1d2722",
    park: "#1f2d25",
    landcoverOther: "#1f2227",
    water: "#172a38",
    railway: "#474c55",
    roadMajor: "#4a515e",
    roadSecondary: "#3b414c",
    roadMinor: "#323843",
    roadCasing: "#121418",
    path: "#383d47",
    track: "#3b3832",
    building: "#2a2e36",
    buildingOutline: "#333842",
    boundaryRegion: "#585170",
    boundaryMunicipality: "#3c384a",
  },
};
