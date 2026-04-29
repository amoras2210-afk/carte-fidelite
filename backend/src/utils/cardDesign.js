const DEFAULT_CARD_DESIGN = {
  tagline: "",
  theme: "gold",
  style: "modern",
  bgColor: "#1a1208",
  bg2Color: "#241a09",
  accentColor: "#c9a84c",
  accent2Color: "#e8c96a",
  textColor: "#fdf6e3",
  textMutedColor: "rgba(253,246,227,0.55)",
  stampColor: "rgba(201,168,76,0.15)",
  logoUrl: ""
};

function toCardDesign(row = {}) {
  return {
    tagline: row.card_tagline ?? DEFAULT_CARD_DESIGN.tagline,
    theme: row.card_theme ?? DEFAULT_CARD_DESIGN.theme,
    style: row.card_style ?? DEFAULT_CARD_DESIGN.style,
    bgColor: row.card_bg_color ?? DEFAULT_CARD_DESIGN.bgColor,
    bg2Color: row.card_bg2_color ?? DEFAULT_CARD_DESIGN.bg2Color,
    accentColor: row.card_accent_color ?? DEFAULT_CARD_DESIGN.accentColor,
    accent2Color: row.card_accent2_color ?? DEFAULT_CARD_DESIGN.accent2Color,
    textColor: row.card_text_color ?? DEFAULT_CARD_DESIGN.textColor,
    textMutedColor: row.card_text_muted_color ?? DEFAULT_CARD_DESIGN.textMutedColor,
    stampColor: row.card_stamp_color ?? DEFAULT_CARD_DESIGN.stampColor,
    logoUrl: row.card_logo_url ?? DEFAULT_CARD_DESIGN.logoUrl
  };
}

module.exports = {
  DEFAULT_CARD_DESIGN,
  toCardDesign
};
