import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/monitoring/logger';

// Lazy load adapter only on server-side to avoid bundling pg in client
let PrismaPg: any;
let Pool: any;

function getAdapter() {
  // Only import adapter on server-side (Node.js environment)
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:12',message:'Loading adapter modules (server-side only)',data:{isServer:typeof window === 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    if (!PrismaPg) {
      PrismaPg = require('@prisma/adapter-pg').PrismaPg;
    }
    if (!Pool) {
      Pool = require('pg').Pool;
    }
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    return new PrismaPg(pool);
  }
  return undefined;
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more: 
// https://pris.ly/d/help/next-js-best-practices

declare global {
  // Allow global `var` declarations
   
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:43',message:'prismaClientSingleton entry',data:{nodeEnv:process.env.NODE_ENV,hasDbUrl:!!process.env.DATABASE_URL,isServer:typeof window === 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  logger.info('[Prisma] Creating new PrismaClient instance.');
  
  // Prisma 7 requires an adapter - using @prisma/adapter-pg for PostgreSQL (server-side only)
  const adapter = getAdapter();
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:49',message:'Adapter loaded',data:{hasAdapter:!!adapter,isServer:typeof window === 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  // Prisma 7 no longer accepts datasources in constructor - uses prisma.config.ts instead
  const logConfig: Array<'query' | 'info' | 'warn' | 'error'> = 
    process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['warn', 'error'];
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:58',message:'Before PrismaClient instantiation with adapter',data:{logConfig,hasAdapter:!!adapter},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  const clientConfig: any = {
    log: logConfig,
  };
  
  // Only add adapter if we're on the server (adapter is required in Prisma 7)
  if (adapter) {
    clientConfig.adapter = adapter;
  }
  
  const client = new PrismaClient(clientConfig);
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/3ddfe557-fe44-4525-9565-c9b887696afb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:70',message:'After PrismaClient instantiation with adapter',data:{clientType:typeof client,hasConnect:typeof client.$connect === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  return client;
};

// Use the singleton pattern
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
} else {
  logger.info('[Prisma] Using existing PrismaClient instance in production.');
}

// Removed custom connect/disconnect logic, Prisma handles this.

export default prisma;

/**
 * Creates a PrismaClient instance with the PostgreSQL adapter (required in Prisma 7)
 * Use this function in scripts and API routes instead of creating PrismaClient directly
 */
export function createPrismaClient(): PrismaClient {
  const adapter = getAdapter();
  const logConfig: Array<'query' | 'info' | 'warn' | 'error'> = 
    process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['warn', 'error'];
  
  const clientConfig: any = {
    log: logConfig,
  };
  
  if (adapter) {
    clientConfig.adapter = adapter;
  }
  
  return new PrismaClient(clientConfig);
}

// Optional: Add a simple check to see if the client seems okay after export
try {
    if (prisma && typeof prisma.$connect === 'function') {
        // logger.info('[Prisma] Prisma client instance appears valid after initialization.');
    } else {
       logger.error('[Prisma] Prisma client instance seems invalid after initialization.', { prismaType: typeof prisma });
    }
} catch (e) {
    logger.error('[Prisma] Error during post-initialization check.', { error: e });
}