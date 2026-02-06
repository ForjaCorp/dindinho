import { PrismaClient, TransactionType, Prisma } from "@prisma/client";
import {
  ReportFilterDTO,
  SpendingByCategoryDTO,
  CashFlowDTO,
  BalanceHistoryDTO,
  BalanceHistoryGranularity,
} from "@dindinho/shared";
import { CsvHelper } from "../lib/csv-helper";
import { SnapshotService } from "./snapshot.service";

/**
 * Serviço responsável pela geração de relatórios financeiros e processamento de dados para analytics.
 * @class ReportsService
 * @description Fornece métodos para extrair insights sobre gastos, fluxo de caixa e evolução de saldo.
 */
export class ReportsService {
  /**
   * Serviço interno para gerenciamento de snapshots diários de saldo.
   * @private
   */
  private snapshotService: SnapshotService;

  /**
   * Cache de promessas de warmup por conta para evitar processamento duplicado simultâneo.
   * @private
   */
  private warmupByAccountId = new Map<string, Promise<void>>();

  /**
   * @param {PrismaClient} prisma - Instância do cliente Prisma.
   */
  constructor(private prisma: PrismaClient) {
    this.snapshotService = new SnapshotService(prisma);
  }

  /**
   * Converte uma data para o início do dia em UTC.
   * @private
   * @param {Date} input - Data de entrada.
   * @returns {Date} Data no início do dia (00:00:00.000) em UTC.
   */
  private toUtcStartOfDay(input: Date): Date {
    const d = new Date(input);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Soma dias usando milissegundos para preservar o offset aplicado no Date.
   * @private
   * @param {Date} date - Data base.
   * @param {number} days - Número de dias a adicionar.
   * @returns {Date} Nova data calculada.
   */
  private addDaysByMs(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Converte um ISO day (YYYY-MM-DD) no início do dia em UTC,
   * ajustando para que o intervalo represente o dia local do usuário.
   * @private
   * @param {string} value - String no formato YYYY-MM-DD.
   * @param {number | null} tzOffsetMinutes - Offset do fuso horário em minutos.
   * @returns {Date | null} Objeto Date ou null se inválido.
   */
  private parseIsoDayToUtcStartOfDay(
    value: string,
    tzOffsetMinutes: number | null,
  ): Date | null {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    )
      return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const utcStartMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
    const utcCandidate = new Date(utcStartMs);
    if (
      utcCandidate.getUTCFullYear() !== year ||
      utcCandidate.getUTCMonth() !== month - 1 ||
      utcCandidate.getUTCDate() !== day
    )
      return null;
    const offsetMs =
      typeof tzOffsetMinutes === "number" && Number.isFinite(tzOffsetMinutes)
        ? tzOffsetMinutes * 60 * 1000
        : 0;
    return new Date(utcStartMs + offsetMs);
  }

  /**
   * Normaliza filtros de período para intervalos UTC consistentes.
   * @private
   * @param {ReportFilterDTO} filters - Filtros recebidos na requisição.
   * @returns {Object} Objeto com start, end e endExclusive (para filtros de banco).
   */
  private normalizeReportUtcDayRange(filters: ReportFilterDTO): {
    start: Date | null;
    end: Date | null;
    endExclusive: Date | null;
  } {
    if (typeof filters.invoiceMonth === "string") {
      const [y, m] = filters.invoiceMonth.split("-").map((v) => Number(v));
      const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m, 0, 0, 0, 0, 0));
      return { start, end, endExclusive: null };
    }

    const startDayRaw =
      typeof filters.startDay === "string" ? filters.startDay : null;
    const endDayRaw =
      typeof filters.endDay === "string" ? filters.endDay : null;

    const tzOffsetMinutes =
      typeof filters.tzOffsetMinutes === "number" &&
      Number.isFinite(filters.tzOffsetMinutes)
        ? filters.tzOffsetMinutes
        : null;

    const startDay = startDayRaw
      ? this.parseIsoDayToUtcStartOfDay(startDayRaw, tzOffsetMinutes)
      : null;
    const endDay = endDayRaw
      ? this.parseIsoDayToUtcStartOfDay(endDayRaw, tzOffsetMinutes)
      : null;

    const normalizedStartDay = startDay ?? endDay;
    const normalizedEndDay = endDay ?? startDay;

