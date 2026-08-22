/**
 * The console's initials avatar: a deterministic two-letter monogram on a
 * colour picked from the name itself, used wherever a register lists people or
 * counterparties (farmers, suppliers, grant and repayment records).
 *
 * Deterministic on purpose. The same farmer wears the same colour on every
 * screen and across reloads, so the swatch becomes a recognisable handle in a
 * long list rather than decoration that shuffles under the reader.
 */

const AVATAR_PALETTE = [
  { bg: "#E7EEE9", fg: "#1E3D2B" },
  { bg: "#E8EFF4", fg: "#33587A" },
  { bg: "#F7EED8", fg: "#7A5407" },
  { bg: "#ECEFF3", fg: "#4c5765" },
  { bg: "#F0E9E0", fg: "#6B4A2C" },
];

export function avatarOf(name: string): { init: string; bg: string; fg: string } {
  const s = name || "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  const words = s.replace(/[^A-Za-z ]/g, "").trim().split(/\s+/);
  const init = ((words[0] || "?")[0] + ((words[1] || "")[0] || "")).toUpperCase();
  return { init, ...AVATAR_PALETTE[h % AVATAR_PALETTE.length] };
}
