# Checklist de Melhorias - Página de Configurações

## Backend e Dados
- [x] Implementar persistência de dados no backend
  - [x] Criar rota de API para configurações
  - [x] Implementar GET para buscar configurações
  - [x] Implementar PUT para atualizar configurações
  - [x] Integrar com o frontend
  - [x] Adicionar tratamento de erros básico
- [x] Adicionar validação robusta de dados
  - [x] Criar schema de validação com Zod
  - [x] Implementar validações específicas para cada campo
  - [x] Adicionar validação de timezone e idioma
  - [x] Integrar validações no backend
  - [x] Atualizar frontend para lidar com erros de validação
- [ ] Implementar tratamento de erros
- [ ] Implementar cache de configurações

## UX/UI
- [ ] Adicionar confirmações para ações críticas
- [ ] Melhorar feedback visual durante operações
- [ ] Adicionar suporte a temas personalizados

## Qualidade
- [ ] Adicionar testes unitários
- [ ] Adicionar testes de integração
- [ ] Implementar monitoramento de erros

## Documentação
- [ ] Atualizar documentação da API
- [ ] Adicionar comentários no código
- [ ] Criar guia de contribuição

## Segurança
- [ ] Implementar rate limiting
- [ ] Adicionar validação de permissões
- [ ] Implementar auditoria de mudanças

## Gerenciamento de Imagens
- [x] Implementar sistema de otimização de imagens
  - [x] Configurar Sharp para processamento de imagens
    - [x] Instalar dependência: `npm install sharp`
    - [x] Criar utilitário em `src/lib/image-processing.ts`
    - [x] Implementar funções de redimensionamento e otimização
  - [x] Definir padrões de tamanho
    - [x] Perfil de usuário: 400x400px
    - [x] Perfil de gato: 300x300px
    - [x] Thumbnails: 150x150px
  - [x] Configurar limites de upload
    - [x] Tamanho máximo: 5MB
    - [x] Formatos permitidos: JPG, PNG, WebP
  - [x] Implementar validação de imagens
    - [x] Verificar dimensões mínimas
    - [x] Validar tipos MIME
    - [x] Detectar imagens corrompidas
- [x] Configurar armazenamento
  - [x] Criar estrutura de pastas organizada
    - [x] `/public/profiles/humans/`
    - [x] `/public/profiles/cats/`
    - [x] `/public/profiles/thumbnails/`
  - [x] Implementar sistema de nomes de arquivo únicos
  - [x] Configurar limpeza automática de arquivos temporários
- [x] Atualizar componentes existentes
  - [x] Modificar `src/components/ProfileImage.tsx`
  - [x] Atualizar `src/components/CatProfile.tsx`
  - [x] Implementar lazy loading de imagens
  - [x] Adicionar placeholders durante carregamento
- [x] Implementar cache de imagens
  - [x] Configurar cache no servidor
  - [x] Implementar cache no cliente
  - [x] Definir políticas de expiração
- [x] Adicionar tratamento de erros
  - [x] Implementar fallback para imagens quebradas
  - [x] Adicionar mensagens de erro amigáveis
  - [x] Implementar retry mechanism para uploads falhos
- [x] Documentação
  - [x] Criar guia de uso do sistema de imagens
  - [x] Documentar limites e restrições
  - [x] Adicionar exemplos de implementação
  - [ ] Adicionar diagramas de fluxo
  - [ ] Criar guia de contribuição específico para o sistema de imagens
  - [ ] Documentar procedimentos de backup e recuperação
  - [ ] Adicionar exemplos de casos de uso específicos

## PWA (Progressive Web App)
- [ ] Configurar manifest.json
  - [ ] Criar arquivo em `/public/manifest.json`
  - [ ] Definir metadados básicos
    - [ ] Nome e nome curto do app
    - [ ] Descrição
    - [ ] Cores de tema e fundo
    - [ ] URL inicial
  - [ ] Configurar ícones
    - [ ] Gerar ícones em múltiplos tamanhos (192x192, 512x512)
    - [ ] Adicionar ícones no manifest
    - [ ] Configurar máscaras de ícone para iOS
  - [ ] Adicionar link no `app/layout.tsx`
    ```tsx
    <link rel="manifest" href="/manifest.json" />
    ```

