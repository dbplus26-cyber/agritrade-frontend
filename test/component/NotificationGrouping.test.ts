import { describe, expect, it } from "vitest";
import { groupRuns } from "@/components/admin/notifications-screen";
import type { INotification } from "@/types/notification.types";

const row = (over: Partial<INotification>): INotification => ({
  channel: "SMS",
  createdAt: "2026-08-23T10:00:00.000Z",
  error: null,
  event: "float.low",
  id: Math.random().toString(36).slice(2),
  preview: null,
  recipient: "+233244118820",
  sentAt: null,
  status: "SENT",
  ...over,
});

describe("counting a run of identical notifications", () => {
  it("folds the same event, recipient and outcome into one counted row", () => {
    const grouped = groupRuns([
      row({ createdAt: "2026-08-23T14:30:00.000Z" }),
      row({ createdAt: "2026-08-23T11:15:00.000Z" }),
      row({ createdAt: "2026-08-23T09:05:00.000Z" }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0].count).toBe(3);
    // The newest leads and the run's foot is the oldest, so the tooltip can
    // say the range rather than a single moment.
    expect(grouped[0].createdAt).toBe("2026-08-23T14:30:00.000Z");
    expect(grouped[0].firstAt).toBe("2026-08-23T09:05:00.000Z");
  });

  it("never folds a failure into a run of successes", () => {
    const grouped = groupRuns([
      row({ status: "SENT" }),
      row({ status: "FAILED" }),
      row({ status: "SENT" }),
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped.find((g) => g.status === "FAILED")?.count).toBe(1);
    expect(grouped.find((g) => g.status === "SENT")?.count).toBe(2);
  });

  it("keeps different recipients and different events apart", () => {
    const grouped = groupRuns([
      row({ recipient: "+233244118820" }),
      row({ recipient: "+233209934471" }),
      row({ event: "payment.confirmed" }),
    ]);
    expect(grouped).toHaveLength(3);
  });

  it("leaves the counts summing to what the server sent", () => {
    const list = [
      row({}),
      row({}),
      row({ event: "sale.balance_due" }),
      row({ status: "FAILED" }),
    ];
    const grouped = groupRuns(list);
    expect(grouped.reduce((n, g) => n + g.count, 0)).toBe(list.length);
  });
});
