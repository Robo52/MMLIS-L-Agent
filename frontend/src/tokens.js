export const FONTS = {
  body: "'Inter', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const BLUE = "#2563EB";
export const BLUE_DARK = "#1D4ED8";
export const BLUE_LIGHT = "#EFF4FF";
export const BORDER = "#D6E0F5";
export const TEXT = "#1F2937";
export const TEXT_MUTED = "#6B7280";
export const RED = "#DC2626";
export const RED_LIGHT = "#FEF2F2";
export const GREEN = "#16A34A";
export const GREEN_LIGHT = "#F0FDF4";
export const AMBER = "#D97706";
export const AMBER_LIGHT = "#FFFBEB";
export const PURPLE = "#7C3AED";

export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "#FFFFFF",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: "9px 11px",
  color: TEXT,
  fontFamily: FONTS.body,
  fontSize: 14,
  outline: "none",
};

export function uid(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}
