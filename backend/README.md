# Backend - Dindinho API

Variáveis de ambiente relevantes para Refresh Tokens

- `REFRESH_TOKEN_DAYS` (opcional): número de dias que um refresh token é válido. Default: `7`.
- `ENABLE_REFRESH_CLEANUP` (opcional): quando `true`, a aplicação agenda uma tarefa periódica para limpar tokens expirados. Default: `false`.
- `REFRESH_CLEANUP_INTERVAL_MINUTES` (opcional): intervalo em minutos para a tarefa de cleanup. Default: `60` (uma hora).

Exemplo `.env`:

```
JWT_SECRET=super-secret
REFRESH_TOKEN_DAYS=7
ENABLE_REFRESH_CLEANUP=true
REFRESH_CLEANUP_INTERVAL_MINUTES=60
FRONTEND_URL=https://app.example.com
```

Como rodar testes (local):

```bash
cd backend
npm install
npm test
```

Observações de segurança

- Refresh tokens são armazenados como hashes SHA-256 no banco; apenas o token raw é retornado ao cliente.
- Se desejar suportar múltiplos dispositivos por usuário, ajuste a política de revogação em `RefreshTokenService`.

Exemplo de agendamento (Kubernetes CronJob)

Se preferir rodar a limpeza de tokens expirados fora do processo da API (recomendado em produção), crie um CronJob no Kubernetes que execute o script one-shot `cleanup:refresh-tokens`. Exemplo:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
	name: dindinho-cleanup-refresh-tokens
spec:
	schedule: "0 * * * *" # a cada hora
	jobTemplate:
		spec:
			template:
				spec:
					containers:
						- name: cleanup
							image: registry.example.com/forjacorp/dindinho-backend:latest
							command: ["/bin/sh", "-lc", "npm run cleanup:refresh-tokens"]
							env:
								- name: NODE_ENV
									value: "production"
								- name: DATABASE_URL
									valueFrom:
										secretKeyRef:
											name: dindinho-secrets
											key: DATABASE_URL
					restartPolicy: OnFailure
```

Alternativas operacionais:

- Rodar `npm run cleanup:refresh-tokens` via cron do sistema ou job agendado no provedor (ex.: GitHub Actions, GitLab CI, AWS Lambda/CloudWatch Events).
- Não habilite o job `ENABLE_REFRESH_CLEANUP` em cada réplica da API — isso pode executar múltiplas limpezas concorrentes.
