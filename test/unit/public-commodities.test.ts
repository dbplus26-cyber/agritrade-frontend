// Honest emptiness on the public availability feed: an empty publish list
// (or a down API) yields empty board lines and lot files - the pages render
// their designed empty states instead of stand-in stock.
import { describe, expect, it } from "vitest";
import {
  toBoardLines,
  toLots,
  type PublicCommodity,
} from "@/lib/public-commodities";

const maize: PublicCommodity = {
  id: "c1",
  name: "Maize",
  description: null,
  photo: "https://res.cloudinary.com/demo/maize.jpg",
  variety: "White",
  qualityGrade: "Grade 1",
  available: true,
};

describe("toBoardLines", () => {
  it("returns [] for an empty publish list and for a down API", () => {
    expect(toBoardLines([])).toEqual([]);
    expect(toBoardLines(null)).toEqual([]);
  });

  it("maps live commodities, describing each by its OWN variety and grade", () => {
    const lines = toBoardLines([maize]);
    expect(lines).toHaveLength(1);
    expect(lines[0].name).toBe("Maize");
    expect(lines[0].available).toBe(true);
    expect(lines[0].meta).toBe("White · Grade 1");
  });

  it("falls back to a call-to-action when the record carries neither", () => {
    const bare = { ...maize, qualityGrade: null, variety: null };
    expect(toBoardLines([bare])[0].meta).toBe("Call for today's position");
  });
});

describe("toLots", () => {
  it("returns [] for an empty publish list and for a down API", () => {
    expect(toLots([])).toEqual([]);
    expect(toLots(null)).toEqual([]);
  });

  it("carries the record's own fields and the live stock flag", () => {
    const lots = toLots([{ ...maize, available: false }]);
    expect(lots).toHaveLength(1);
    expect(lots[0].name).toBe("Maize");
    expect(lots[0].inStock).toBe(false);
    expect(lots[0].photo).toBe(maize.photo);
    expect(lots[0].variety).toBe("White");
    expect(lots[0].qualityGrade).toBe("Grade 1");
  });

  it("invents nothing for a record whose optional fields are empty", () => {
    const lots = toLots([
      { ...maize, description: null, photo: null, qualityGrade: null, variety: null },
    ]);
    expect(lots[0].lotNo).toBe("LOT-01");
    expect(lots[0].variety).toBeNull();
    expect(lots[0].qualityGrade).toBeNull();
    expect(lots[0].description).toBeNull();
    expect(lots[0].photo).toBeNull();
  });

  it("numbers lots by the feed's order", () => {
    const lots = toLots([maize, { ...maize, id: "c2", name: "Sorghum" }]);
    expect(lots.map((l) => l.lotNo)).toEqual(["LOT-01", "LOT-02"]);
  });
});
