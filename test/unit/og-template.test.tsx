// @vitest-environment node
//
// The OG template runs on the Node runtime (it reads the logo off disk and
// Satori rasterises the card), so this suite runs in node, not jsdom. It
// asserts the two layouts actually rasterise - the text-only card and the
// photo-panel card - because a Satori CSS mistake fails at render time, not
// at compile time, and the first place it would otherwise surface is a
// broken share card in production.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { brandOgImage, fetchOgPhoto, OG_SIZE } from "@/lib/og-template";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

async function rasterise(res: Response): Promise<Buffer> {
  return Buffer.from(await res.arrayBuffer());
}

describe("brandOgImage", () => {
  it("renders the text-only card as a PNG", async () => {
    const res = await brandOgImage({
      eyebrow: "The board · Tamale warehouse",
      title: "Grain on hand.",
      subtitle: "Maize, soya beans and groundnuts, ready to truck south.",
    });
    const png = await rasterise(res);
    expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    // Width is encoded big-endian at offset 16 of the IHDR chunk.
    expect(png.readUInt32BE(16)).toBe(OG_SIZE.width);
    expect(png.readUInt32BE(20)).toBe(OG_SIZE.height);
  });

  it("renders the photo-panel card as a PNG", async () => {
    const logo = await readFile(join(process.cwd(), "public", "logo.png"));
    const photo = `data:image/png;base64,${logo.toString("base64")}`;
    const res = await brandOgImage({
      eyebrow: "The board · LOT-01",
      title: "White Maize",
      subtitle: "Obatanpa · Grade 1 · From the DB Plus warehouse, Tamale.",
      cta: "Ask for a same-day quote →",
      photo,
    });
    const png = await rasterise(res);
    expect(png.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
    expect(png.readUInt32BE(16)).toBe(OG_SIZE.width);
    expect(png.readUInt32BE(20)).toBe(OG_SIZE.height);
  });
});

describe("fetchOgPhoto", () => {
  it("returns undefined for a missing url without throwing", async () => {
    await expect(fetchOgPhoto(null)).resolves.toBeUndefined();
    await expect(fetchOgPhoto(undefined)).resolves.toBeUndefined();
  });

  it("returns undefined when the fetch fails", async () => {
    await expect(
      fetchOgPhoto("http://127.0.0.1:9/unreachable.jpg"),
    ).resolves.toBeUndefined();
  });
});