- [ ] Implementar Service Worker
  - [ ] Criar arquivo em `/public/sw.js`
  - [ ] Configurar cache de assets
    - [ ] Definir estratégia de cache (Cache First para assets estáticos)
    - [ ] Listar recursos para cache
    - [ ] Implementar atualização de cache
  - [ ] Adicionar registro no `app/layout.tsx`
    ```tsx
    useEffect(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => console.log('SW registered:', registration))
          .catch(error => console.log('SW registration failed:', error));
      }
    }, []);
    ```

- [ ] Otimizar para PWA
  - [ ] Configurar meta tags no `app/layout.tsx`
    ```tsx
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="MealTime" />
    ```
  - [ ] Implementar fallback offline
    - [ ] Criar página offline em `/app/offline/page.tsx`
    - [ ] Configurar service worker para servir página offline
  - [ ] Otimizar performance
    - [ ] Implementar lazy loading de componentes
    - [ ] Configurar cache de rotas
    - [ ] Otimizar carregamento de imagens

- [ ] Testar e Validar
  - [ ] Verificar Lighthouse score
  - [ ] Testar instalação em diferentes dispositivos
  - [ ] Validar funcionamento offline
  - [ ] Testar atualizações de cache
  - [ ] Verificar compatibilidade cross-browser

- [ ] Documentação
  - [ ] Criar guia de desenvolvimento PWA
  - [ ] Documentar processo de atualização
  - [ ] Adicionar instruções de debug
  - [ ] Criar checklist de validação 

# Notification Refactor

## Refined Implementation Plan for Web Push Notifications

**(Incorporating Tech Lead Review)**

**Phase 1: Setup & Configuration**

1.  **Install Dependencies:**
    ```bash
    npm install web-push --save
    npm install zod --save-dev # For request validation
    ```

2.  **Generate VAPID Keys:**
    *   Create/Update `scripts/generate-vapid-keys.js`:
        ```javascript
        const webpush = require('web-push');
        const fs = require('fs');
        const path = require('path');
        
        const envPath = path.resolve(__dirname, '../.env');
        let envContent = '';
        
        try {
          envContent = fs.readFileSync(envPath, 'utf8');
        } catch (err) {
          console.log('.env file not found, creating one.');
        }
        
        if (envContent.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY=') && envContent.includes('VAPID_PRIVATE_KEY=')) {
          console.log('VAPID keys already exist in .env file. Skipping generation.');
        } else {
          const vapidKeys = webpush.generateVAPIDKeys();
          const newEnvVars = `
        # --- Web Push VAPID Keys ---
        NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
        VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
        # --- End Web Push VAPID Keys ---
        `;
        
          fs.appendFileSync(envPath, newEnvVars);
          console.log('VAPID keys generated and added to .env file.');
        }
        ```
    *   Run the script: `node scripts/generate-vapid-keys.js`
    *   **CRITICAL:** Verify `.env` is present in your `.gitignore` file. If not, add it immediately.
    *   Update `VAPID_MAILTO` in `.env` (or directly in the code where `setVapidDetails` is called) with a real monitoring email address:
        ```env
        VAPID_MAILTO=mailto:your-monitoring-email@yourdomain.com
        ```

**Phase 2: Service Worker Implementation**

