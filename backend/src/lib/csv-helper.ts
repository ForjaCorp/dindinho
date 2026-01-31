/**
 * Utilitário para geração de arquivos CSV de forma estruturada.
 */
export class CsvHelper {
  private headers: string[] = [];
  private rows: string[][] = [];

  /**
   * Define os cabeçalhos do CSV.
   * @param headers Array de strings com os nomes das colunas.
   */
  setHeaders(headers: string[]): this {
    this.headers = headers;
    return this;
  }

  /**
   * Adiciona uma linha de dados.
   * @param row Array de dados que correspondem aos cabeçalhos.
   */
  addRow(row: (string | number | boolean | null | undefined)[]): this {
    this.rows.push(row.map((value) => this.formatValue(value)));
    return this;
  }

  /**
   * Converte os dados para uma string CSV.
   * @returns String formatada em CSV.
   */
  build(): string {
    const headerLine = this.headers.join(",");
    const dataLines = this.rows.map((row) => row.join(","));
    return [headerLine, ...dataLines].join("\n");
  }

  /**
   * Escapa caracteres especiais e formata valores para CSV.
   */
  private formatValue(
    value: string | number | boolean | null | undefined,
  ): string {
    if (value === null || value === undefined) return "";

    let formatted = String(value);

    // Escapa aspas duplas
    if (formatted.includes('"')) {
      formatted = formatted.replace(/"/g, '""');
    }

    // Se contiver vírgula, quebra de linha ou aspas, envolve em aspas duplas
    if (
      formatted.includes(",") ||
      formatted.includes("\n") ||
      formatted.includes('"')
    ) {
      formatted = `"${formatted}"`;
    }

    return formatted;
  }
}
