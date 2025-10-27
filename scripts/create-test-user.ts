/**
 * Script para criar um usuário de teste no Supabase
 * Este usuário não precisa confirmar email e pode ser usado imediatamente
 * 
 * Uso: npx tsx scripts/create-test-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

// Usar Service Role Key para bypassar confirmação de email
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TEST_USER = {
  email: 'teste@mealtime.dev',
  password: 'teste123456',
  fullName: 'Usuário de Teste',
  householdName: 'Casa de Teste'
};

async function createTestUser() {
  try {
    console.log('🔐 Criando usuário de teste no Supabase Auth...\n');
    console.log(`📧 Email: ${TEST_USER.email}`);
    console.log(`🔑 Senha: ${TEST_USER.password}\n`);

    // 1. Criar usuário no Supabase Auth (sem confirmação de email)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        full_name: TEST_USER.fullName,
      }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('⚠️  Usuário já existe no Supabase Auth');
        console.log('🔍 Buscando usuário existente...\n');
        
        // Buscar usuário existente
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === TEST_USER.email);
        
        if (existingUser) {
          console.log('✅ Usuário encontrado no Supabase!');
          authData.user = existingUser;
          
          // Verificar se existe no Prisma
          const prismaUser = await prisma.user.findUnique({
            where: { auth_id: existingUser.id }
          });
          
          if (prismaUser) {
            console.log('✅ Usuário já existe no Prisma também!');
            console.log('\n═══════════════════════════════════════════════════════');
            console.log('🎉 USUÁRIO DE TESTE PRONTO PARA USO!');
            console.log('═══════════════════════════════════════════════════════\n');
            console.log(`📧 Email:    ${TEST_USER.email}`);
            console.log(`🔑 Senha:    ${TEST_USER.password}`);
            console.log(`👤 Nome:     ${TEST_USER.fullName}`);
            console.log(`🆔 Auth ID:  ${existingUser.id}`);
            console.log(`🆔 User ID:  ${prismaUser.id}\n`);
            console.log('🧪 PARA TESTAR:');
            console.log(`   node scripts/test-mobile-auth.js ${TEST_USER.email} ${TEST_USER.password}\n`);
            await prisma.$disconnect();
            return;
          }
        } else {
          throw new Error('Não foi possível encontrar o usuário existente');
        }
      } else {
        throw authError;
      }
    }

    if (!authData.user) {
      throw new Error('Não foi possível criar o usuário no Supabase');
    }

    console.log(`✅ Usuário criado no Supabase Auth (ID: ${authData.user.id})\n`);

    // 2. Criar household
    console.log('🏠 Criando household...');
    const household = await prisma.households.create({
      data: {
        name: TEST_USER.householdName,
        description: 'Household de teste criado automaticamente',
        owner_id: authData.user.id,
      }
    });
    console.log(`✅ Household criado (ID: ${household.id})\n`);

    // 3. Criar perfil do usuário no Prisma
    console.log('👤 Criando perfil do usuário no Prisma...');
    const user = await prisma.user.create({
      data: {
        auth_id: authData.user.id,
        email: TEST_USER.email,
        full_name: TEST_USER.fullName,
        householdId: household.id,
      }
    });
    console.log(`✅ Perfil criado (ID: ${user.id})\n`);

    // 4. Adicionar usuário como membro do household
    console.log('👥 Adicionando usuário ao household...');
    await prisma.household_members.create({
      data: {
        user_id: user.id,
        household_id: household.id,
        role: 'owner',
      }
    });
    console.log('✅ Usuário adicionado como owner do household\n');

    // 5. Criar um gato de teste (opcional)
    console.log('🐱 Criando gato de teste...');
    const cat = await prisma.cats.create({
      data: {
        name: 'Miau de Teste',
        household_id: household.id,
        owner_id: user.id,
        birth_date: new Date('2020-01-01'),
        weight: 4.5,
      }
    });
    console.log(`✅ Gato criado (ID: ${cat.id}, Nome: ${cat.name})\n`);

    // Resumo final
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 USUÁRIO DE TESTE CRIADO COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 CREDENCIAIS:');
    console.log(`   📧 Email:    ${TEST_USER.email}`);
    console.log(`   🔑 Senha:    ${TEST_USER.password}`);
    console.log(`   👤 Nome:     ${TEST_USER.fullName}\n`);
    console.log('📊 IDs CRIADOS:');
    console.log(`   🆔 Auth ID:       ${authData.user.id}`);
    console.log(`   🆔 User ID:       ${user.id}`);
    console.log(`   🏠 Household ID:  ${household.id}`);
    console.log(`   🐱 Cat ID:        ${cat.id}\n`);
    console.log('🧪 PARA TESTAR A API:');
    console.log(`   node scripts/test-mobile-auth.js ${TEST_USER.email} ${TEST_USER.password}\n`);
    console.log('🌐 PARA FAZER LOGIN NO APP:');
    console.log(`   1. Acesse: http://localhost:3000/login`);
    console.log(`   2. Use as credenciais acima\n`);

  } catch (error: any) {
    console.error('\n❌ Erro ao criar usuário de teste:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();

