import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/notifications/[id]/route';
import { POST } from '@/app/api/notifications/read-all/route';
import { PATCH } from '@/app/api/notifications/[id]/read/route';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Mock do next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}));

// Mock do prisma
jest.mock('@/lib/prisma', () => ({
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn()
}));

describe('API de Notificações', () => {
  const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com'
  };

  const mockNotification = {
    id: 1,
    title: 'Test Notification',
    message: 'Test Message',
    type: 'info',
    isRead: false,
    userId: 1,
    createdAt: new Date()
  };

  beforeEach(() => {
    // Reset dos mocks
    jest.clearAllMocks();
    
    // Mock da sessão
    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser
    });
  });

  describe('DELETE /api/notifications/[id]', () => {
    it('deve remover uma notificação existente', async () => {
      // Mock da verificação de existência
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockNotification]);
      
      // Mock da remoção
      (prisma.$executeRaw as jest.Mock).mockResolvedValue({ count: 1 });

      const request = new NextRequest('http://localhost:3000/api/notifications/1', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Notificação removida com sucesso');
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('deve retornar 404 para notificação não encontrada', async () => {
      // Mock de notificação não encontrada
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/notifications/999', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Notificação não encontrada');
    });

    it('deve retornar 401 para usuário não autenticado', async () => {
      // Mock de usuário não autenticado
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/1', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });
  });

  describe('POST /api/notifications/read-all', () => {
    it('deve marcar todas as notificações como lidas', async () => {
      // Mock da atualização
      (prisma.$executeRaw as jest.Mock).mockResolvedValue({ count: 5 });

      const request = new NextRequest('http://localhost:3000/api/notifications/read-all', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(5);
      expect(data.message).toBe('5 notificações marcadas como lidas');
    });

    it('deve retornar 401 para usuário não autenticado', async () => {
      // Mock de usuário não autenticado
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/read-all', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });
  });

  describe('PATCH /api/notifications/[id]/read', () => {
    it('deve marcar uma notificação como lida', async () => {
      // Mock da verificação de existência
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockNotification]);
      
      // Mock da atualização
      (prisma.$executeRaw as jest.Mock).mockResolvedValue({ count: 1 });

      const request = new NextRequest('http://localhost:3000/api/notifications/1/read', {
        method: 'PATCH'
      });

      const response = await PATCH(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isRead).toBe(true);
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('deve retornar 404 para notificação não encontrada', async () => {
      // Mock de notificação não encontrada
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/notifications/999/read', {
        method: 'PATCH'
      });

      const response = await PATCH(request, { params: { id: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Notificação não encontrada');
    });

    it('deve retornar 401 para usuário não autenticado', async () => {
      // Mock de usuário não autenticado
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/1/read', {
        method: 'PATCH'
      });

      const response = await PATCH(request, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });
  });
}); 