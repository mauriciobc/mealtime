import { FeedingLog, Cat } from "@/lib/types";

interface FeedingStatistics {
  totalFeedings: number;
  averagePortionSize: number;
  maxConsecutiveDays: number;
  missedSchedules: number;
  timeSeriesData: Array<{ name: string; valor: number }>;
  catPortionData: Array<{ name: string; value: number }>;
  timeDistributionData: Array<{ name: string; valor: number }>;
}

/**
 * Busca estatísticas de alimentação com base nos critérios fornecidos
 */
export async function getFeedingStatistics(
  period: string = "7dias", 
  catId: string = "todos"
): Promise<FeedingStatistics> {
  try {
    // Em produção, esta seria uma chamada real à API
    // const response = await fetch(`/api/statistics?period=${period}&catId=${catId}`);
    // const data = await response.json();
    
    // Por enquanto, retornamos dados vazios
    // Os dados reais serão processados na página de estatísticas
    return {
      totalFeedings: 0,
      averagePortionSize: 0,
      maxConsecutiveDays: 0,
      missedSchedules: 0,
      timeSeriesData: [],
      catPortionData: [],
      timeDistributionData: [],
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    throw new Error("Falha ao buscar estatísticas de alimentação");
  }
} 