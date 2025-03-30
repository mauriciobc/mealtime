import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { validateSettings, validateName, validateTimezone, validateLanguage } from "@/lib/validations/settings"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        language: true,
        role: true,
        householdId: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    console.log('User from database:', user);
    return NextResponse.json(user)
  } catch (error) {
    console.error("Erro ao buscar configurações:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, timezone, language } = body

    // Validação do nome
    const nameValidation = validateName(name)
    if (!nameValidation.success) {
      return NextResponse.json(
        { error: nameValidation.message },
        { status: 400 }
      )
    }

    // Validação do timezone
    const timezoneValidation = validateTimezone(timezone)
    if (!timezoneValidation.success) {
      return NextResponse.json(
        { error: timezoneValidation.message },
        { status: 400 }
      )
    }

    // Validação do idioma
    const languageValidation = validateLanguage(language)
    if (!languageValidation.success) {
      return NextResponse.json(
        { error: languageValidation.message },
        { status: 400 }
      )
    }

    // Validação completa das configurações
    const settingsValidation = validateSettings({
      name: name.trim(),
      timezone,
      language,
      notifications: {
        pushEnabled: false,
        emailEnabled: false,
        feedingReminders: true,
        missedFeedingAlerts: true,
        householdUpdates: true
      }
    })

    if (!settingsValidation.success) {
      return NextResponse.json(
        { errors: settingsValidation.errors },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name.trim(),
        timezone: timezone || "UTC",
        language: language || "pt-BR"
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        language: true,
        role: true,
        householdId: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 