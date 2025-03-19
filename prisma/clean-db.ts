// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  console.log('Iniciando limpeza do banco de dados...');

  try {
    // Limpar os dados em ordem para respeitar as relações de chave estrangeira
    console.log('Removendo registros de alimentação...');
    await prisma.feedingLog.deleteMany();
    
    // Verificar se o modelo Notification existe
    if ('notification' in prisma) {
      console.log('Removendo notificações...');
      await prisma.$queryRaw`DELETE FROM Notification`;
    }
    
    console.log('Removendo agendamentos...');
    await prisma.schedule.deleteMany();
    
    console.log('Removendo gatos dos grupos...');
    // Primeiro precisamos desassociar os gatos dos grupos antes de excluí-los
    // Como estamos usando uma tabela de relacionamento, isso acontece automaticamente quando
    // excluímos os registros
    
    console.log('Removendo gatos...');
    await prisma.cat.deleteMany();
    
    console.log('Removendo grupos de gatos...');
    await prisma.catGroup.deleteMany();
    
    console.log('Removendo usuários...');
    await prisma.user.deleteMany();
    
    console.log('Removendo domicílios...');
    await prisma.household.deleteMany();

    console.log('✅ Banco de dados limpo com sucesso!');
  } catch (error) {
    console.error('Erro ao limpar o banco de dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clean(); 