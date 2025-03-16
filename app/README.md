# MealTime App Frontend

Frontend para o aplicativo MealTime, desenvolvido com React Native seguindo um design moderno e minimalista.

## Estrutura do Projeto

```
app/
├── assets/         # Imagens, fontes e outros recursos estáticos
├── components/     # Componentes reutilizáveis da UI
├── hooks/          # Hooks personalizados
├── navigation/     # Configuração de navegação entre telas
├── screens/        # Telas do aplicativo
├── store/          # Gerenciamento de estado global
├── styles/         # Estilos compartilhados
└── themes/         # Temas, cores, tipografia e espaçamento
```

## Componentes Principais

### UI Components
- `Card.js` - Componente base para cartões com sombras e animações
- `Button.js` - Botão customizável com variantes primary, secondary e text
- `Typography.js` - Componentes de texto padronizados (Heading, Title, Body, Caption)
- `MoodSelector.js` - Seletor de humor com emojis
- `ProgressBar.js` - Barra de progresso animada

### Telas
- `DailyReflectionScreen.js` - Tela de reflexão diária com seletor de humor e progresso
- `ExercisesScreen.js` - Tela de exercícios baseados nas necessidades do usuário

## Tema e Estilo

O aplicativo utiliza um sistema de design consistente:

- Paleta de cores pastéis e neutras
- Tipografia limpa e legível
- Bordas arredondadas
- Animações suaves com framer-motion
- Espaçamento consistente

## Como Executar

Para executar o aplicativo:

```bash
# Na raiz do projeto
npm run start-app

# Em outro terminal, para Android
npm run android

# Ou para iOS
npm run ios
```

## Personalização

O tema do aplicativo pode ser facilmente personalizado nos arquivos:

- `themes/colors.js` - Paleta de cores
- `themes/typography.js` - Fontes e tamanhos de texto
- `themes/spacing.js` - Espaçamento e raios de borda