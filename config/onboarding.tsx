import { Step } from 'onborda';

interface Tour {
  tour: string;
  steps: Step[];
}

export const onboardingSteps: Tour[] = [
  {
    tour: "first-visit",
    steps: [
      {
        icon: "👋",
        title: "Bem-vindo ao MealTime",
        content: "Vamos fazer um tour rápido para você aprender a gerenciar a alimentação dos seus gatos.",
        selector: "#tour-root-home",
        side: "top",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "🐱",
        title: "Seus Gatos",
        content: "Aqui você gerencia o perfil e dados de cada gato.",
        selector: "#tour-root-cats",
        side: "top",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "🏠",
        title: "Domicílios",
        content: "Gerencie quem tem acesso aos dados dos seus gatos.",
        selector: "#tour-root-households",
        side: "top",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "📅",
        title: "Agenda",
        content: "Visualize e gerencie os horários de alimentação.",
        selector: "#tour-root-schedules",
        side: "top",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "⚖️",
        title: "Peso",
        content: "Acompanhe o peso dos seus gatos ao longo do tempo.",
        selector: "#tour-root-weight",
        side: "top",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "📊",
        title: "Estatísticas",
        content: "Visualize gráficos e tendências sobre a alimentação.",
        selector: "#tour-root-statistics",
        side: "top",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
    ]
  },
  {
    tour: "weight-page",
    steps: [
      {
        icon: "👋",
        title: "Bem-vindo ao Rastreamento de Peso!",
        content: "Vamos passar rapidamente pelos principais recursos para ajudar você a monitorar o peso do seu gato.",
        selector: "#weight-header",
        side: "bottom",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "📊",
        title: "Visão Geral do Painel",
        content: "Selecione seu gato e visualize o status atual, metas de peso e gráfico de tendências.",
        selector: "#weight-cat-selector",
        side: "right",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "➕",
        title: "Registrando Novos Pesos",
        content: "Use o botão '+' no canto inferior direito para registrar rapidamente um novo peso.",
        selector: "#weight-add-button",
        side: "top",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "📈",
        title: "Acompanhando o Progresso",
        content: "O gráfico visualiza as tendências de peso ao longo do tempo.",
        selector: "#weight-trend-chart",
        side: "left",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "📋",
        title: "Visualizando o Histórico",
        content: "A lista de histórico mostra todos os pesos registrados.",
        selector: "#weight-history",
        side: "top",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
      {
        icon: "✅",
        title: "Pronto para Começar!",
        content: "Tudo pronto para acompanhar o peso dos seus gatos.",
        selector: "#weight-history",
        side: "top",
        showControls: true,
        pointerPadding: 10,
        pointerRadius: 24,
      },
    ]
  }
];