3.  **Create/Update Service Worker (`public/service-worker.js`):**
    ```javascript
    // Basic install/activate for lifecycle management and debugging
    self.addEventListener('install', event => {
      console.log('Service Worker installing.');
      // Optional: self.skipWaiting(); // Force immediate activation
    });
    
    self.addEventListener('activate', event => {
      console.log('Service Worker activating.');
      // Optional: event.waitUntil(clients.claim()); // Take control immediately
    });
    
    self.addEventListener('push', function(event) {
      console.log('[Service Worker] Push Received.');
      let notificationData = { title: 'MealTime Notification', body: 'You have a new notification.' };
      try {
        const data = event.data.json(); // Expecting JSON payload now
        notificationData.title = data.title || notificationData.title;
        notificationData.body = data.body || notificationData.body;
        notificationData.data = data.data || {}; // Include any extra data
      } catch (e) {
        console.log('[Service Worker] Push event payload is not JSON, treating as text.');
        notificationData.body = event.data.text();
        notificationData.data = {};
      }
    
      const options = {
        body: notificationData.body,
        icon: '/favicon/android-chrome-192x192.png', // Keep configurable in mind
        badge: '/favicon/favicon-32x32.png',
        vibrate: [100, 50, 100],
        data: notificationData.data // Pass along any data from the push
      };
    
      event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
      );
    });
    
    self.addEventListener('notificationclick', function(event) {
      console.log('[Service Worker] Notification click Received.');
      event.notification.close();
    
      // Navigate to a specific URL if provided in data, otherwise open root
      const targetUrl = event.notification.data?.url || '/';
    
      event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
          for (const client of clientList) {
            if (client.url === targetUrl && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(targetUrl);
          }
        })
      );
    });
    ```

**Phase 3: Backend API Routes**

4.  **Update Database Schema (`prisma/schema.prisma`):**
    *   Ensure the `PushSubscription` model exists as defined previously.
    *   ```prisma
        model PushSubscription {
          id        String   @id @default(cuid())
          endpoint  String   @unique // Unique constraint is important
          p256dh    String
          auth      String
          userId    String
          user      User     @relation(fields: [userId], references: [id], onDelete: Cascade) // Added onDelete
          createdAt DateTime @default(now())
          updatedAt DateTime @updatedAt
        
          @@index([userId])
        }
        
        model User {
          // ... existing user fields
          pushSubscriptions PushSubscription[]
        }
        ```
    *   Generate and apply migrations **using the proper workflow**:
        ```bash
        # For development
        npx prisma migrate dev --name add_push_subscriptions
        # For production/staging (after dev)
        # npx prisma generate
        # npx prisma migrate deploy
        ```

5.  **Create/Update Subscription API Route (`app/api/notifications/subscribe/route.ts`):**
    ```typescript
    import { NextResponse } from 'next/server';
    import webpush from 'web-push';
    import { z } from 'zod';
    import { prisma } from '@/lib/prisma';
    import { getServerSession } from 'next-auth';
    import { authOptions } from '@/lib/auth';

    // Define schema for validation
    const subscriptionSchema = z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    });

    webpush.setVapidDetails(
      process.env.VAPID_MAILTO || 'mailto:default@example.com', // Use env var or default
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    export async function POST(request: Request) {
      try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) { // Check for user ID
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Validate input
        const parseResult = subscriptionSchema.safeParse(body);
        if (!parseResult.success) {
          console.error('Invalid subscription format:', parseResult.error);
          return NextResponse.json({ error: 'Invalid subscription data', details: parseResult.error.format() }, { status: 400 });
        }
        const subscription = parseResult.data;

        // Use upsert for idempotency
        await prisma.pushSubscription.upsert({
          where: { endpoint: subscription.endpoint },
          update: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userId: session.user.id, // Ensure it's linked to the current user
          },
          create: {
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            userId: session.user.id,
          },
        });

        console.log(`Subscription upserted for user ${session.user.id}: ${subscription.endpoint}`);
        return NextResponse.json({ message: 'Subscription added or updated successfully' });

      } catch (error) {
        console.error('Error saving subscription:', error);
        // Add more specific error handling if needed (e.g., Prisma errors)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
    ```

