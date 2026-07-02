# MealTime

MealTime é um aplicativo para gerenciar a alimentação dos seus gatos, permitindo registrar, agendar e monitorar refeições.

## Funcionalidades

- 🐱 Gerenciamento de gatos
- 🍽️ Registro de alimentações
- ⏰ Agendamentos e lembretes
- 🏠 Múltiplas residências
- 📱 Notificações push
- 📊 Estatísticas e relatórios
- 🌙 Tema claro/escuro

## Tecnologias

- Next.js 16
- React 19
- TypeScript 5.9
- Prisma 7
- Supabase Auth
- TanStack Query
- TailwindCSS 3
- Shadcn UI

## Começando

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/mealtime-app.git
cd mealtime-app
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

4. Execute as migrações
```bash
npx prisma migrate dev
```

5. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

## Documentação

- [Arquitetura](docs/architecture/README.md)
- [API](docs/api/README.md)
- [Desenvolvimento](docs/development/README.md)
- [Features](docs/features/README.md)

## Contribuindo

Veja nosso [guia de contribuição](CONTRIBUTING.md) para começar.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## E2E Testing with Playwright

This project uses [Playwright](https://playwright.dev/) for end-to-end (E2E) testing.

### Setup

1. Install dependencies:
   ```bash
   npm install
   npm install --save-dev playwright @playwright/test
   npx playwright install
   ```

2. (Optional) If you see missing library errors, install the required system libraries for your OS (see Playwright docs).

### Running E2E Tests

- To run all E2E tests:
  ```bash
  npx playwright test
  ```
- To open the Playwright test runner UI:
  ```bash
  npx playwright test --ui
  ```

### Writing E2E Tests
- Place E2E tests in the `e2e/` directory at the project root (create it if it doesn't exist).
- Use `.spec.ts` or `.test.ts` extensions for Playwright tests.

### Troubleshooting
- If browsers fail to launch, check for missing system dependencies (see Playwright's [installation docs](https://playwright.dev/docs/intro)).
- For Linux, you may need to install additional libraries (see Playwright's output for details).

## Scheduled Notifications & Cron Job

MealTime uses a background cron job to trigger scheduled notifications (e.g., feeding reminders). This is required for notifications to be delivered after a scheduled interval.

### Local/Development

To run the notification cron job locally, open a separate terminal and run:

```bash
npm run cron
```

This will start a background process that checks and sends scheduled notifications every 5 minutes.

### Production/Deployment

Most serverless platforms (like Vercel) do **not** support persistent background jobs. You must use an external scheduler (such as GitHub Actions, cron-job.org, or a server-side cron) to periodically call the following endpoint:

```
GET /api/notifications/feeding-check
```

Call this endpoint every 5 minutes to ensure scheduled notifications are processed.
