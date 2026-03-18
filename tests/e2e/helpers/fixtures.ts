/**
 * Fixtures e factories para dados de teste.
 * Usar para criar dados consistentes entre testes.
 */

export const testUser = {
  email: "e2e@example.com",
  password: "Dindinho#1234",
  name: "E2E Test User",
};

export const testUserInviter = {
  email: "e2e-inviter@example.com",
  password: "Dindinho#1234",
  name: "E2E Inviter",
};

export const testUserInvitee = {
  email: "e2e-invitee@example.com",
  password: "Dindinho#1234",
  name: "E2E Invitee",
};

export const testTransaction = {
  description: "E2E Test Transaction",
  amount: 100.5,
  category: "Food",
  date: new Date().toISOString().split("T")[0],
};

export const testAccount = {
  name: "E2E Test Account",
  description: "Account created during E2E tests",
  initialBalance: 1000,
};
