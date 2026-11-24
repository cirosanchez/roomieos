import { describe, expect, it } from "vitest";
import {
  calculateBalances,
  formatMoney,
  moneyInput,
  parseMoney,
  parsePercentage,
  simplifyBalances,
  splitEqual,
  splitPercentage,
} from "./money";
import { createSampleHousehold } from "./sample";

describe("integer money parsing and exact formatting", () => {
  it.each([
    ["0.01", 1],
    [".5", 50],
    [" 0012.30 ", 1230],
    ["45", 4500],
    ["90071992547409.91", Number.MAX_SAFE_INTEGER],
  ])("parses %s without floating point", (value, expected) => {
    expect(parseMoney(value)).toBe(expected);
    expect(parseMoney(moneyInput(expected))).toBe(expected);
  });
  it.each([
    "",
    " ",
    "0",
    "0.00",
    "-1",
    "1.001",
    "1e2",
    "1,000.00",
    "CAD 1",
    "Infinity",
    "NaN",
    "90071992547409.92",
    "9".repeat(100),
  ])("rejects invalid or unsafe money %s", (value) =>
    expect(() => parseMoney(value)).toThrow(),
  );
  it("supports zero shares and basis points, while rejecting excessive precision/percentages", () => {
    expect(parseMoney("0", true)).toBe(0);
    expect(parsePercentage("33.33")).toBe(3333);
    expect(parsePercentage("100")).toBe(10000);
    expect(parsePercentage("0.00")).toBe(0);
    for (const value of ["100.01", "-1", "33.333", ""])
      expect(() => parsePercentage(value)).toThrow();
  });
  it("formats exact cents even at the safe integer limit and below one negative dollar", () => {
    expect(
      formatMoney(Number.MAX_SAFE_INTEGER, "CAD").replace(/\s/g, " "),
    ).toBe("CAD 90,071,992,547,409.91");
    expect(formatMoney(-1, "CAD").replace(/\s/g, " ")).toBe("-CAD 0.01");
    for (const currency of ["CAD", "USD", "EUR", "GBP"] as const) {
      expect(formatMoney(100, currency)).toContain(currency);
      expect(formatMoney(100, currency)).toContain("1.00");
    }
  });
});

