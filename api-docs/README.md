# 🚴‍♂️ WkoLibrary API Documentation

Welcome to the WkoLibrary API documentation! This API powers the Zwift Workout Visualizer, providing endpoints for workout management, AI assistance, and system monitoring.

## 📋 Quick Start

### Interactive Documentation

- **[Swagger UI](./swagger-ui.html)** - Interactive API explorer with try-it-out functionality
- **[OpenAPI Specification](./openapi.yaml)** - Machine-readable API specification

### Base URLs

- **Development**: `http://localhost:8000`
- **Alternative**: `http://localhost:3000`

## 🚀 API Overview

### Core Features

- **Workout Management**: Load, parse, and manage Zwift workout files (.zwo)
- **AI Assistant**: Chat integration for workout guidance and recommendations
- **MCP Management**: Control Model Context Protocol servers
- **Health Monitoring**: Health checks and performance metrics

### Available Endpoints

#### 🏋️ Workout Management

| Method | Endpoint           | Description                       |
| ------ | ------------------ | --------------------------------- |
| `GET`  | `/workouts`        | List all workout files            |
| `GET`  | `/workouts/{path}` | Get specific workout or directory |

#### 🤖 AI Assistant

| Method | Endpoint | Description                  |
| ------ | -------- | ---------------------------- |
| `POST` | `/chat`  | Send message to AI assistant |

#### ⚙️ MCP Management

| Method | Endpoint                | Description                |
| ------ | ----------------------- | -------------------------- |
| `GET`  | `/mcp/status`           | Get MCP server status      |
| `POST` | `/mcp/start/{server}`   | Start MCP server           |
| `POST` | `/mcp/stop/{server}`    | Stop MCP server            |
| `POST` | `/mcp/restart/{server}` | Restart MCP server         |
| `GET`  | `/mcp/validate`         | Validate MCP configuration |

#### 📊 Monitoring

| Method | Endpoint        | Description         |
| ------ | --------------- | ------------------- |
| `GET`  | `/health`       | Basic health check  |
| `GET`  | `/health/ready` | Readiness probe     |
| `GET`  | `/health/live`  | Liveness probe      |
| `GET`  | `/metrics`      | Application metrics |

## 🔧 Development

### Starting the Server

```bash
# Python server (default port 8000)
python3 server.py

# Development with hot reload
npm run dev

# Simple development server
npm run dev:simple
```

### Testing the API

```bash
# Health check
curl http://localhost:8000/health

# List workouts
curl http://localhost:8000/workouts

# MCP status
curl http://localhost:8000/mcp/status
```

## 📝 Data Formats

### Workout Files (.zwo)

The API works with Zwift workout files in XML format. These files contain:

- Workout metadata (name, author, description)
- Structured intervals and segments
- Power targets and cadence information
- Training zones and tags

### Example Workout Structure

```json
{
  "name": "Sweet Spot Intervals",
  "author": "TrainerRoad",
  "description": "4x8min Sweet Spot intervals",
  "totalDuration": 3600,
  "segments": [
    {
      "duration": 300,
      "power": 0.85,
      "type": "intervals"
    }
  ]
}
```

## 🛡️ Security

### Rate Limiting

- Chat endpoints are rate-limited to prevent abuse
- No authentication required for local development
- CORS enabled for web client integration

### Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## 📚 Client Libraries

### JavaScript/TypeScript

```javascript
// Using the built-in API client
import { fetchWorkoutFile, sendChatMessage } from './api.js';

// Load a workout
const workout = await fetchWorkoutFile('sample_workout.zwo');

// Chat with AI
const response = await sendChatMessage('How can I improve my FTP?');
```

### Python

```python
import requests

# Health check
response = requests.get('http://localhost:8000/health')

# Load workout
workout = requests.get('http://localhost:8000/workouts/sample_workout.zwo')
```

## 🤝 Contributing

### API Changes

1. Update the OpenAPI specification in `openapi.yaml`
2. Regenerate documentation
3. Test all endpoints
4. Update client code if needed

### Documentation

- Keep this README in sync with API changes
- Use clear examples and descriptions
- Include error scenarios and edge cases

## 🐛 Troubleshooting

### Common Issues

**Server not starting?**

- Check if port 8000 is available: `lsof -i :8000`
- Verify Python dependencies: `pip install -r requirements.txt`

**API endpoints not responding?**

- Check server logs for errors
- Verify CORS settings for web clients
- Test with curl or Postman first

**MCP servers not working?**

- Check OpenAI API key configuration
- Verify MCP configuration in `mcp_config.json`
- Check server status with `/mcp/status` endpoint

### Debug Mode

Start the server with debug logging:

```bash
DEBUG=true python3 server.py
```

## 📄 License

This API documentation is part of the WkoLibrary project, licensed under the ISC License.

---

For more information, visit the [GitHub repository](https://github.com/jpequegn/WkoLibrary) or check the [interactive API documentation](./swagger-ui.html).
