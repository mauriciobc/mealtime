# Test info

- Name: Authentication E2E >> shows error on missing login fields
- Location: /home/mauriciobc/Documentos/Code/mealtime/e2e/auth.spec.ts:67:3

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: /login|entrar/i }) resolved to 2 elements:
    1) <button type="submit" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">Entrar com Email</button> aka getByRole('button', { name: 'Entrar com Email' })
    2) <button class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full">…</button> aka getByRole('button', { name: 'Entrar com Google' })

Call log:
  - waiting for getByRole('button', { name: /login|entrar/i })

    at /home/mauriciobc/Documentos/Code/mealtime/e2e/auth.spec.ts:69:63
```

# Page snapshot

```yaml
- status:
  - img
  - text: Static route
  - button "Hide static indicator":
    - img
- alert
- main:
  - text: MealTime Entre com seu email e senha ou use o Google Email
  - textbox "Email"
  - text: Senha
  - textbox "Senha"
  - button:
    - img
  - button "Entrar com Email"
  - text: Ou continue com
  - button "Entrar com Google":
    - img
    - text: Entrar com Google
  - text: Não tem uma conta?
  - link "Registre-se":
    - /url: /signup
  - text: Ao entrar, você concorda com nossos
  - link "Termos de Serviço":
    - /url: /terms
  - text: e
  - link "Política de Privacidade":
    - /url: /privacy
- region "Notifications alt+T"
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | const TEST_EMAIL = 'testuser@example.com';
   4 | const TEST_PASSWORD = 'password123';
   5 |
   6 | // Utility to register a user (for login tests)
   7 | async function registerTestUser(page) {
   8 |   await page.goto('/signup');
   9 |   await page.getByLabel('Email').fill(TEST_EMAIL);
  10 |   await page.getByLabel('Password').fill(TEST_PASSWORD);
  11 |   await page.getByRole('button', { name: /sign up|register|cadastrar/i }).click();
  12 |   // Wait for redirect or success message
  13 |   await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
  14 | }
  15 |
  16 | test.describe('Authentication E2E', () => {
  17 |   test('login page loads and form is present', async ({ page }) => {
  18 |     await page.goto('/login');
  19 |     await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  20 |     await expect(page.getByLabel('Email')).toBeVisible();
  21 |     await expect(page.getByLabel('Password')).toBeVisible();
  22 |   });
  23 |
  24 |   test('can register a new user', async ({ page }) => {
  25 |     const uniqueEmail = `user${Date.now()}@example.com`;
  26 |     await page.goto('/signup');
  27 |     await page.getByLabel('Email').fill(uniqueEmail);
  28 |     await page.getByLabel('Password').fill(TEST_PASSWORD);
  29 |     await page.getByRole('button', { name: /sign up|register|cadastrar/i }).click();
  30 |     // Should redirect to login or show success
  31 |     await expect(page).toHaveURL(/login/);
  32 |   });
  33 |
  34 |   test('shows error on duplicate registration', async ({ page }) => {
  35 |     await registerTestUser(page);
  36 |     await page.goto('/signup');
  37 |     await page.getByLabel('Email').fill(TEST_EMAIL);
  38 |     await page.getByLabel('Password').fill(TEST_PASSWORD);
  39 |     await page.getByRole('button', { name: /sign up|register|cadastrar/i }).click();
  40 |     await expect(page.getByText(/already exists|já existe|duplicate/i)).toBeVisible();
  41 |   });
  42 |
  43 |   test('shows error on missing signup fields', async ({ page }) => {
  44 |     await page.goto('/signup');
  45 |     await page.getByRole('button', { name: /sign up|register|cadastrar/i }).click();
  46 |     await expect(page.getByText(/required|obrigatório/i)).toBeVisible();
  47 |   });
  48 |
  49 |   test('can login with valid credentials', async ({ page }) => {
  50 |     await registerTestUser(page);
  51 |     await page.goto('/login');
  52 |     await page.getByLabel('Email').fill(TEST_EMAIL);
  53 |     await page.getByLabel('Password').fill(TEST_PASSWORD);
  54 |     await page.getByRole('button', { name: /login|entrar/i }).click();
  55 |     // Should redirect to dashboard/home or show success
  56 |     await expect(page).not.toHaveURL(/login/);
  57 |   });
  58 |
  59 |   test('shows error on invalid login', async ({ page }) => {
  60 |     await page.goto('/login');
  61 |     await page.getByLabel('Email').fill('wrong@example.com');
  62 |     await page.getByLabel('Password').fill('wrongpassword');
  63 |     await page.getByRole('button', { name: /login|entrar/i }).click();
  64 |     await expect(page.getByText(/invalid|incorreto|not found/i)).toBeVisible();
  65 |   });
  66 |
  67 |   test('shows error on missing login fields', async ({ page }) => {
  68 |     await page.goto('/login');
> 69 |     await page.getByRole('button', { name: /login|entrar/i }).click();
     |                                                               ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: /login|entrar/i }) resolved to 2 elements:
  70 |     await expect(page.getByText(/required|obrigatório/i)).toBeVisible();
  71 |   });
  72 |
  73 |   test('auth error page loads', async ({ page }) => {
  74 |     await page.goto('/auth/auth-code-error');
  75 |     await expect(page.getByText(/error|invalid/i)).toBeVisible();
  76 |   });
  77 | }); 
```