# jCloud Deploy API

Simple deployment API for jCloud services.

## Endpoint

### POST /deploy

Deploy a Docker image to a service using an API key.

**Headers:**
```
X-API-Key: your-api-key-here
Content-Type: application/json
```

**Body:**
```json
{
  "image": "myregistry/myapp:v1.0.0"
}
```

**Response (200):**
```json
{
  "success": true,
  "deploymentId": "uuid",
  "service": {
    "id": "uuid",
    "name": "my-service"
  },
  "image": "myregistry/myapp:v1.0.0",
  "deployedAt": "2024-01-05T12:00:00.000Z",
  "message": "Deployment recorded successfully"
}
```

**Errors:**
- `401` - Missing or invalid API key
- `400` - Invalid request body
- `500` - Internal server error

## Development

```bash
# Start in dev mode
yarn start:dev

# Build
yarn build
```

## Environment Variables

- `PORT` - Server port (default: 3333)
- `DATABASE_URL` - PostgreSQL connection string
