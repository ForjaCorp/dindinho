/**
 * Utilitário para gerenciar downloads de arquivos no navegador.
 */
export class DownloadUtil {
  /**
   * Faz o download de um Blob como um arquivo.
   *
   * @param blob O conteúdo do arquivo
   * @param fileName O nome do arquivo a ser salvo
   */
  static downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    // Limpeza
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Gera um nome de arquivo padrão com data para relatórios.
   *
   * @param prefix Prefixo do nome do arquivo (ex: 'transacoes')
   * @param extension Extensão do arquivo (padrão: 'csv')
   * @returns Nome do arquivo formatado
   */
  static generateFileName(prefix: string, extension = 'csv'): string {
    const date = new Date().toISOString().split('T')[0];
    return `${prefix}-${date}.${extension}`;
  }
}
