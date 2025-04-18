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

- Next.js 14
- React
- TypeScript
- Prisma
- TailwindCSS
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
