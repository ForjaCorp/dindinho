import { describe, expect, it } from "vitest";
import {
  periodSelectionSchema,
  reportFilterSchema,
  timeFilterSelectionSchema,
} from "./report.schema";

describe("report.schema", () => {
  describe("periodSelectionSchema", () => {
    it("deve aceitar preset não-CUSTOM sem startDay/endDay", () => {
      expect(
        periodSelectionSchema.parse({ preset: "TODAY", tzOffsetMinutes: 180 }),
      ).toEqual({ preset: "TODAY", tzOffsetMinutes: 180 });
    });

    it("deve exigir startDay no preset CUSTOM", () => {
      expect(() =>
        periodSelectionSchema.parse({ preset: "CUSTOM", endDay: "2026-01-02" }),
      ).toThrow("Data inicial é obrigatória no preset CUSTOM");
    });

    it("deve exigir endDay no preset CUSTOM", () => {
      expect(() =>
        periodSelectionSchema.parse({
          preset: "CUSTOM",
          startDay: "2026-01-01",
        }),
      ).toThrow("Data final é obrigatória no preset CUSTOM");
    });

    it("deve rejeitar startDay inválido no preset CUSTOM", () => {
      expect(() =>
        periodSelectionSchema.parse({
          preset: "CUSTOM",
          startDay: "2024-02-31",
          endDay: "2024-03-01",
        }),
      ).toThrow("Data inválida");
    });
  });

  describe("timeFilterSelectionSchema", () => {
    it("deve aceitar seleção de fatura", () => {
      expect(
        timeFilterSelectionSchema.parse({
          mode: "INVOICE_MONTH",
          invoiceMonth: "2026-01",
        }),
      ).toEqual({ mode: "INVOICE_MONTH", invoiceMonth: "2026-01" });
    });

    it("deve rejeitar invoiceMonth inválido", () => {
      expect(() =>
        timeFilterSelectionSchema.parse({
          mode: "INVOICE_MONTH",
          invoiceMonth: "2026-1",
        }),
      ).toThrow("Mês de fatura inválido");
    });

    it("deve rejeitar invoiceMonth fora do range", () => {
      expect(() =>
        timeFilterSelectionSchema.parse({
          mode: "INVOICE_MONTH",
          invoiceMonth: "2026-13",
        }),
      ).toThrow("Mês de fatura inválido");
    });
  });

  describe("reportFilterSchema", () => {
    it("deve aceitar filtro apenas por invoiceMonth", () => {
      expect(
        reportFilterSchema.parse({
          invoiceMonth: "2026-01",
          includePending: true,
        }),
      ).toEqual({ invoiceMonth: "2026-01", includePending: true });
    });

    it("deve rejeitar invoiceMonth combinado com startDay", () => {
      expect(() =>
        reportFilterSchema.parse({
          invoiceMonth: "2026-01",
          startDay: "2026-01-01",
        }),
      ).toThrow("Não combine invoiceMonth com filtros de período");
    });

    it("deve rejeitar invoiceMonth combinado com startDate", () => {
      expect(() =>
        reportFilterSchema.parse({
          invoiceMonth: "2026-01",
          startDate: "2026-01-01T00:00:00.000Z",
        }),
      ).toThrow("Não combine invoiceMonth com filtros de período");
    });

    it("deve normalizar accountIds string para array", () => {
      const id = "123e4567-e89b-12d3-a456-426614174000";
      expect(
        reportFilterSchema.parse({
          startDay: "2026-01-01",
          endDay: "2026-01-10",
          tzOffsetMinutes: 180,
          accountIds: id,
          includePending: true,
        }),
      ).toEqual({
        startDay: "2026-01-01",
        endDay: "2026-01-10",
        tzOffsetMinutes: 180,
        accountIds: [id],
        includePending: true,
      });
    });
  });
});
