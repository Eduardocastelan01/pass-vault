import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { randomUUID } from 'node:crypto';
import { VaultDatabase } from './db.js';
import { createToken, verifyToken, safeCompareStrings } from './auth.js';
import type { WebSocket } from 'ws';

export function buildServer(dbPath?: string) {
  const fastify = Fastify({ logger: false });
  const db = new VaultDatabase(dbPath);

  // Registro de CORS para soportar extensiones de navegador y clientes locales
  fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Registro de WebSockets para sincronización en tiempo real
  fastify.register(websocket);

  // Mapeo de conexiones WebSocket activas por userId
  const activeSockets = new Map<string, Set<WebSocket>>();

  fastify.register(async function (app) {
    // WebSocket endpoint para recibir notificaciones de sincronización
    app.get('/api/v1/ws', { websocket: true }, (socket, req) => {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) {
        socket.close(1008, 'Token requerido');
        return;
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        socket.close(1008, 'Token invalido o expirado');
        return;
      }

      const userId = decoded.userId;
      if (!activeSockets.has(userId)) {
        activeSockets.set(userId, new Set());
      }
      activeSockets.get(userId)!.add(socket);

      socket.on('close', () => {
        const userSockets = activeSockets.get(userId);
        if (userSockets) {
          userSockets.delete(socket);
          if (userSockets.size === 0) {
            activeSockets.delete(userId);
          }
        }
      });

      socket.send(JSON.stringify({ type: 'connected', message: 'Conectado a PassVault Sync' }));
    });
  });

  function notifyUserDevices(userId: string, senderSocket?: WebSocket) {
    const userSockets = activeSockets.get(userId);
    if (!userSockets) return;

    const message = JSON.stringify({
      type: 'sync:needed',
      timestamp: new Date().toISOString(),
    });

    for (const ws of userSockets) {
      if (ws !== senderSocket && ws.readyState === 1) {
        ws.send(message);
      }
    }
  }

  // 1. Prelogin: Entrega el Salt para derivación local Zero-Knowledge
  fastify.post<{ Body: { email: string } }>('/api/v1/auth/prelogin', async (req, reply) => {
    const { email } = req.body || {};
    if (!email) {
      return reply.code(400).send({ error: 'El email es requerido' });
    }

    const user = db.getUserByEmail(email);
    if (user) {
      return { salt: user.salt };
    }

    // Sal falso determinista si el usuario no existe para prevenir enumeración de usuarios
    const dummySalt = Buffer.from(email + 'salt-dummy-secret-hash').subarray(0, 16).toString('hex');
    return { salt: dummySalt };
  });

  // 2. Registro de Usuario Zero-Knowledge
  fastify.post<{
    Body: { email: string; salt: string; authHash: string };
  }>('/api/v1/auth/register', async (req, reply) => {
    const { email, salt, authHash } = req.body || {};
    if (!email || !salt || !authHash) {
      return reply.code(400).send({ error: 'Faltan campos obligatorios' });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return reply.code(409).send({ error: 'El usuario ya existe' });
    }

    const id = randomUUID();
    const user = db.createUser(id, email, salt, authHash);
    const token = createToken(user.id, user.email);

    return {
      token,
      user: { id: user.id, email: user.email },
    };
  });

  // 3. Login de Usuario Zero-Knowledge
  fastify.post<{
    Body: { email: string; authHash: string };
  }>('/api/v1/auth/login', async (req, reply) => {
    const { email, authHash } = req.body || {};
    if (!email || !authHash) {
      return reply.code(400).send({ error: 'Faltan credenciales' });
    }

    const user = db.getUserByEmail(email);
    if (!user || !safeCompareStrings(user.auth_hash, authHash)) {
      return reply.code(401).send({ error: 'Credenciales inválidas' });
    }

    const token = createToken(user.id, user.email);
    return {
      token,
      user: { id: user.id, email: user.email },
    };
  });

  // Middleware auxiliar para verificar autenticación
  function requireAuth(req: any, reply: any): { userId: string; email: string } {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Token de autorización requerido' });
      throw new Error('Unauthorized');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      reply.code(401).send({ error: 'Token inválido o expirado' });
      throw new Error('Unauthorized');
    }

    return decoded;
  }

  // 4. Descargar cambios de sincronización (Delta Sync)
  fastify.get<{
    Querystring: { since?: string };
  }>('/api/v1/vault/sync', async (req, reply) => {
    const user = requireAuth(req, reply);
    const since = req.query.since;
    const items = db.getItemsForUserSince(user.userId, since);

    return {
      items: items.map((row) => ({
        id: row.id,
        type: row.type,
        name: row.name,
        favorite: Boolean(row.favorite),
        folderId: row.folder_id,
        encryptedPayload: {
          iv: row.iv,
          ciphertext: row.ciphertext,
          tag: row.tag,
        },
        version: row.version,
        deleted: Boolean(row.deleted),
        updatedAt: row.updated_at,
      })),
      serverTime: new Date().toISOString(),
    };
  });

  // 5. Subir cambios de sincronización cifrados
  fastify.post<{
    Body: {
      items: Array<{
        id: string;
        type: string;
        name: string;
        favorite?: boolean;
        folderId?: string | null;
        encryptedPayload: {
          iv: string;
          ciphertext: string;
          tag: string;
        };
        version: number;
        deleted?: boolean;
        updatedAt?: string;
      }>;
    };
  }>('/api/v1/vault/sync', async (req, reply) => {
    const user = requireAuth(req, reply);
    const { items } = req.body || {};

    if (!Array.isArray(items)) {
      return reply.code(400).send({ error: 'items debe ser una lista' });
    }

    const now = new Date().toISOString();

    for (const item of items) {
      db.upsertVaultItem({
        id: item.id,
        userId: user.userId,
        type: item.type,
        name: item.name,
        favorite: Boolean(item.favorite),
        folderId: item.folderId || null,
        iv: item.encryptedPayload.iv,
        ciphertext: item.encryptedPayload.ciphertext,
        tag: item.encryptedPayload.tag,
        version: item.version,
        deleted: Boolean(item.deleted),
        updatedAt: item.updatedAt || now,
      });
    }

    // Notificar en tiempo real a los demás clientes conectados de este usuario (Laptop, S25 Ultra, Navegador)
    notifyUserDevices(user.userId);

    return {
      success: true,
      syncedCount: items.length,
      serverTime: now,
    };
  });

  return { fastify, db };
}

// Inicialización directa si se ejecuta con node
if (process.argv[1]?.endsWith('server.js')) {
  const port = parseInt(process.env.PORT || '3000', 10);
  const { fastify } = buildServer();

  fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`🔐 PassVault Sync Server activo en ${address}`);
  });
}

