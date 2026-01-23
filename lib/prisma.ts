import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import type { PrismaPg } from '@prisma/adapter-pg';
import type { Pool } from 'pg';
import { logger } from '@/lib/monitoring/logger';

let PrismaPgClass: typeof PrismaPg | null = null;
let PoolClass: typeof Pool | null = null;

function getAdapter(): PrismaPg | undefined {
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    if (!PrismaPgClass) {
      const pgAdapter = require('@prisma/adapter-pg');
      PrismaPgClass = pgAdapter.PrismaPg as unknown as typeof PrismaPg;
    }
    if (!PoolClass) {
      PoolClass = require('pg').Pool as unknown as typeof Pool;
    }
    
    const pool = new PoolClass({
      connectionString: process.env.DATABASE_URL,
    });
    
    return new PrismaPgClass(pool);
  }
  return undefined;
}

declare global {
  var prisma: PrismaClient | undefined;
}

interface PrismaClientConfig {
  log: Array<'query' | 'info' | 'warn' | 'error'>;
  adapter?: PrismaPg;
}

const prismaClientSingleton = () => {
  logger.info('[Prisma] Creating new PrismaClient instance.');
  
  const adapter = getAdapter();
  
  const logConfig: Array<'query' | 'info' | 'warn' | 'error'> = 
    process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['warn', 'error'];
  
  const clientConfig: PrismaClientConfig = {
    log: logConfig,
  };
  
  if (adapter) {
    clientConfig.adapter = adapter;
  }
  
  const client = new PrismaClient(clientConfig);
  
  return client;
};

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
} else {
  logger.info('[Prisma] Using existing PrismaClient instance in production.');
}

export default prisma;

export function createPrismaClient(): PrismaClient {
  const adapter = getAdapter();
  const logConfig: Array<'query' | 'info' | 'warn' | 'error'> = 
    process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['warn', 'error'];
  
  const clientConfig: PrismaClientConfig = {
    log: logConfig,
  };
  
  if (adapter) {
    clientConfig.adapter = adapter;
  }
  
  return new PrismaClient(clientConfig);
}

try {
    if (prisma && typeof prisma.$connect === 'function') {
    } else {
       logger.error('[Prisma] Prisma client instance seems invalid after initialization.', { prismaType: typeof prisma });
    }
} catch (e) {
    logger.error('[Prisma] Error during post-initialization check.', { error: e });
}
