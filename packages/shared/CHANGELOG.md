# Registro de alterações de `@dindinho/shared`

## 0.1.0 - 2025-12-12

### Alterações

- Adicionado `refreshToken` ao `loginResponseSchema`. Trata‑se de uma alteração incompatível (breaking change): respostas de login agora podem incluir o campo `refreshToken` (string). Atualize os clientes para aceitar esse novo campo.

### Observações

- Versão do pacote atualizada para `0.1.0`. Consumidores devem atualizar para esta versão ao implantar a versão do backend que retorna `refreshToken` nas respostas de autenticação.