    if (normalizedStartDay && normalizedEndDay) {
      if (normalizedStartDay.getTime() <= normalizedEndDay.getTime()) {
        return {
          start: normalizedStartDay,
          end: normalizedEndDay,
          endExclusive: this.addDaysByMs(normalizedEndDay, 1),
        };
      }

      return {
        start: normalizedEndDay,
        end: normalizedStartDay,
        endExclusive: this.addDaysByMs(normalizedStartDay, 1),
      };
    }

    const startDate =
      typeof filters.startDate === "string"
        ? new Date(filters.startDate)
        : null;
    const endDate =
      typeof filters.endDate === "string" ? new Date(filters.endDate) : null;

    const hasStartDate = !!startDate && Number.isFinite(startDate.getTime());
    const hasEndDate = !!endDate && Number.isFinite(endDate.getTime());

    if (!hasStartDate && !hasEndDate) {
      return { start: null, end: null, endExclusive: null };
    }

    const startInstant = hasStartDate ? startDate! : null;
    const endInstant = hasEndDate ? endDate! : null;

    if (
      endInstant &&
      endInstant.getUTCHours() === 0 &&
      endInstant.getUTCMinutes() === 0 &&
      endInstant.getUTCSeconds() === 0 &&
      endInstant.getUTCMilliseconds() === 0
    ) {
      const endDayStart = this.toUtcStartOfDay(endInstant);
      const start = startInstant ? startInstant : null;
      return {
        start,
        end: endDayStart,
        endExclusive: this.addUtcDays(endDayStart, 1),
      };
    }

