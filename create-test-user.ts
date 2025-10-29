import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

const prisma = new PrismaClient();

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Test@123456';
  const testFullName = 'Test User';
  const householdName = 'Casa de Teste';

  console.log('Criando usuário de teste...');
  console.log('Email:', testEmail);
  console.log('Password:', testPassword);

  // Criar usuário via Admin API (não requer confirmação de email)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true, // Confirmar email automaticamente
    user_metadata: {
      full_name: testFullName
    }
  });

  if (authError || !authData.user) {
    console.error('Erro ao criar usuário:', authError);
    process.exit(1);
  }

  console.log('✓ Usuário criado no Supabase Auth');
  console.log('User ID:', authData.user.id);

  // Criar perfil no Prisma
  try {
    const profile = await prisma.profiles.create({
      data: {
        id: authData.user.id,
        email: testEmail,
        full_name: testFullName,
      }
    });

    console.log('✓ Perfil criado no Prisma');

    // Criar household e adicionar usuário como membro
    const household = await prisma.households.create({
      data: {
        name: householdName,
        owner_id: profile.id,
        household_members: {
          create: {
            user_id: profile.id,
            role: 'admin'
          }
        }
      }
    });

    console.log('✓ Household criado:', household.id);

    // Fazer login para obter tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (sessionError || !sessionData.session) {
      console.error('Erro ao fazer login:', sessionError);
      process.exit(1);
    }

    console.log('\n========================================');
    console.log('USUÁRIO DE TESTE CRIADO COM SUCESSO!');
    console.log('========================================');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('User ID:', profile.id);
    console.log('Household ID:', household.id);
    console.log('Access Token:', sessionData.session.access_token);
    console.log('========================================\n');

    // Salvar em arquivo para uso nos testes
    const fs = await import('fs');
    fs.writeFileSync('.test-credentials.json', JSON.stringify({
      email: testEmail,
      password: testPassword,
      userId: profile.id,
      householdId: household.id,
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token
    }, null, 2));

    console.log('✓ Credenciais salvas em .test-credentials.json');

  } catch (error) {
    console.error('Erro ao criar dados no Prisma:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser().catch(console.error);

