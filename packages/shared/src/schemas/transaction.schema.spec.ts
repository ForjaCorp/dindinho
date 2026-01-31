import { describe, expect, it } from "vitest";
import {
  invoiceMonthSchema,
  listTransactionsQuerySchema,
} from "./transaction.schema";

describe("transaction.schema", () => {
  describe("invoiceMonthSchema", () => {
    it("deve aceitar mês de fatura no formato YYYY-MM", () => {
      expect(invoiceMonthSchema.parse("2026-01")).toBe("2026-01");
    });

    it("deve rejeitar mês de fatura inválido", () => {
      expect(() => invoiceMonthSchema.parse("2026-1")).toThrow(
        "Mês de fatura inválido",
      );
    });
  });

  describe("listTransactionsQuerySchema", () => {
    it("deve aceitar filtro por invoiceMonth", () => {
      expect(
        listTransactionsQuerySchema.parse({ invoiceMonth: "2026-01" }),
      ).toEqual({
        invoiceMonth: "2026-01",
      });
    });

    it("deve rejeitar invoiceMonth combinado com from", () => {
      expect(() =>
        listTransactionsQuerySchema.parse({
          invoiceMonth: "2026-01",
          from: "2026-01-01T00:00:00.000Z",
        }),
      ).toThrow("Não combine invoiceMonth com filtros de período");
    });

    it("deve rejeitar startDay combinado com from", () => {
      expect(() =>
        listTransactionsQuerySchema.parse({
          startDay: "2026-01-01",
          endDay: "2026-01-10",
          from: "2026-01-01T00:00:00.000Z",
        }),
      ).toThrow("Não combine startDay/endDay com from/to");
    });

    it("deve aceitar startDay/endDay com tzOffsetMinutes coerção", () => {
      expect(
        listTransactionsQuerySchema.parse({
          startDay: "2026-01-01",
          endDay: "2026-01-10",
          tzOffsetMinutes: "180",
          limit: "30",
        }),
      ).toEqual({
        startDay: "2026-01-01",
        endDay: "2026-01-10",
        tzOffsetMinutes: 180,
        limit: 30,
      });
    });
  });
});