6.  **Create Unsubscribe API Route (`app/api/notifications/unsubscribe/route.ts`):**
    ```typescript
    import { NextResponse } from 'next/server';
    import { z } from 'zod';
    import { prisma } from '@/lib/prisma';
    import { getServerSession } from 'next-auth';
    import { authOptions } from '@/lib/auth';

    // Schema for the endpoint to be unsubscribed
    const unsubscribeSchema = z.object({
      endpoint: z.string().url(),
    });

    export async function POST(request: Request) {
      try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parseResult = unsubscribeSchema.safeParse(body);

        if (!parseResult.success) {
          return NextResponse.json({ error: 'Invalid request data', details: parseResult.error.format() }, { status: 400 });
        }
        const { endpoint } = parseResult.data;

        // Delete the subscription matching the endpoint AND the user ID
        const deleteResult = await prisma.pushSubscription.deleteMany({
          where: {
            endpoint: endpoint,
            userId: session.user.id, // Ensure users can only delete their own subs
          },
        });

        if (deleteResult.count > 0) {
          console.log(`Subscription deleted for user ${session.user.id}: ${endpoint}`);
          return NextResponse.json({ message: 'Subscription removed successfully' });
        } else {
          console.log(`Subscription not found for user ${session.user.id} to delete: ${endpoint}`);
          // Return success even if not found, as the desired state (no subscription) is achieved
          return NextResponse.json({ message: 'Subscription not found or already removed' });
        }

      } catch (error) {
        console.error('Error removing subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
    ```

**Phase 4: Client-Side Integration**

