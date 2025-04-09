import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { validateSettings, validateName, validateTimezone, validateLanguage } from "@/lib/validations/settings"
import { headers } from 'next/headers'
import { withError } from "@/lib/utils/api-middleware"

// Wrap the GET handler with withError middleware
export const GET = withError(async () => {
  try {
    console.log("[Settings API] Request received");
    // const headersList = headers(); // Removed problematic headers access
    // console.log("[Settings API] Request headers sample:", { 
    //   'content-type': headersList.get('content-type'),
    //   'user-agent': headersList.get('user-agent'),
    //   'referer': headersList.get('referer')
    // });

    console.log("[Settings API] Getting session");
    const session = await getServerSession(authOptions);
    
    console.log("[Settings API] Session details:", { 
      authenticated: !!session, 
      hasUser: !!session?.user,
      email: session?.user?.email,
      expires: session?.expires
    });
    
    if (!session || !session.user || new Date(session.expires) < new Date()) {
      console.log("[Settings API] Invalid or expired session");
      return NextResponse.json(
        { error: "Sessão inválida ou expirada" },
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!session.user?.email) {
      console.log("[Settings API] No user email in session");
      return NextResponse.json(
        { error: "Email do usuário não encontrado na sessão" },
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log("[Settings API] Finding user by email:", session.user.email);
    let user;
    try {
      user = await prisma.user.findUnique({
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
      });
      console.log("[Settings API] Prisma query result:", JSON.stringify(user, null, 2));
    } catch (dbError) {
      console.error("[Settings API] Database error:", dbError);
      return NextResponse.json(
        { error: "Erro ao buscar dados do usuário no banco de dados" },
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (user) {
        console.log(`[Settings API] User found. ID: ${user.id}, Household ID from DB: ${user.householdId}`);
    } else {
        console.log("[Settings API] User object is null/undefined after Prisma query.");
    }

    if (!user) {
      console.log("[Settings API] User not found in database");
      return NextResponse.json(
        { error: "Usuário não encontrado no banco de dados" },
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Format the response to include preferences
    const response = {
      ...user,
      preferences: {
        timezone: user.timezone || "UTC",
        language: user.language || "pt-BR",
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
          feedingReminders: true,
          missedFeedingAlerts: true,
          householdUpdates: true
        }
      }
    };

    console.log('[Settings API] User data being returned:', JSON.stringify(response, null, 2));
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("[Settings API] Unhandled error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

export async function PUT(request: Request) {
  try {
    console.log("[Settings API] Getting session for PUT");
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log("[Settings API] No authenticated user for PUT");
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log("[Settings API] Received PUT data:", body);
    const { name, timezone, language } = body

    // Validação do nome
    const nameValidation = validateName(name)
    if (!nameValidation.success) {
      console.log("[Settings API] Name validation failed:", nameValidation.message);
      return NextResponse.json(
        { error: nameValidation.message },
        { status: 400 }
      )
    }

    // Validação do timezone
    const timezoneValidation = validateTimezone(timezone)
    if (!timezoneValidation.success) {
      console.log("[Settings API] Timezone validation failed:", timezoneValidation.message);
      return NextResponse.json(
        { error: timezoneValidation.message },
        { status: 400 }
      )
    }

    // Validação do idioma
    const languageValidation = validateLanguage(language)
    if (!languageValidation.success) {
      console.log("[Settings API] Language validation failed:", languageValidation.message);
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
      console.log("[Settings API] Settings validation failed:", settingsValidation.errors);
      return NextResponse.json(
        { errors: settingsValidation.errors },
        { status: 400 }
      )
    }

    console.log("[Settings API] Updating user:", session.user.email);
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

    // Format the response to include preferences
    const response = {
      ...updatedUser,
      preferences: {
        timezone: updatedUser.timezone || "UTC",
        language: updatedUser.language || "pt-BR",
        notifications: {
          pushEnabled: false,
          emailEnabled: false,
          feedingReminders: true,
          missedFeedingAlerts: true,
          householdUpdates: true
        }
      }
    }

    console.log("[Settings API] Updated user data:", response);
    return NextResponse.json(response)
  } catch (error) {
    console.error("[Settings API] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
} 