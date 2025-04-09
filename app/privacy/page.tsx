import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | MealTime",
  description: "Política de privacidade do MealTime",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
      
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-lg mb-4">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Coleta de Informações</h2>
          <p>
            Coletamos informações que você nos fornece diretamente ao usar o MealTime,
            incluindo informações de registro, preferências e dados de uso do serviço.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Uso das Informações</h2>
          <p>
            Utilizamos suas informações para fornecer, manter e melhorar nossos serviços,
            personalizar sua experiência e enviar atualizações importantes sobre o serviço.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Compartilhamento de Dados</h2>
          <p>
            Não vendemos suas informações pessoais. Compartilhamos dados apenas quando
            necessário para fornecer o serviço ou quando exigido por lei.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Segurança</h2>
          <p>
            Implementamos medidas de segurança para proteger suas informações contra
            acesso não autorizado, alteração, divulgação ou destruição.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Seus Direitos</h2>
          <p>
            Você tem o direito de acessar, corrigir ou excluir suas informações pessoais.
            Para exercer esses direitos, entre em contato conosco através dos canais oficiais.
          </p>
        </section>
      </div>
    </div>
  );
} 