7.  **Create/Update Client-Side Hook (`hooks/useNotifications.ts`):**
    ```typescript
    import { useState, useEffect, useCallback } from 'react';
    import { toast } from 'sonner'; // Assuming use of sonner/react-hot-toast

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    // Helper to convert base64 string to Uint8Array
    function urlBase64ToUint8Array(base64String: string): Uint8Array {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }


    export function useNotifications() {
      const [permission, setPermission] = useState<NotificationPermission>('default');
      const [isSubscribed, setIsSubscribed] = useState(false);
      const [loading, setLoading] = useState(true);
      const [isSupported, setIsSupported] = useState(false);

      const checkSupportAndPermission = useCallback(async () => {
        setLoading(true);
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.warn('Notifications not fully supported in this browser.');
          setIsSupported(false);
          setLoading(false);
          return;
        }
        setIsSupported(true);
        setPermission(Notification.permission);

        if (Notification.permission === 'granted') {
          // Check if already subscribed
          const registration = await navigator.serviceWorker.ready;
          const currentSubscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!currentSubscription);
        } else {
            setIsSubscribed(false);
        }
        setLoading(false);
      }, []);

      useEffect(() => {
        checkSupportAndPermission();
      }, [checkSupportAndPermission]);

      const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported || permission !== 'granted') {
            console.error('Cannot subscribe: Not supported or permission not granted.');
            return false;
        }

        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID Public Key is not defined.');
            toast.error('Notification configuration error.');
            return false;
        }

        setLoading(true);
        try {
          const registration = await navigator.serviceWorker.ready;
          const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
              console.log('Already subscribed.');
              setIsSubscribed(true);
              setLoading(false);
              return true; // Already subscribed
          }

          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          });

          const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSubscription)
          });

          if (!response.ok) {
            throw new Error(`Failed to save subscription: ${response.statusText}`);
          }

          console.log('User is subscribed:', newSubscription);
          setIsSubscribed(true);
          toast.success('Notifications enabled!');
          return true;
        } catch (error) {
          console.error('Error subscribing to notifications:', error);
          toast.error(`Failed to enable notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsSubscribed(false); // Ensure state consistency on error
          return false;
        } finally {
            setLoading(false);
        }
      }, [isSupported, permission]);

      const unsubscribe = useCallback(async (): Promise<boolean> => {
         if (!isSupported) return false;
         setLoading(true);
         try {
            const registration = await navigator.serviceWorker.ready;
            const currentSubscription = await registration.pushManager.getSubscription();

            if (!currentSubscription) {
                console.log('Not currently subscribed.');
                setIsSubscribed(false);
                setLoading(false);
                return true; // Already unsubscribed
            }

            // Tell the backend first
            const response = await fetch('/api/notifications/unsubscribe', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({ endpoint: currentSubscription.endpoint })
            });

            if (!response.ok) {
                // Even if backend fails, try to unsubscribe locally, but warn
                console.warn(`Backend unsubscribe failed: ${response.statusText}. Proceeding with local unsubscribe.`);
                // Optionally: throw new Error(`Failed to remove subscription from server: ${response.statusText}`);
            }

            const unsubscribed = await currentSubscription.unsubscribe();
            if (unsubscribed) {
                console.log('User is unsubscribed.');
                setIsSubscribed(false);
                toast.success('Notifications disabled.');
                return true;
            } else {
                throw new Error('Local unsubscribe failed.');
            }
         } catch (error) {
            console.error('Error unsubscribing:', error);
            toast.error(`Failed to disable notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // State might be inconsistent here, re-check?
            await checkSupportAndPermission(); // Re-sync state
            return false;
         } finally {
            setLoading(false);
         }
      }, [isSupported, checkSupportAndPermission]);

      const requestPermissionAndSubscribe = useCallback(async () => {
        if (!isSupported) {
          toast.error('Notifications not supported on this browser.');
          return false;
        }

        if (permission === 'granted') {
            // Already granted, just ensure subscription
            return await subscribe();
        }

        if (permission === 'denied') {
          toast.error('Notification permission was previously denied. Please enable it in your browser settings.');
          return false;
        }

        setLoading(true);
        try {
          const newPermission = await Notification.requestPermission();
          setPermission(newPermission); // Update state immediately

          if (newPermission === 'granted') {
            return await subscribe(); // Proceed to subscribe if granted
          } else {
            toast.info('Notification permission was not granted.');
            setLoading(false);
            return false;
          }
        } catch (error) {
          console.error('Error requesting permission:', error);
          toast.error('Error requesting notification permission.');
          setLoading(false);
          return false;
        }
      }, [isSupported, permission, subscribe]);

      return {
        isSupported,
        permission,
        isSubscribed,
        loading,
        requestPermissionAndSubscribe,
        unsubscribe
      };
    }
    ```

8.  **Create/Update Notification Component (`components/NotificationButton.tsx`):**
    ```typescript
    'use client';

    import { Button } from '@/components/ui/button';
    import { useNotifications } from '@/hooks/useNotifications';
    import { Bell, BellOff, BellRing } from 'lucide-react';
    import { Skeleton } from '@/components/ui/skeleton'; // For loading state

    export function NotificationButton() {
      const {
        isSupported,
        permission,
        isSubscribed,
        loading,
        requestPermissionAndSubscribe,
        unsubscribe
      } = useNotifications();

      if (!isSupported) return null; // Don't render if not supported

      if (loading) {
        return <Skeleton className="h-10 w-10 rounded-full" />; // Show skeleton while loading
      }

      if (permission === 'denied') {
        return (
          <Button variant="ghost" size="icon" disabled title="Notifications blocked in browser settings">
            <BellOff className="h-5 w-5 text-destructive" />
          </Button>
        );
      }

      if (isSubscribed) {
        return (
          <Button variant="ghost" size="icon" onClick={unsubscribe} title="Disable notifications">
            <BellRing className="h-5 w-5 text-green-500" />
          </Button>
        );
      }

      // If default or granted but not subscribed
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={requestPermissionAndSubscribe}
          title="Enable notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>
      );
    }
    ```

9.  **Register Service Worker (`app/layout.tsx`):**
    *   Ensure the `useEffect` hook for registering `/service-worker.js` exists as previously defined.

**Phase 5: Sending Notifications & Testing**

10. **Create/Update Notification Sending Utility (`lib/notifications.ts`):**
    *   *Future Scalability:* Keep in mind that for high volume, this should be moved to a background job queue.
    ```typescript
    import webpush, { PushSubscription } from 'web-push';
    import { prisma } from './prisma';

    // Ensure VAPID details are set only once, ideally during app initialization
    // Or ensure env vars are loaded before this module is imported heavily.
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            process.env.VAPID_MAILTO || 'mailto:default@example.com',
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } else {
        console.warn('VAPID keys not configured. Push notifications will likely fail.');
    }

    interface NotificationPayload {
        title: string;
        body: string;
        data?: Record<string, any>; // For custom data like URLs
    }

    export async function sendNotification(userId: string, payload: NotificationPayload) {
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
          console.error('Cannot send notification: VAPID keys not configured.');
          return; // Prevent errors if keys are missing
      }

      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
      });

      if (subscriptions.length === 0) {
          console.log(`No subscriptions found for user ${userId}.`);
          return;
      }

      console.log(`Sending notification to ${subscriptions.length} endpoints for user ${userId}`);

      const notificationPromises = subscriptions.map(async (subscription) => {
        const pushSubscription: PushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload), // Send payload as JSON string
            {
                TTL: 60 * 60 * 24 // Optional: Time-to-live in seconds (e.g., 1 day)
                // urgency: 'high' // Optional: if needed
            }
          );
          console.log(`Notification sent successfully to ${subscription.endpoint}`);
        } catch (error: any) {
          console.error(`Error sending notification to ${subscription.endpoint}:`, error.statusCode, error.body);
          // Handle specific errors, especially 404 and 410 (Not Found / Gone)
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`Subscription ${subscription.endpoint} is invalid. Deleting.`);
            // Use deleteMany for safety, though id should be unique
            await prisma.pushSubscription.deleteMany({
              where: { id: subscription.id }
            }).catch(deleteError => {
                console.error(`Failed to delete subscription ${subscription.id}:`, deleteError);
            });
          }
          // Optional: Implement retry logic for transient errors (e.g., 5xx) if using background jobs
        }
      });

      // Wait for all send attempts to complete or fail
      await Promise.allSettled(notificationPromises);
      console.log(`Finished sending notifications for user ${userId}`);
    }

    // --- Example Usage ---
    /*
    await sendNotification(
      'user_id_here',
      {
        title: 'Feeding Time!',
        body: 'Mittens is hungry. Time for dinner!',
        data: {
          url: '/cats/mittens/feedings' // Example deep link
        }
      }
    );
    */
    ```

11. **Create Test Page and API Route:**
    *   Create `app/test-notifications/page.tsx` as previously defined.
    *   Create `app/api/notifications/test/route.ts` as previously defined, ensuring it calls `sendNotification` with the new `NotificationPayload` structure.

**Phase 6: Testing & Refinement**

12. **Automated Testing:**
    *   Implement unit tests for utility functions (like `urlBase64ToUint8Array`) and potentially mocking parts of `lib/notifications.ts`.
    *   Implement integration tests for the API routes (`/subscribe`, `/unsubscribe`, `/test`) using a test database setup.
    *   Consider end-to-end tests (using tools like Playwright or Cypress) to verify the full flow, although mocking browser push APIs can be tricky.

13. **Manual Testing:**
    *   Test across different browsers (Chrome, Firefox, Edge, Safari if applicable).
    *   Test on different devices (desktop, mobile).
    *   Test permission granting, denial, and revocation flows.
    *   Test subscribing and unsubscribing.
    *   Test sending notifications and clicking them (verifying navigation).

14. **Further Refinements (Considerations):**
    *   Implement user preferences for notification types if needed.
    *   Add more robust error handling and user feedback (e.g., using toasts consistently).
    *   Implement rate limiting on notification sending APIs if abuse is a concern.
    *   Consider the background job queue for sending notifications at scale. 

# Plano de Desenvolvimento para a Funcionalidade "Weight Tracker" (Refinado)

**Princípios:** Iteração, Simplicidade, Reuso (Shadcn UI, Prisma, NextAuth, Zod, Notificações Existentes), TDD.

**1. Escopo do Projeto:**

*   **Objetivo Principal:** Desenvolver e integrar a funcionalidade "Weight Tracker" ao aplicativo Mealtime.
*   **Funcionalidades Chave (MVP):**
    *   Registrar medição de peso para um gato.
    *   Definir/Editar meta de peso para um gato.
    *   Exibir peso atual, meta, porções desde a última medição, média de porção diária.
    *   Exibir gráfico simples de linha do histórico de peso.
    *   Exibir histórico de medições (lista simples).
    *   Link para registro de alimentação (funcionalidade existente).
    *   Notificação de lembrete para pesagem (reutilizando `lib/notifications.ts` + trigger).
*   **Fora do Escopo (Inicial):** Gráficos complexos, filtros avançados de histórico, comparações detalhadas de ingestão vs. peso no gráfico, configurações avançadas de notificação.

**2. Linha do Tempo (Iterativa - 4 Sprints ~ 8 Semanas):**

| Sprint | Duração   | Foco Principal                                                                                                                               | Marcos Importantes                                                                                                                                                                                              |
| :----- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | 2 semanas | **Fundação Backend & UI Básica:** Modelo de dados (Adicionar `weightGoal` a `Cat`, criar `WeightMeasurement`, migrar), APIs CRUD (Peso, Meta - com Zod, NextAuth), UI estática inicial (página, cards) | Schema Prisma atualizado e migrado (`WeightMeasurement` adicionado, `weightGoal` em `Cat`). APIs básicas (registrar/ler medição, definir/ler meta) funcionais com testes. Layout da página "Weight Tracker" com componentes Shadcn estáticos. |
| **2**  | 2 semanas | **Integração Frontend & Cálculos:** Conectar UI aos dados (peso atual, meta, etc.), implementar cálculos (porções, média), adicionar registro de peso. | Página exibe dados reais do backend. Cards dinâmicos. Lógica de cálculo implementada e testada. Formulário de registro de peso funcional.                                                                    |
| **3**  | 2 semanas | **Gráfico & Histórico (MVP):** Implementar gráfico de linha simples (e.g., Recharts), página de histórico (lista simples), API de histórico.       | Gráfico exibe histórico de peso. API de histórico funcional. Página de histórico exibe lista de medições. Botão "Ver Histórico" e link "Registrar Alimentação" funcionais. Testes de integração atualizados. |
| **4**  | 2 semanas | **Notificações & Refinamento:** Implementar trigger para notificação de lembrete, testes E2E básicos, refatoração, documentação.           | Lembrete de pesagem via notificação funcional. Testes E2E cobrindo fluxo principal. Código revisado e documentado. Funcionalidade pronta para implantação.                                                  |
| **Pós** | Contínuo  | **Melhorias:** Gráficos avançados, filtros de histórico, UI aprimorada, etc.                                                                  | Backlog atualizado com novas histórias de usuário.                                                                                                                                                              |

**3. Alocação de Recursos:** (Mantida como no plano original, ajustar conforme necessidade)

*   Product Owner (PO)
*   Scrum Master
*   Líder Técnico
*   Desenvolvedores Frontend (2)
*   Desenvolvedor Backend (1)
*   Designer de UI/UX (Consultoria inicial/revisão)
*   Testador de Qualidade (QA) (Integrado aos Sprints)

**4. Fases de Desenvolvimento (Dentro de cada Sprint):**

*   Planejamento (Refinamento das Histórias)
*   Desenvolvimento (Backend/Frontend com TDD)
*   Testes (Unitários, Integração, QA)
*   Revisão/Refatoração

**5. Riscos Potenciais (Reavaliados):**

| Risco                                      | Probabilidade | Impacto | Estratégia de Mitigação                                                                                                                                                                                                                            |
| :----------------------------------------- | :------------ | :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complexidade inesperada nos cálculos       | Baixa         | Médio   | Isolar lógica de cálculo, TDD rigoroso, validação com PO.                                                                                                                                                                                          |
| Dificuldades na integração do gráfico   | Média         | Médio   | Iniciar com gráfico simples, escolher biblioteca familiar (e.g., Recharts), prototipagem rápida.                                                                                                                                                 |
| Problemas de integração (API/UI)         | Média         | Alto    | Contratos de API claros (OpenAPI/ts-rest opcional), testes de integração contínuos.                                                                                                                                                            |
| Trigger de notificação complexo          | Baixa         | Médio   | Pesquisar/Utilizar soluções de agendamento (e.g., cron jobs, Vercel Cron Jobs, ou serviço externo simples), começar com trigger manual/teste.                                                                                                        |

**6. Plano de Comunicação:** (Mantido como no plano original) 