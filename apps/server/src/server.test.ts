import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from './server.js';
import { deriveKeys, generateSalt, encryptData, decryptData, LoginData } from '@pass-vault/core';

test('Flujo Completo de Autenticación Zero-Knowledge y Sincronización', async () => {
  // Base de datos en memoria para el test
  const { fastify } = buildServer(':memory:');
  await fastify.ready();

  const userEmail = 'usuario_test@example.com';
  const masterPassword = 'ClaveMaestraSuperSegura123!';

  // 1. Cliente genera Salt y deriva claves localmente
  const clientSalt = generateSalt();
  const { vaultKey, authHash } = await deriveKeys(masterPassword, clientSalt);

  // 2. Registro Zero-Knowledge en el servidor
  const regResponse = await fastify.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: userEmail,
      salt: clientSalt,
      authHash,
    },
  });

  assert.equal(regResponse.statusCode, 200);
  const regBody = JSON.parse(regResponse.payload);
  assert.ok(regBody.token);
  assert.equal(regBody.user.email, userEmail);

  // 3. Prelogin handshake: nuevo cliente consulta el salt con solo el email
  const preloginResponse = await fastify.inject({
    method: 'POST',
    url: '/api/v1/auth/prelogin',
    payload: { email: userEmail },
  });

  assert.equal(preloginResponse.statusCode, 200);
  const preloginBody = JSON.parse(preloginResponse.payload);
  assert.equal(preloginBody.salt, clientSalt, 'Debe devolver el salt para calcular authHash local');

  // 4. Login con authHash correcto
  const loginResponse = await fastify.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: userEmail, authHash },
  });
  assert.equal(loginResponse.statusCode, 200);
  const loginToken = JSON.parse(loginResponse.payload).token;

  // 5. Cifrado y subida de un elemento a la bóveda
  const loginData: LoginData = {
    username: 'admin@banco.com',
    password: 'PasswordSuperBancaria999!',
    uris: ['https://banco.com'],
  };
  const encryptedPayload = await encryptData(loginData, vaultKey);

  const syncUploadResponse = await fastify.inject({
    method: 'POST',
    url: '/api/v1/vault/sync',
    headers: { authorization: `Bearer ${loginToken}` },
    payload: {
      items: [
        {
          id: 'item-uuid-1',
          type: 'login',
          name: 'Banco Personal',
          favorite: true,
          encryptedPayload,
          version: 1,
        },
      ],
    },
  });

  assert.equal(syncUploadResponse.statusCode, 200);

  // 6. Descarga y sincronización en otro cliente (ej. Celular S25 Ultra)
  const syncDownloadResponse = await fastify.inject({
    method: 'GET',
    url: '/api/v1/vault/sync',
    headers: { authorization: `Bearer ${loginToken}` },
  });

  assert.equal(syncDownloadResponse.statusCode, 200);
  const downloadBody = JSON.parse(syncDownloadResponse.payload);
  assert.equal(downloadBody.items.length, 1);
  assert.equal(downloadBody.items[0].name, 'Banco Personal');

  // El nuevo cliente descifra el secreto con su vaultKey local
  const decryptedItem = await decryptData<LoginData>(
    downloadBody.items[0].encryptedPayload,
    vaultKey
  );
  assert.deepEqual(decryptedItem, loginData);

  await fastify.close();
});

