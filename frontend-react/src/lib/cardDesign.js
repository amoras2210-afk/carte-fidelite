export const CARD_THEME_PRESETS = {
  gold: {
    bgColor: "#1a1208",
    bg2Color: "#241a09",
    accentColor: "#c9a84c",
    accent2Color: "#e8c96a",
    textColor: "#fdf6e3",
    textMutedColor: "rgba(253,246,227,0.55)",
    stampColor: "rgba(201,168,76,0.15)"
  },
  night: {
    bgColor: "#0d1117",
    bg2Color: "#161b22",
    accentColor: "#58a6ff",
    accent2Color: "#79b8ff",
    textColor: "#e6edf3",
    textMutedColor: "rgba(230,237,243,0.5)",
    stampColor: "rgba(88,166,255,0.12)"
  },
  forest: {
    bgColor: "#1a2e1a",
    bg2Color: "#223322",
    accentColor: "#6dbf67",
    accent2Color: "#9dda98",
    textColor: "#eaf5e8",
    textMutedColor: "rgba(234,245,232,0.5)",
    stampColor: "rgba(109,191,103,0.12)"
  },
  rose: {
    bgColor: "#1f0a12",
    bg2Color: "#2a0f1a",
    accentColor: "#e879a0",
    accent2Color: "#f0a0c0",
    textColor: "#fce8ef",
    textMutedColor: "rgba(252,232,239,0.5)",
    stampColor: "rgba(232,121,160,0.12)"
  },
  slate: {
    bgColor: "#f8f7f4",
    bg2Color: "#eeecea",
    accentColor: "#3d3d3a",
    accent2Color: "#5a5856",
    textColor: "#1a1a18",
    textMutedColor: "rgba(26,26,24,0.5)",
    stampColor: "rgba(61,61,58,0.1)"
  },
  ocean: {
    bgColor: "#0a1628",
    bg2Color: "#0f2040",
    accentColor: "#38bdf8",
    accent2Color: "#7dd3fc",
    textColor: "#e0f2fe",
    textMutedColor: "rgba(224,242,254,0.5)",
    stampColor: "rgba(56,189,248,0.12)"
  }
};

export const DEFAULT_CARD_DESIGN = {
  tagline: "",
  theme: "gold",
  style: "modern",
  bgColor: CARD_THEME_PRESETS.gold.bgColor,
  bg2Color: CARD_THEME_PRESETS.gold.bg2Color,
  accentColor: CARD_THEME_PRESETS.gold.accentColor,
  accent2Color: CARD_THEME_PRESETS.gold.accent2Color,
  textColor: CARD_THEME_PRESETS.gold.textColor,
  textMutedColor: CARD_THEME_PRESETS.gold.textMutedColor,
  stampColor: CARD_THEME_PRESETS.gold.stampColor,
  logoUrl: ""
};

export function resolveCardDesign(input = {}) {
  return {
    ...DEFAULT_CARD_DESIGN,
    ...input
  };
}

export function applyThemePreset(theme) {
  if (theme === "custom") return null;
  return CARD_THEME_PRESETS[theme] || CARD_THEME_PRESETS.gold;
}
