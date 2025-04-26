import { prisma } from '@/lib/prisma';

export async function getCatByIdServer(id: number) {
  if (!id || isNaN(id)) {
    return null;
  }

  try {
    const cat = await prisma.cat.findUnique({
      where: { id },
      include: {
        household: true,
        feedings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: true
          }
        }
      }
    });

    return cat;
  } catch (error) {
    console.error('Error fetching cat by ID:', error);
    return null;
  }
} 