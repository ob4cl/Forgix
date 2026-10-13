"""A small HTTP API; no database, authentication or external services."""
from fastapi import FastAPI

app = FastAPI(title='{{projectName}}', version='0.1.0')


@app.get('/')
def root():
    return {'message': 'Welcome to {{projectName}}!'}


@app.get('/health')
def health():
    return {'status': 'ok'}
