/**
 * Script para debugar um usuário específico
 * Verifica se ele existe no Supabase Auth e no Prisma
 * 
 * Uso: npx tsx scripts/debug-user.ts email@exemplo.com
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugUser(email: string) {
  try {
    console.log(`\n🔍 INVESTIGANDO USUÁRIO: ${email}\n`);
    console.log('═'.repeat(60));

    // 1. Verificar no Supabase Auth
    console.log('\n📋 PARTE 1: Verificando Supabase Auth...\n');
    
    const { data: users } = await supabase.auth.admin.listUsers();
    const authUser = users.users.find(u => u.email === email);

    if (!authUser) {
      console.log('❌ Usuário NÃO ENCONTRADO no Supabase Auth');
      console.log('\n💡 SOLUÇÃO: Crie o usuário no Supabase primeiro');
      console.log('   1. Acesse: http://localhost:3000/signup');
      console.log('   2. Ou use: npx tsx scripts/create-test-user.ts\n');
      return;
    }

    console.log('✅ Usuário ENCONTRADO no Supabase Auth!');
    console.log(`   ID:                ${authUser.id}`);
    console.log(`   Email:             ${authUser.email}`);
    console.log(`   Email Confirmado:  ${authUser.email_confirmed_at ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   Criado em:         ${authUser.created_at}`);
    console.log(`   Último login:      ${authUser.last_sign_in_at || 'Nunca'}`);

    // 2. Verificar no Prisma (tabela profiles)
    console.log('\n📋 PARTE 2: Verificando tabela `profiles` no Prisma...\n');
    
    const prismaUser = await prisma.profiles.findUnique({
      where: { id: authUser.id },
      include: {
        household_members: {
          include: {
            household: {
              include: {
                household_members: {
                  select: {
                    role: true,
                    user: {
                      select: {
                        id: true,
                        full_name: true,
                        email: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!prismaUser) {
      console.log('❌ Usuário NÃO ENCONTRADO na tabela `profiles` do Prisma!');
      console.log('\n🔥 ESTE É O PROBLEMA!');
      console.log('   O usuário existe no Supabase Auth mas não no Prisma.');
      console.log('\n💡 SOLUÇÃO: Criar o registro do usuário no Prisma\n');
      
      // Oferecer criar automaticamente
      console.log('🤖 Vou criar o registro no Prisma agora...');
      console.log('   Aguardando 3 segundos (pressione Ctrl+C para cancelar)...\n');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('📝 Criando perfil no Prisma...\n');
      
      // Criar perfil
      const newProfile = await prisma.profiles.create({
        data: {
          id: authUser.id,
          email: authUser.email!,
          full_name: authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
          username: authUser.email!.split('@')[0],
        }
      });
      console.log(`✅ Perfil criado no Prisma (ID: ${newProfile.id})`);
      
      // Criar household
      const household = await prisma.households.create({
        data: {
          name: `Casa de ${authUser.email}`,
          description: 'Household criado automaticamente',
          owner_id: authUser.id,
        }
      });
      console.log(`✅ Household criado (ID: ${household.id})`);
      
      // Adicionar como membro
      await prisma.household_members.create({
        data: {
          user_id: authUser.id,
          household_id: household.id,
          role: 'owner',
        }
      });
      console.log(`✅ Usuário adicionado ao household como owner\n`);
      
      console.log('═'.repeat(60));
      console.log('🎉 PROBLEMA RESOLVIDO!');
      console.log('═'.repeat(60));
      console.log('\n🧪 TESTE AGORA:');
      console.log(`   node scripts/test-mobile-auth.js ${email} <sua_senha>\n`);
      
      return;
    }

    console.log('✅ Usuário ENCONTRADO na tabela `profiles` do Prisma!');
    console.log(`   ID:          ${prismaUser.id}`);
    console.log(`   Email:       ${prismaUser.email || 'N/A'}`);
    console.log(`   Nome:        ${prismaUser.full_name || 'N/A'}`);
    console.log(`   Username:    ${prismaUser.username || 'N/A'}`);

    // 3. Verificar household memberships
    if (prismaUser.household_members && prismaUser.household_members.length > 0) {
      console.log('\n📋 PARTE 3: Verificando Households...\n');
      console.log(`✅ Usuário é membro de ${prismaUser.household_members.length} household(s)!`);
      
      prismaUser.household_members.forEach((membership, idx) => {
        console.log(`\n🏠 Household ${idx + 1}:`);
        console.log(`   ID:          ${membership.household.id}`);
        console.log(`   Nome:        ${membership.household.name}`);
        console.log(`   Seu Role:    ${membership.role}`);
        console.log(`   Membros:     ${membership.household.household_members.length}`);
        
        if (membership.household.household_members.length > 0) {
          console.log('   \n   👥 Todos os Membros:');
          membership.household.household_members.forEach((member, i) => {
            console.log(`      ${i + 1}. ${member.user?.full_name || 'N/A'}`);
            console.log(`         Email: ${member.user?.email || 'N/A'}`);
            console.log(`         Role:  ${member.role || 'N/A'}`);
          });
        }
      });
    } else {
      console.log('\n📋 PARTE 3: Verificando Households...\n');
      console.log('⚠️  Usuário NÃO É MEMBRO de nenhum household');
      console.log('   Isso pode causar problemas na API mobile!');
    }

    // 4. Testar autenticação
    console.log('\n📋 PARTE 4: Testando Autenticação...\n');
    console.log('ℹ️  Para testar o login, você precisa fornecer a senha.');
    console.log('   O script não pode testar sem a senha.\n');
    
    console.log('═'.repeat(60));
    console.log('✅ TUDO PARECE ESTAR CORRETO!');
    console.log('═'.repeat(60));
    console.log('\n🧪 TESTE O LOGIN:');
    console.log(`   node scripts/test-mobile-auth.js ${email} <sua_senha>`);
    console.log('\n💡 Se ainda assim não funcionar, verifique:');
    console.log('   1. A senha está correta?');
    console.log('   2. O servidor está rodando? (http://localhost:3000)');
    console.log('   3. Há erros no console do servidor?\n');

  } catch (error: any) {
    console.error('\n❌ Erro ao debugar usuário:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Pegar email dos argumentos
const email = process.argv[2];

if (!email) {
  console.log('❌ Por favor, forneça um email:');
  console.log('   npx tsx scripts/debug-user.ts seu@email.com\n');
  process.exit(1);
}

debugUser(email);

