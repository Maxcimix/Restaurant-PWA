// backend/src/utils/redis.ts 
import { createClient } from 'redis';

const client = createClient({
      socket: {
            host: process.env.REDIS_HOST ?? 'localhost',
                port: parseInt(process.env.REDIS_PORT ?? '6379'),
             }, }); 
             
        client.on('error', (err) => { 
            console.error('[Redis] Error:', err.message);
         }); 
         
         client.on('connect', () => { 
            console.log('✅ Redis conectado'); 
        }); 
        client.on('reconnecting', () => { 
            
            console.warn('[Redis] Reconectando...');
         }); 
         // Conectar al iniciar 
         
    client.connect().catch((err) => { 
    console.error('[Redis] No se pudo conectar:', err.message); 
}); 

export default client;