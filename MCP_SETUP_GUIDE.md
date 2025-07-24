# MCP Server Setup Guide

## Overview

This guide explains how to configure and use the enhanced MCP (Model Context Protocol) server system in WkoLibrary. The system provides configurable, specialized MCP servers with health monitoring, dynamic loading, and runtime management.

## Architecture

### Components

1. **MCPManager** - Core server management with health monitoring
2. **Workout Creator MCP Server** - Specialized server for workout creation
3. **Configuration System** - JSON-based configuration with schema validation
4. **Web UI** - Browser-based management interface
5. **API Endpoints** - RESTful API for server control

### Features

- ✅ **Dynamic Server Loading** - Add/remove servers at runtime
- ✅ **Health Monitoring** - Automatic health checks and recovery
- ✅ **Configuration Validation** - Schema-based validation with detailed error reporting
- ✅ **Web Management UI** - User-friendly server management interface
- ✅ **Specialized Servers** - Domain-specific servers (workout creation, testing, etc.)
- ✅ **Process Management** - Automatic startup, shutdown, and restart
- ✅ **Port Management** - Automatic port allocation and conflict resolution

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Servers

Edit `mcp_config.json`:

```json
{
  "version": "1.0.0",
  "mcp_servers": {
    "workout_creator": {
      "name": "Specialized Workout Creator",
      "description": "Advanced workout creation with domain expertise",
      "category": "workout",
      "command": "python",
      "args": ["workout_mcp_server.py"],
      "enabled": true,
      "auto_start": true,
      "connection": {
        "host": "localhost",
        "port": 8001
      },
      "capabilities": ["workout_parsing", "interval_creation", "tss_calculation"],
      "priority": 1
    }
  },
  "global_settings": {
    "max_concurrent_servers": 10,
    "startup_timeout": 30,
    "auto_recovery": true
  }
}
```

### 3. Start the System

```bash
python server.py
```

### 4. Access Management UI

