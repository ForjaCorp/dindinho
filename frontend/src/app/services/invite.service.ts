import { Injectable, inject, signal, computed } from '@angular/core';
import { finalize, tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { CreateInviteDTO, InviteDTO, UpdateInviteStatusDTO, InviteStatus } from '@dindinho/shared';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';

/**
 * Interface do estado de convites
 * @description Define a estrutura do estado reativo do serviço de convites
 */
interface InviteState {
  /** Convites enviados pelo usuário */
  sentInvites: InviteDTO[];
  /** Convites recebidos pelo usuário */
  receivedInvites: InviteDTO[];
  /** Indica se operação está em andamento */
  loading: boolean;
  /** Mensagem de erro da última operação */
  error: string | null;
}

/**
 * Serviço responsável pelo gerenciamento de convites de colaboração
 * @description Gerencia a criação, listagem, aceite e revogação de convites usando Signals
 * @since 1.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class InviteService {
  private api = inject(ApiService);
  private logger = inject(LoggerService);

  /**
   * Estado reativo privado dos convites
   */
  private state = signal<InviteState>({
    sentInvites: [],
    receivedInvites: [],
    loading: false,
    error: null,
  });

  /**
   * Signals readonly para consumo nos componentes
   */
  readonly sentInvites = computed(() => this.state().sentInvites);
  readonly receivedInvites = computed(() => this.state().receivedInvites);
  readonly isLoading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  /**
   * Signal computado para convites pendentes recebidos
   */
  readonly pendingReceivedInvites = computed(() =>
    this.receivedInvites().filter((i) => i.status === InviteStatus.PENDING),
  );

  /**
   * Cria um novo convite de colaboração
   * @param data Dados do convite (email, contas, expiração)
   */
  createInvite(data: CreateInviteDTO): Observable<InviteDTO> {
    this.setLoading(true);
    return this.api.post<InviteDTO>('invites', data).pipe(
      tap((newInvite) => {
        this.state.update((s) => ({
          ...s,
          sentInvites: [newInvite, ...s.sentInvites],
          error: null,
        }));
        this.logger.info('Convite criado com sucesso', { inviteId: newInvite.id });
      }),
      catchError((err) => {
        this.handleError(err, 'Erro ao criar convite');
        return throwError(() => err);
      }),
      finalize(() => this.setLoading(false)),
    );
  }

  /**
   * Busca um convite específico pelo ID (para captura via link)
   * @param inviteId ID do convite
   */
  getInvite(inviteId: string): Observable<InviteDTO> {
    this.setLoading(true);
    return this.api.get<InviteDTO>(`invites/${inviteId}`).pipe(
      catchError((err) => {
        this.handleError(err, 'Erro ao buscar convite');
        return throwError(() => err);
      }),
      finalize(() => this.setLoading(false)),
    );
  }

  /**
   * Busca um convite específico pelo Token (para captura via link público)
   * @param token Token do convite
   */
  getInviteByToken(token: string): Observable<InviteDTO> {
    this.setLoading(true);
    return this.api.get<InviteDTO>(`invites/t/${token}`).pipe(
      catchError((err) => {
        this.handleError(err, 'Erro ao buscar convite');
        return throwError(() => err);
      }),
      finalize(() => this.setLoading(false)),
    );
  }

  /**
   * Carrega os convites enviados pelo usuário logado
   */
  loadSentInvites(): void {
    this.setLoading(true);
    this.api
      .get<InviteDTO[]>('invites/sent')
      .pipe(
        tap((invites) => {
          this.state.update((s) => ({ ...s, sentInvites: invites, error: null }));
        }),
        catchError((err) => {
          this.handleError(err, 'Erro ao carregar convites enviados');
          return throwError(() => err);
        }),
        finalize(() => this.setLoading(false)),
      )
      .subscribe();
  }

  /**
   * Carrega os convites recebidos (pendentes) pelo usuário logado
   */
  loadReceivedInvites(): void {
    this.setLoading(true);
    this.api
      .get<InviteDTO[]>('invites/pending')
      .pipe(
        tap((invites) => {
          this.state.update((s) => ({ ...s, receivedInvites: invites, error: null }));
        }),
        catchError((err) => {
          this.handleError(err, 'Erro ao carregar convites recebidos');
          return throwError(() => err);
        }),
        finalize(() => this.setLoading(false)),
      )
      .subscribe();
  }

  /**
   * Responde a um convite (Aceitar ou Rejeitar)
   * @param inviteId ID do convite
   * @param status Novo status
   */
  respondToInvite(
    inviteId: string,
    status: InviteStatus.ACCEPTED | InviteStatus.REJECTED,
  ): Observable<InviteDTO> {
    this.setLoading(true);
    const data: UpdateInviteStatusDTO = { status };

    return this.api.patch<InviteDTO>(`invites/${inviteId}`, data).pipe(
      tap((updatedInvite) => {
        this.state.update((s) => ({
          ...s,
          receivedInvites: s.receivedInvites.map((i) => (i.id === inviteId ? updatedInvite : i)),
          error: null,
        }));
        this.logger.info(`Convite ${status.toLowerCase()} com sucesso`, { inviteId });
      }),
      catchError((err) => {
        this.handleError(
          err,
          `Erro ao ${status === InviteStatus.ACCEPTED ? 'aceitar' : 'rejeitar'} convite`,
        );
        return throwError(() => err);
      }),
      finalize(() => this.setLoading(false)),
    );
  }

  /**
   * Revoga (deleta) um convite enviado
   * @param inviteId ID do convite
   */
  revokeInvite(inviteId: string): Observable<void> {
    this.setLoading(true);
    return this.api.delete<void>(`invites/${inviteId}`).pipe(
      tap(() => {
        this.state.update((s) => ({
          ...s,
          sentInvites: s.sentInvites.filter((i) => i.id !== inviteId),
          error: null,
        }));
        this.logger.info('Convite revogado com sucesso', { inviteId });
      }),
      catchError((err) => {
        this.handleError(err, 'Erro ao revogar convite');
        return throwError(() => err);
      }),
      finalize(() => this.setLoading(false)),
    );
  }

  /**
   * Auxiliar para atualizar estado de carregamento
   */
  private setLoading(loading: boolean): void {
    this.state.update((s) => ({ ...s, loading }));
  }

  /**
   * Auxiliar para tratamento de erros
   */
  private handleError(error: unknown, defaultMessage: string): void {
    const err = error as { error?: { message?: string } };
    const message = err.error?.message || defaultMessage;
    this.state.update((s) => ({ ...s, error: message }));
    this.logger.error(message, error);
  }
}
