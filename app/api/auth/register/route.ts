import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/lib/repositories";
import { z } from "zod";

// Esquema de validação para o registro
const registerSchema = z.object({
  name: z.string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome não pode ter mais que 100 caracteres")
    .trim(),
  email: z.string()
    .email("Email inválido")
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(50, "Senha não pode ter mais que 50 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número"),
  role: z.enum(["Admin", "Member"]).default("Member"),
  householdId: z.number().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Extrair dados da requisição
    const body = await request.json();
    
    // Validar dados
    const validationResult = registerSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dados inválidos",
          errors: validationResult.error.errors,
        },
        { status: 400 }
      );
    }
    
    const userData = validationResult.data;
    
    // Verificar se o email já está em uso
    const existingUser = await UserRepository.getByEmail(userData.email);
    
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Email já está em uso",
        },
        { status: 409 }
      );
    }
    
    // Criar o usuário
    const newUser = await UserRepository.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      householdId: userData.householdId,
      timezone: userData.timezone,
      language: userData.language,
    });
    
    // Remover senha do objeto de resposta
    const { password, ...userWithoutPassword } = newUser;
    
    return NextResponse.json(
      {
        success: true,
        message: "Usuário criado com sucesso",
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao criar usuário",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
} 