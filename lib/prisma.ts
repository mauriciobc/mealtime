import { PrismaClient } from '@prisma/client';

// Prevenir múltiplas instâncias do Prisma Client em desenvolvimento
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// export default prisma; // Remove default export
export { prisma }; // Use named export instead