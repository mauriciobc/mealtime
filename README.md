# MealTime

MealTime é um aplicativo de gerenciamento de alimentação de gatos que ajuda famílias a coordenar a rotina de alimentação de seus felinos.

## Tecnologias Utilizadas

- Backend: Node.js com Express
- Frontend: React Native
- Banco de Dados: SQLite
- Comunicação em Tempo Real: Socket.IO

## Pré-requisitos

- Node.js 18.x ou superior
- npm 9.x ou superior
- React Native CLI
- Android Studio (para desenvolvimento Android)
- Xcode (para desenvolvimento iOS - apenas macOS)

## Estrutura do Projeto

```
mealtime/
├── src/
│   ├── config/         # Configurações do banco e outras
│   ├── controllers/    # Controladores da API
│   ├── models/         # Modelos do banco de dados
│   ├── routes/         # Rotas da API
│   ├── services/       # Lógica de negócios
│   └── utils/          # Utilitários e helpers
├── .env                # Variáveis de ambiente
├── package.json        # Dependências do projeto
└── README.md          # Este arquivo
```

## Instalação

1. Clone o repositório:
```bash
git clone [url-do-repositorio]
cd mealtime
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
- Copie o arquivo `.env.example` para `.env`
- Ajuste as variáveis conforme necessário

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Scripts Disponíveis

- `npm start`: Inicia o servidor em produção
- `npm run dev`: Inicia o servidor em modo desenvolvimento
- `npm test`: Executa os testes

## Desenvolvimento

### Banco de Dados

O banco SQLite é inicializado automaticamente na primeira execução. As tabelas são:

- `households`: Gerenciamento de domicílios
- `users`: Usuários e suas configurações
- `cats`: Perfis dos gatos
- `cat_groups`: Grupos de gatos
- `schedules`: Agendamentos de alimentação
- `feeding_logs`: Registros de alimentação

### API Endpoints

A documentação completa da API estará disponível em `/api-docs` quando o servidor estiver rodando.

## Contribuição

1. Crie uma branch para sua feature: `git checkout -b feature/nome-da-feature`
2. Commit suas mudanças: `git commit -m 'feat: Adiciona nova feature'`
3. Push para a branch: `git push origin feature/nome-da-feature`
4. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes. 