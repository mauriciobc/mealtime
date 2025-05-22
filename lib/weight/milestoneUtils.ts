// Utilitários para cálculo de marcos de perda de peso segura para gatos
// Todos os textos e comentários em português brasileiro

import { Milestone } from '@/app/weight/page'; // Ajuste o caminho se necessário

/**
 * Calcula a idade do gato em anos completos a partir da data de nascimento (ISO string)
 */
export function calcularIdadeEmAnos(dataNascimento: string): number {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

/**
 * Retorna a taxa segura de perda de peso semanal para gatos
 * Gatos < 7 anos: até 1% por semana
 * Gatos >= 7 anos: até 0,5% por semana
 */
export function obterTaxaSegura(idadeAnos: number): number {
  return idadeAnos >= 7 ? 0.005 : 0.01;
}

/**
 * Gera os marcos (milestones) de perda de peso a cada 2 semanas
 * @param pesoAtual Peso inicial do gato (kg)
 * @param pesoMeta Peso alvo (kg)
 * @param idadeAnos Idade do gato em anos
 * @param dataInicio Data de início da meta (ISO string)
 * @returns Array de marcos
 */
export function gerarMarcos(
  pesoAtual: number,
  pesoMeta: number,
  idadeAnos: number,
  dataInicio: string
): Milestone[] {
  const taxaSegura = obterTaxaSegura(idadeAnos);
  const marcos: Milestone[] = [];
  let peso = pesoAtual;
  let data = new Date(dataInicio);
  let indice = 1;

  while (peso > pesoMeta) {
    // Calcula perda máxima para 2 semanas
    const perda = peso * taxaSegura * 2;
    let novoPeso = peso - perda;
    if (novoPeso < pesoMeta) {
      novoPeso = pesoMeta;
    }
    novoPeso = Math.round(novoPeso * 10) / 10; // 1 casa decimal

    // Avança 2 semanas
    data.setDate(data.getDate() + 14);
    const dataMarco = data.toISOString().split('T')[0];

    marcos.push({
      id: `marco-${indice}`,
      name: `Marco ${indice}`,
      target_weight: novoPeso,
      target_date: dataMarco,
      description: `Alvo: ${novoPeso}kg até ${dataMarco}`,
    });

    peso = novoPeso;
    indice++;
    if (peso <= pesoMeta) break;
  }

  return marcos;
} 