describe("deterministic cent allocation", () => {
  const ids = ["avery", "jordan", "sam"];
  it("allocates 100 cents equally as 34/33/33, with zero shares when total is smaller than roster", () => {
    expect(splitEqual(100, ids).map((row) => row.amountCents)).toEqual([
      34, 33, 33,
    ]);
    expect(splitEqual(1, ids).map((row) => row.amountCents)).toEqual([1, 0, 0]);
  });
  it("uses largest remainders and stable input order for ties, including zero weights", () => {
    expect(
      splitPercentage(101, ids, { avery: 5000, jordan: 2500, sam: 2500 }).map(
        (row) => row.amountCents,
      ),
    ).toEqual([51, 25, 25]);
    expect(
      splitPercentage(1, ids, { avery: 0, jordan: 5000, sam: 5000 }).map(
        (row) => row.amountCents,
      ),
    ).toEqual([0, 1, 0]);
    expect(
      splitPercentage(100, ids, { avery: 3334, jordan: 3333, sam: 3333 }).map(
        (row) => row.amountCents,
      ),
    ).toEqual([34, 33, 33]);
  });
  it("handles maximum safe amounts with exact integer products", () => {
    for (const rows of [
      splitEqual(Number.MAX_SAFE_INTEGER, ids),
      splitPercentage(Number.MAX_SAFE_INTEGER, ids, {
        avery: 3334,
        jordan: 3333,
        sam: 3333,
      }),
    ])
      expect(rows.reduce((sum, row) => sum + BigInt(row.amountCents), 0n)).toBe(
        BigInt(Number.MAX_SAFE_INTEGER),
      );
  });
  it("preserves every cent for household sizes 2–20 and uneven totals", () => {
    for (let count = 2; count <= 20; count++) {
      const members = Array.from(
        { length: count },
        (_, index) => `member-${index}`,
      );
      const weights = Object.fromEntries(
        members.map((id, index) => [
          id,
          Math.floor(10000 / count) + (index < 10000 % count ? 1 : 0),
        ]),
      );
      for (const amount of [1, 2, 99, 100, 101, 10001]) {
        for (const shares of [
          splitEqual(amount, members),
          splitPercentage(amount, members, weights),
        ]) {
          expect(shares.reduce((sum, row) => sum + row.amountCents, 0)).toBe(
            amount,
          );
          expect(
            shares.every(
              (row) =>
                Number.isSafeInteger(row.amountCents) && row.amountCents >= 0,
            ),
          ).toBe(true);
        }
      }
    }
  });
  it("rejects duplicates, empty participants, invalid totals and mismatched percentage inputs", () => {
    for (const amount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(() => splitEqual(amount, ids)).toThrow();
    expect(() => splitEqual(100, [])).toThrow();
    expect(() => splitEqual(100, ["a", "a"])).toThrow();
    const invalidWeights: Record<string, number>[] = [
      { avery: 5000, jordan: 2500, sam: 2499 },
      { avery: 5000, jordan: 5000 },
      { avery: -1, jordan: 5001, sam: 5000 },
      { avery: 0.5, jordan: 4999.5, sam: 5000 },
    ];
    for (const weights of invalidWeights)
      expect(() => splitPercentage(100, ids, weights)).toThrow();
  });
});

describe("open expense netting and advisory transfers", () => {
  const state = createSampleHousehold(new Date(2026, 10, 23));
  const expense = {
    ...state.expenses[0],
    payers: [{ memberId: "avery", amountCents: 4500 }],
  };
  it("nets 45 dollars paid by A as +30/-15/-15 and suggests two real obligations", () => {
    const balances = calculateBalances(state.members, [expense]);
    expect(balances.map((row) => row.netCents)).toEqual([3000, -1500, -1500]);
    expect(simplifyBalances(balances)).toEqual([
      { fromId: "jordan", toId: "avery", amountCents: 1500 },
      { fromId: "sam", toId: "avery", amountCents: 1500 },
    ]);
  });
  it("supports multiple payers and ignores settled expenses completely", () => {
    expect(
      calculateBalances(state.members, [state.expenses[0]]).map(
        (row) => row.netCents,
      ),
    ).toEqual([1500, 0, -1500]);
    const settled = { ...expense, status: "settled" as const };
    expect(
      calculateBalances(state.members, [settled]).map((row) => row.netCents),
    ).toEqual([0, 0, 0]);
    expect(
      calculateBalances(state.members, [{ ...settled, status: "open" }]),
    ).toEqual(calculateBalances(state.members, [expense]));
  });
  it("reranks largest balances after each match and preserves every net without mutating inputs", () => {
    const balances = [
      { memberId: "b", netCents: -600 },
      { memberId: "a", netCents: -800 },
      { memberId: "d", netCents: 700 },
      { memberId: "c", netCents: 700 },
    ];
    const before = structuredClone(balances);
    const transfers = simplifyBalances(balances);
    expect(transfers).toEqual([
      { fromId: "a", toId: "c", amountCents: 700 },
      { fromId: "b", toId: "d", amountCents: 600 },
      { fromId: "a", toId: "d", amountCents: 100 },
    ]);
    expect(simplifyBalances([...balances].reverse())).toEqual(transfers);
    const remaining = new Map(
      balances.map((row) => [row.memberId, row.netCents]),
    );
    for (const transfer of transfers) {
      remaining.set(
        transfer.fromId,
        remaining.get(transfer.fromId)! + transfer.amountCents,
      );
      remaining.set(
        transfer.toId,
        remaining.get(transfer.toId)! - transfer.amountCents,
      );
    }
    expect([...remaining.values()]).toEqual([0, 0, 0, 0]);
    expect(balances).toEqual(before);
  });
  it("nets open expenses rather than inventing transfers for already offset amounts", () => {
    const reverse = {
      ...expense,
      payers: [{ memberId: "jordan", amountCents: 4500 }],
    };
    const balances = calculateBalances(state.members, [expense, reverse]);
    expect(balances.reduce((sum, row) => sum + row.netCents, 0)).toBe(0);
    expect(simplifyBalances(balances)).toEqual([
      { fromId: "sam", toId: "avery", amountCents: 1500 },
      { fromId: "sam", toId: "jordan", amountCents: 1500 },
    ]);
    expect(simplifyBalances(calculateBalances(state.members, []))).toEqual([]);
  });
  it("rejects unsafe aggregate balances and nonzero-sum or missing-member ledgers", () => {
    const large = {
      ...expense,
      amountCents: Number.MAX_SAFE_INTEGER,
      payers: [{ memberId: "avery", amountCents: Number.MAX_SAFE_INTEGER }],
      participants: [
        { memberId: "jordan", amountCents: Number.MAX_SAFE_INTEGER },
      ],
    };
    expect(() => calculateBalances(state.members, [large, large])).toThrow(
      /limit/,
    );
    expect(() =>
      calculateBalances(state.members, [
        { ...expense, participants: [{ memberId: "sam", amountCents: 1 }] },
      ]),
    ).toThrow(/zero/);
    expect(() =>
      calculateBalances(state.members, [
        { ...expense, payers: [{ memberId: "missing", amountCents: 4500 }] },
      ]),
    ).toThrow(/invalid/);
    expect(() => simplifyBalances([{ memberId: "a", netCents: 1 }])).toThrow();
  });
});