    return { start: startInstant, end: endInstant, endExclusive: null };
  }

  /**
   * Calcula a diferença de dias entre duas datas UTC (inclusive).
   * @private
   * @param {Date} start - Data de início.
   * @param {Date} end - Data de fim.
   * @returns {number} Quantidade de dias no intervalo.
   */
  private daysBetweenUtcInclusive(start: Date, end: Date): number {
    const startUtc = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    );
    const endUtc = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
    );
    const diffDays = Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000));
    return diffDays + 1;
  }

  /**
   * Adiciona dias a uma data UTC, retornando o início do dia resultante.
   * @private
   * @param {Date} date - Data base.
   * @param {number} days - Quantidade de dias a adicionar.
   * @returns {Date} Nova data calculada.
   */
  private addUtcDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Retorna o final da semana (domingo) para uma data UTC.
   * @private
   * @param {Date} date - Data de referência.
   * @returns {Date} Data do último dia da semana (domingo).
   */
  private endOfWeekUtc(date: Date): Date {
    const d = this.toUtcStartOfDay(date);
    const day = d.getUTCDay();
    const daysToAdd = (7 - day) % 7;
    return this.addUtcDays(d, daysToAdd);
  }

  /**
   * Retorna o final do mês para uma data UTC.
   * @private
   * @param {Date} date - Data de referência.
   * @returns {Date} Data do último dia do mês.
   */
  private endOfMonthUtc(date: Date): Date {
    const d = this.toUtcStartOfDay(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  }

  /**
   * Gera uma lista de datas que representam o fim de cada período (semana/mês).
   * @private
   * @param {Date} rangeStart - Data de início do intervalo total.
   * @param {Date} rangeEnd - Data de fim do intervalo total.
   * @param {Exclude<BalanceHistoryGranularity, "DAY">} granularity - Granularidade desejada (WEEK ou MONTH).
   * @returns {Date[]} Array de datas representando os fins de período.
   */
  private listPeriodEndDates(
    rangeStart: Date,
    rangeEnd: Date,
    granularity: Exclude<BalanceHistoryGranularity, "DAY">,
  ): Date[] {
    const endDates: Date[] = [];
    let cursor = this.toUtcStartOfDay(rangeStart);
    const end = this.toUtcStartOfDay(rangeEnd);

    while (cursor <= end) {
      const periodEnd =
        granularity === "WEEK"
          ? this.endOfWeekUtc(cursor)
          : this.endOfMonthUtc(cursor);
      const clipped = periodEnd <= end ? periodEnd : end;
      endDates.push(clipped);
      cursor = this.addUtcDays(clipped, 1);
    }

    return endDates;
  }

  /**
   * Infere a granularidade ideal do gráfico baseada na duração do período.
   * @private
   * @param {Date} rangeStart - Data de início.
   * @param {Date} rangeEnd - Data de fim.
   * @returns {BalanceHistoryGranularity} Granularidade recomendada (DAY, WEEK ou MONTH).
   */
  private inferBalanceHistoryGranularity(
    rangeStart: Date,
    rangeEnd: Date,
  ): BalanceHistoryGranularity {
    const totalDays = this.daysBetweenUtcInclusive(rangeStart, rangeEnd);

    if (totalDays <= 92) return "DAY";
    if (totalDays <= 366) return "WEEK";
    return "MONTH";
  }

  /**
   * Computa o label para exibição no gráfico de histórico.
   * @private
   * @param {string} isoDate - Data no formato ISO (YYYY-MM-DD).
   * @param {BalanceHistoryGranularity} granularity - Granularidade aplicada.
   * @returns {string} Label formatado (YYYY-MM para meses, YYYY-MM-DD para o resto).
   */
  private computeBalanceHistoryLabel(
    isoDate: string,
    granularity: BalanceHistoryGranularity,
  ): string {
    if (granularity === "MONTH") {
      return isoDate.substring(0, 7);
    }
    return isoDate;
  }

  /**
   * Garante que os snapshots diários de saldo estejam atualizados para o período solicitado.
   * Verifica a versão do cálculo e se há lacunas no histórico.
   * @private
   * @async
   * @param {string} accountId - ID da conta.
   * @param {Date} rangeStart - Data de início do período.
   * @param {Date} rangeEnd - Data de fim do período.
   * @returns {Promise<void>}
   */
  private async ensureSnapshotsForAccount(
    accountId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<void> {
    const hasOutdated = await this.prisma.dailySnapshot.findFirst({
      where: {
        accountId,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        calcVersion: {
          not: SnapshotService.CALC_VERSION,
        },
      },
      select: { id: true },
    });

    const aggregate = await this.prisma.dailySnapshot.aggregate({
      where: { accountId },
      _min: { date: true },
      _max: { date: true },
    });

    const minDate = aggregate._min.date
      ? this.toUtcStartOfDay(aggregate._min.date)
      : null;
    const maxDate = aggregate._max.date
      ? this.toUtcStartOfDay(aggregate._max.date)
      : null;

    const expectedDays = this.daysBetweenUtcInclusive(rangeStart, rangeEnd);
    const shouldCheckCount = expectedDays > 0 && expectedDays <= 370;

    const count = shouldCheckCount
      ? await this.prisma.dailySnapshot.count({
          where: {
            accountId,
            date: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
        })
      : null;

    const needsWarmup =
      !!hasOutdated ||
      !minDate ||
      !maxDate ||
      minDate.getTime() > rangeStart.getTime() ||
      maxDate.getTime() < rangeEnd.getTime() ||
      (typeof count === "number" && count < expectedDays);

    if (!needsWarmup) return;

    const existing = this.warmupByAccountId.get(accountId);
    if (existing) {
      await existing;
      return;
    }

    const promise = this.snapshotService
      .updateSnapshots(accountId, rangeStart, rangeEnd)
      .finally(() => {
        this.warmupByAccountId.delete(accountId);
      });

    this.warmupByAccountId.set(accountId, promise);
    await promise;
  }

  /**
   * Agrega gastos por categoria no período selecionado.
   * @async
   * @param {string} userId - ID do usuário.
   * @param {ReportFilterDTO} filters - Filtros de período e contas.
   * @returns {Promise<SpendingByCategoryDTO>} Dados formatados para o gráfico de pizza.
   */
  async getSpendingByCategory(
    userId: string,
    filters: ReportFilterDTO,
  ): Promise<SpendingByCategoryDTO> {
    const where = this.buildBaseWhere(userId, filters);
    where.type = TransactionType.EXPENSE;

    const aggregations = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where,
      _sum: {
        amount: true,
      },
    });

    const categories = await this.prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const total = aggregations.reduce(
      (sum, curr) => sum + Math.abs(Number(curr._sum.amount || 0)),
      0,
    );

    return aggregations
      .map((agg) => {
        const cat = agg.categoryId ? categoryMap.get(agg.categoryId) : null;
        const amount = Math.abs(Number(agg._sum.amount || 0));
        return {
          categoryId: agg.categoryId,
          categoryName: cat?.name || "Sem Categoria",
          icon: cat?.icon || "pi-tag",
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Agrega fluxo de caixa (Entradas vs Saídas) por mês.
   * @async
   * @param {string} userId - ID do usuário.
   * @param {ReportFilterDTO} filters - Filtros de período e contas.
   * @returns {Promise<CashFlowDTO>} Dados comparativos de receitas e despesas.
   */
  async getCashFlow(
    userId: string,
    filters: ReportFilterDTO,
  ): Promise<CashFlowDTO> {
    const where = this.buildBaseWhere(userId, filters);
    where.type = { in: [TransactionType.INCOME, TransactionType.EXPENSE] };

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: {
        amount: true,
        type: true,
        date: true,
        invoiceMonth: true,
      },
      orderBy: { date: "asc" },
    });

    const monthlyData = new Map<string, { income: number; expense: number }>();

    for (const tx of transactions) {
      // Usar invoiceMonth para cartões de crédito, date para o resto
      let monthKey: string;
      if (tx.invoiceMonth) {
        monthKey = tx.invoiceMonth;
      } else {
        monthKey = tx.date.toISOString().substring(0, 7); // YYYY-MM
      }

      const current = monthlyData.get(monthKey) || { income: 0, expense: 0 };

      const amount = Math.abs(Number(tx.amount));
      if (tx.type === TransactionType.INCOME) {
        current.income += amount;
      } else {
        current.expense += amount;
      }

      monthlyData.set(monthKey, current);
    }

    return Array.from(monthlyData.entries()).map(([period, data]) => ({
      period,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }));
  }

  /**
   * Retorna histórico de saldo acumulado usando snapshots diários.
   * @async
   * @param {string} userId - ID do usuário.
   * @param {ReportFilterDTO} filters - Filtros de período, contas e granularidade.
   * @returns {Promise<BalanceHistoryDTO>} Pontos do gráfico de evolução de saldo.
   */
  async getBalanceHistory(
    userId: string,
    filters: ReportFilterDTO,
  ): Promise<BalanceHistoryDTO> {
    const today = this.toUtcStartOfDay(new Date());
    const normalized = this.normalizeReportUtcDayRange(filters);

    const rangeEnd = normalized.end
      ? this.toUtcStartOfDay(normalized.end)
      : today;
    const rangeStart = normalized.start
      ? this.toUtcStartOfDay(normalized.start)
      : this.toUtcStartOfDay(
          new Date(
            Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth(),
              today.getUTCDate() - 90,
            ),
          ),
        );

    const { accountIds, granularity, changeOnly } = filters;

    const effectiveGranularity =
      granularity ?? this.inferBalanceHistoryGranularity(rangeStart, rangeEnd);

    const scopedAccountIds = (
      await this.prisma.account.findMany({
        where: {
          ownerId: userId,
          ...(accountIds?.length ? { id: { in: accountIds } } : {}),
        },
        select: { id: true },
      })
    ).map((a) => a.id);

    await Promise.all(
      scopedAccountIds.map((accountId) =>
        this.ensureSnapshotsForAccount(accountId, rangeStart, rangeEnd),
      ),
    );

    const where: Prisma.DailySnapshotWhereInput = {
      account: {
        ownerId: userId,
      },
    };

    const periodDates =
      effectiveGranularity === "DAY"
        ? null
        : this.listPeriodEndDates(rangeStart, rangeEnd, effectiveGranularity);

    const periodMetaByEndDate = new Map<
      string,
      { periodStart: string; periodEnd: string }
    >();
    if (periodDates?.length) {
      let cursor = this.toUtcStartOfDay(rangeStart);
      for (const periodEndDate of periodDates) {
        const startIso = cursor.toISOString().split("T")[0];
        const endIso = periodEndDate.toISOString().split("T")[0];
        periodMetaByEndDate.set(endIso, {
          periodStart: startIso,
          periodEnd: endIso,
        });
        cursor = this.addUtcDays(periodEndDate, 1);
      }
    }

    where.date =
      effectiveGranularity === "DAY"
        ? {
            gte: rangeStart,
            lte: rangeEnd,
          }
        : {
            in: periodDates ?? [],
          };

    if (accountIds?.length) {
      where.accountId = { in: accountIds };
    }

    const snapshots = await this.prisma.dailySnapshot.groupBy({
      by: ["date"],
      where,
      _sum: {
        balance: true,
      },
      orderBy: { date: "asc" },
    });

    const points: BalanceHistoryDTO = snapshots.map((s) => {
      const isoDate = s.date.toISOString().split("T")[0];
      const meta = periodMetaByEndDate.get(isoDate);
      return {
        date: isoDate,
        t: Date.UTC(
          s.date.getUTCFullYear(),
          s.date.getUTCMonth(),
          s.date.getUTCDate(),
        ),
        label: this.computeBalanceHistoryLabel(isoDate, effectiveGranularity),
        periodStart: meta?.periodStart ?? isoDate,
        periodEnd: meta?.periodEnd ?? isoDate,
        balance: Number(s._sum.balance || 0),
      };
    });

    const withDelta: BalanceHistoryDTO = points.map((p, idx) => {
      if (idx === 0) return { ...p, changed: true };

      const prev = points[idx - 1];
      const delta = p.balance - prev.balance;
      return {
        ...p,
        delta,
        changed: delta !== 0,
      };
    });

    if (!changeOnly) return withDelta;

    const filtered: BalanceHistoryDTO = [];
    for (let i = 0; i < withDelta.length; i += 1) {
      if (i === 0) {
        filtered.push(withDelta[i]);
        continue;
      }

      if (withDelta[i].changed) filtered.push(withDelta[i]);
    }

    if (withDelta.length > 1) {
      const last = withDelta[withDelta.length - 1];
      const alreadyHasLast =
        filtered.length > 0 && filtered[filtered.length - 1].date === last.date;
      if (!alreadyHasLast) filtered.push(last);
    }

    return filtered;
  }

  /**
   * Gera o conteúdo CSV para as transações que correspondem aos filtros.
   * @async
   * @param {string} userId - ID do usuário.
   * @param {ReportFilterDTO} filters - Filtros de busca.
   * @returns {Promise<string>} String formatada em CSV.
   */
  async exportTransactionsCsv(
    userId: string,
    filters: ReportFilterDTO,
  ): Promise<string> {
    const where = this.buildBaseWhere(userId, filters);

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
      },
      orderBy: { date: "desc" },
    });

    const csv = new CsvHelper();
    csv.setHeaders([
      "Data",
      "Descrição",
      "Categoria",
      "Conta",
      "Tipo",
      "Valor",
      "Pago",
    ]);

    for (const t of transactions) {
      csv.addRow([
        t.date.toISOString().split("T")[0],
        t.description || "",
        t.category?.name || "Sem Categoria",
        t.account.name,
        t.type,
        Number(t.amount),
        t.isPaid ? "Sim" : "Não",
      ]);
    }

    return csv.build();
  }

  /**
   * Constrói o objeto de filtro base (where) para o Prisma.
   * @private
   * @param {string} userId - ID do usuário.
   * @param {ReportFilterDTO} filters - Filtros da requisição.
   * @returns {Prisma.TransactionWhereInput} Objeto de filtro para o Prisma.
   */
  private buildBaseWhere(
    userId: string,
    filters: ReportFilterDTO,
  ): Prisma.TransactionWhereInput {
    const { startDate, endDate, accountIds, includePending, invoiceMonth } =
      filters;

    const where: Prisma.TransactionWhereInput = {
      account: {
        ownerId: userId,
      },
    };

    if (typeof invoiceMonth === "string") {
      const [y, m] = invoiceMonth.split("-").map((v) => Number(v));
      const invoiceMonthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const invoiceMonthEndExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

      where.OR = [
        { invoiceMonth },
        {
          AND: [
            { invoiceMonth: null },
            {
              date: {
                gte: invoiceMonthStart,
                lt: invoiceMonthEndExclusive,
              },
            },
          ],
        },
      ];
    } else {
      const normalized = this.normalizeReportUtcDayRange(filters);
      if (normalized.start || normalized.endExclusive || normalized.end) {
        if (normalized.endExclusive) {
          where.date = {
            ...(normalized.start ? { gte: normalized.start } : {}),
            lt: normalized.endExclusive,
          };
        } else {
          where.date = {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          };
        }
      }
    }

    if (accountIds?.length) {
      where.accountId = { in: accountIds };
    }

    if (!includePending) {
      where.isPaid = true;
    }

    return where;
  }
}
