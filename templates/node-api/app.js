import express from 'express';

const app = express();
app.disable('x-powered-by');
app.get('/', (_req, res) => {
  res.json({ message: 'Welcome to {{projectName}}!' });
});
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
export default app;