Open [http://localhost:53218/mcp_manager.html](http://localhost:53218/mcp_manager.html)

## Configuration Reference

### Server Configuration

Each MCP server is configured with these properties:

#### Required Fields

- **`command`** - Command to start the server
- **`args`** - Command line arguments (optional)

#### Server Information

- **`name`** - Human-readable server name
- **`description`** - Server description and capabilities
- **`category`** - Server category (`workout`, `testing`, `automation`, `data`, `ai`, `custom`)

#### Runtime Settings

- **`enabled`** - Enable/disable server (default: `true`)
- **`auto_start`** - Start automatically on application startup (default: `true`)
- **`priority`** - Startup priority 1-10 (1=highest, default: 5)

#### Connection Settings

```json
"connection": {
  "host": "localhost",           // Server host
  "port": 8001,                 // Server port (auto-assigned if omitted)
  "startup_delay": 3            // Seconds to wait after starting
}
```

#### Health Monitoring

```json
"health_check": {
  "enabled": true,              // Enable health monitoring
  "interval": 30,              // Check interval in seconds
  "timeout": 10,               // Check timeout in seconds
  "retry_count": 3             // Retries before marking unhealthy
}
```

#### Environment Variables

```json
"environment": {
  "WORKOUT_SERVER_PORT": "8001",
  "LOG_LEVEL": "INFO"
}
```

#### Metadata

- **`capabilities`** - List of server capabilities
- **`tags`** - Tags for organization and filtering

### Global Settings

```json
"global_settings": {
  "max_concurrent_servers": 10,    // Maximum concurrent servers
  "startup_timeout": 30,           // Global startup timeout
  "log_level": "INFO",            // Logging level
  "auto_recovery": true,          // Automatic server recovery
  "port_range": {
    "start": 8000,               // Port range start
    "end": 9000                  // Port range end
  }
}
```

## Specialized Servers

### Workout Creator MCP Server

A specialized server for workout creation with advanced parsing and generation capabilities.

#### Capabilities

- **Complex Interval Parsing** - Parse nested interval structures
- **Natural Language Processing** - Convert workout descriptions to structured data
- **TSS Calculation** - Training Stress Score computation
- **Power Zone Management** - FTP-based power zone calculations
- **Workout Optimization** - Duration and intensity optimization

#### Tools Available

1. **`parse_workout_description`** - Parse natural language descriptions
2. **`create_interval_workout`** - Create structured interval workouts
3. **`create_complex_interval_workout`** - Create complex nested intervals
4. **`calculate_tss`** - Calculate Training Stress Score
5. **`optimize_workout`** - Optimize workouts for target duration/TSS
6. **`get_power_zones`** - Get FTP-based power zone definitions
7. **`validate_workout`** - Validate workout structure

#### Example Usage

```python
# Natural language workout creation
workout = parse_workout_description("2 x 14' (4') as first 2' @ 105% then 12' at 100% @ FTP")

# Structured interval creation
intervals = create_interval_workout(
    intervals=4,
    work_duration="5min",
    work_power=1.05,
    rest_duration="2min"
)

# TSS calculation
tss = calculate_tss(segments, ftp=250)
```

## API Reference

### Server Management Endpoints

#### Get Server Status
```http
GET /mcp/status
```

Returns status of all MCP servers.

#### Start Server
```http
POST /mcp/start/
Content-Type: application/json

{
  "server_id": "workout_creator"
}
```

#### Stop Server
```http
POST /mcp/stop/
Content-Type: application/json

{
  "server_id": "workout_creator"
}
```

#### Restart Server
```http
POST /mcp/restart/
Content-Type: application/json

{
  "server_id": "workout_creator"
}
```

#### Validate Configuration
```http
GET /mcp/validate
```

Returns configuration validation results.

## Creating Custom MCP Servers

### 1. Server Implementation

Create a Python file implementing your MCP server:

```python
#!/usr/bin/env python3
from fastmcp import FastMCP
import os

class CustomMCPServer:
    def __init__(self):
        self.app = FastMCP("Custom Server")
        self._setup_tools()
    
    def _setup_tools(self):
        @self.app.tool("custom_tool")
        def custom_tool(input_data: str) -> str:
            """Custom tool implementation"""
            return f"Processed: {input_data}"
    
    def run(self, port: int = 8002):
        self.app.run(port=port)

if __name__ == "__main__":
    port = int(os.environ.get("CUSTOM_SERVER_PORT", 8002))
    server = CustomMCPServer()
    server.run(port=port)
```

### 2. Configuration Entry

Add to `mcp_config.json`:

```json
"custom_server": {
  "name": "Custom MCP Server",
  "description": "Custom server implementation",
  "category": "custom",
  "command": "python",
  "args": ["custom_mcp_server.py"],
  "enabled": true,
  "auto_start": true,
  "connection": {
    "host": "localhost",
    "port": 8002
  },
  "environment": {
    "CUSTOM_SERVER_PORT": "8002"
  },
  "capabilities": ["custom_processing"],
  "priority": 5
}
```

### 3. Tool Registration

Tools are automatically discovered and registered with the LangChain agent. Tool names are prefixed with the server ID for namespace isolation.

## Troubleshooting

### Common Issues

#### Server Won't Start

1. **Check port availability**
   ```bash
   netstat -an | grep :8001
   ```

2. **Verify command exists**
   ```bash
   which python
   ```

3. **Check configuration validation**
   ```bash
   python mcp_validator.py mcp_config.json --report
   ```

#### Health Check Failures

1. **Check server logs** in the console output
2. **Verify network connectivity** to the server port
3. **Adjust health check settings** (increase timeout/interval)

#### Configuration Errors

1. **Validate against schema**
   ```bash
   python mcp_validator.py mcp_config.json
   ```

2. **Check for port conflicts** in the configuration
3. **Verify environment variables** are properly set

### Validation Command

Use the built-in validator for detailed configuration analysis:

```bash
# Basic validation
python mcp_validator.py mcp_config.json

# Detailed report
python mcp_validator.py mcp_config.json --report
```

### Logging

The system provides comprehensive logging:

- **INFO** - General operational information
- **WARNING** - Non-critical issues and recommendations
- **ERROR** - Critical errors requiring attention

Log levels can be configured in the global settings.

## Best Practices

### Configuration

1. **Use descriptive names** for servers and tools
2. **Set appropriate priorities** for startup order
3. **Configure health checks** based on server characteristics
4. **Use environment variables** for sensitive configuration
5. **Validate configuration** before deployment

### Server Development

1. **Implement proper error handling** in tools
2. **Use type hints** for tool parameters
3. **Provide clear tool descriptions** for the LLM
4. **Test tools independently** before integration
5. **Follow naming conventions** for consistency

### Monitoring

1. **Monitor server health** through the web UI
2. **Check logs regularly** for issues
3. **Set up alerts** for critical server failures
4. **Monitor resource usage** for performance optimization

## Advanced Features

### Health Monitoring

The system includes automated health monitoring with:

- **Periodic health checks** at configurable intervals
- **Automatic recovery** for failed servers
- **Failure threshold** configuration
- **Health status reporting** in the web UI

### Dynamic Configuration

- **Hot reload** configuration changes
- **Runtime server management** (start/stop/restart)
- **Dynamic port allocation** to avoid conflicts
- **Configuration validation** with detailed error reporting

### Web Management Interface

Access the management interface at `/mcp_manager.html` for:

- **Real-time server status** monitoring
- **Server control** (start/stop/restart)
- **Configuration validation** results
- **Performance metrics** and uptime tracking

## Migration Guide

### From Legacy MCP Tools

The new system is backward compatible with the existing `load_mcp_tools()` function. No code changes are required for existing implementations.

### Configuration Migration

1. **Backup existing configuration**
2. **Update to new schema format**
3. **Add enhanced configuration options**
4. **Validate new configuration**
5. **Test server startup and functionality**

## Support

For issues and questions:

1. **Check the troubleshooting section** above
2. **Validate your configuration** using the validator
3. **Review server logs** for error details
4. **Use the web UI** for real-time monitoring
5. **Create an issue** with detailed error information

---

This enhanced MCP system provides a robust, scalable foundation for specialized AI tool servers with comprehensive management and monitoring capabilities.