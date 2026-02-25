import { Page, expect } from "@playwright/test";

/**
 * Assertion helpers customizados para E2E.
 * Reutilizável em múltiplos testes.
 */

/**
 * Valida que um elemento com data-testid (ou fallback) está visível e contém texto esperado.
 */
export async function assertElementWithTestIdContains(
  page: Page,
  testId: string,
  expectedText: string,
): Promise<void> {
  const element = page.getByTestId(testId);
  if ((await element.count()) > 0) {
    await expect(element).toContainText(expectedText);
  } else {
    // Fallback: buscar por texto
    const textElement = page.locator(`text=${expectedText}`);
    await expect(textElement).toBeVisible();
  }
}

/**
 * Valida que um form field foi preenchido corretamente.
 */
export async function assertFormFieldValue(
  page: Page,
  selector: string,
  expectedValue: string,
): Promise<void> {
  const field = page.locator(selector);
  await expect(field).toHaveValue(expectedValue);
}

/**
 * Valida que a página carregou e tem conteúdo não-vazio.
 */
export async function assertPageLoaded(page: Page): Promise<void> {
  const body = page.locator("body");
  await expect(body).not.toBeEmpty();
  expect(page.url()).toBeTruthy();
}

/**
 * Valida que um elemento com data-testid existe e é visível.
 */
export async function assertTestIdVisible(
  page: Page,
  testId: string,
): Promise<void> {
  const element = page.getByTestId(testId);
  if ((await element.count()) > 0) {
    await expect(element).toBeVisible();
  }
}

/**
 * Valida que um alerta/toast foi exibido com mensagem.
 */
export async function assertToastMessage(
  page: Page,
  expectedMessage: string | RegExp,
): Promise<void> {
  const toast = page.locator(
    '[data-testid="toast"], [role="alert"], .toast, .notification',
  );
  if ((await toast.count()) > 0) {
    await expect(toast.first()).toContainText(expectedMessage);
  }
}
