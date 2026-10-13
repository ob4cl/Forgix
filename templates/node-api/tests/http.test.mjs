import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import app from '../app.js';

// Exercise Express dispatch and HTTP serialization without opening a port.
function request(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const socket = new Duplex({
      read() {},
      write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); },
    });
    const req = new IncomingMessage(socket);
    req.url = path;
    req.method = method;
    req.headers = { host: 'localhost' };
    const res = new ServerResponse(req);
    res.assignSocket(socket);
    res.on('error', reject);
    res.on('finish', () => {
      const raw = Buffer.concat(chunks).toString();
      resolve({ status: res.statusCode, headers: res.getHeaders(), body: raw.split('\r\n\r\n').slice(1).join('\r\n\r\n') });
      socket.destroy();
    });
    app(req, res);
  });
}

test('root identifies the generated starter', async () => {
  const res = await request('/');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /application\/json/);
  assert.equal(JSON.parse(res.body).message, 'Welcome to {{projectName}}!');
  assert.equal(res.headers['x-powered-by'], undefined);
});
test('health responds with JSON', async () => {
  const res = await request('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(JSON.parse(res.body), { status: 'ok' });
});
test('unknown routes return an explicit JSON 404', async () => {
  const res = await request('/missing');
  assert.equal(res.status, 404);
  assert.deepEqual(JSON.parse(res.body), { error: 'Not found' });
});
test('HEAD returns health headers without a body', async () => {
  const res = await request('/health', 'HEAD');
  assert.equal(res.status, 200);
  assert.equal(res.body, '');
});
