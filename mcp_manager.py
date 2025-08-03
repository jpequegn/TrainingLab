"""
Enhanced MCP Server Manager
Provides dynamic loading, health monitoring, and runtime management of MCP servers.
"""

import json
import subprocess
import time
import threading
import logging
import os
import socket
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
import jsonschema
from langchain.tools import Tool
from fastmcp import Client
from mcp_validator import MCPConfigValidator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ServerStatus(Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    UNHEALTHY = "unhealthy"
    FAILED = "failed"

@dataclass
class ServerHealth:
    status: ServerStatus = ServerStatus.STOPPED
    last_check: float = field(default_factory=time.time)
    failure_count: int = 0
    error_message: Optional[str] = None
    uptime: float = 0
    start_time: Optional[float] = None

@dataclass
class MCP_Server:
    id: str
    config: Dict[str, Any]
    process: Optional[subprocess.Popen] = None
    client: Optional[Client] = None
    health: ServerHealth = field(default_factory=ServerHealth)
    tools: List[Tool] = field(default_factory=list)
    port: Optional[int] = None

class MCPManager:
    """Enhanced MCP Server Manager with dynamic loading and health monitoring"""
    
    def __init__(self, config_path: str = "mcp_config.json", schema_path: str = "mcp_config_schema.json"):
        self.config_path = config_path
        self.schema_path = schema_path
        self.servers: Dict[str, MCP_Server] = {}
        self.config: Dict[str, Any] = {}
        self.health_monitor_thread: Optional[threading.Thread] = None
        self.monitoring_active = False
        self.port_pool = set()
        self.validator = MCPConfigValidator(schema_path)
        self._load_config()
        
    def _load_config(self) -> None:
        """Load and validate configuration"""
        try:
            # Load configuration
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
            
            # Validate configuration with comprehensive validation
            validation_result = self.validator.validate_config(self.config)
            if validation_result["valid"]:
                logger.info("✅ Configuration validated successfully")
            else:
                logger.error("❌ Configuration validation failed:")
                for error in validation_result["errors"]:
                    logger.error(f"  - {error}")
                raise ValueError(f"Configuration validation failed: {validation_result['errors']}")
            
            # Log warnings and recommendations
            for warning in validation_result["warnings"]:
                logger.warning(f"⚠️ {warning}")
            for rec in validation_result["recommendations"]:
                logger.info(f"💡 {rec}")
            
            # Initialize port pool
            global_settings = self.config.get("global_settings", {})
            port_range = global_settings.get("port_range", {"start": 8000, "end": 9000})
            self.port_pool = set(range(port_range["start"], port_range["end"] + 1))
            
            logger.info(f"📝 Loaded configuration with {len(self.config.get('mcp_servers', {}))} servers")
            
        except FileNotFoundError:
            logger.error(f"❌ Configuration file not found: {self.config_path}")
            self.config = {"mcp_servers": {}, "global_settings": {}}
        except jsonschema.ValidationError as e:
            logger.error(f"❌ Configuration validation failed: {e.message}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"❌ Invalid JSON in configuration: {e}")
            raise
    
    def _find_available_port(self) -> int:
        """Find an available port from the pool"""
        for port in sorted(self.port_pool):
            if self._is_port_available(port):
                self.port_pool.remove(port)
                return port
        raise RuntimeError("No available ports in the configured range")
    
    def _is_port_available(self, port: int) -> bool:
        """Check if a port is available"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('localhost', port))
                return True
            except OSError:
                return False
    
    def _create_server_instance(self, server_id: str, server_config: Dict[str, Any]) -> MCP_Server:
        """Create a new server instance"""
        # Assign port if not specified
        if "connection" in server_config and "port" not in server_config["connection"]:
            server_config["connection"]["port"] = self._find_available_port()
        elif "connection" not in server_config:
            server_config["connection"] = {"host": "localhost", "port": self._find_available_port()}
        
        server = MCP_Server(id=server_id, config=server_config)
        server.port = server_config["connection"].get("port")
        return server
    
    def start_server(self, server_id: str) -> bool:
        """Start a specific MCP server"""
        if server_id not in self.config.get("mcp_servers", {}):
            logger.error(f"❌ Server '{server_id}' not found in configuration")
            return False
        
        server_config = self.config["mcp_servers"][server_id]
        
        # Check if server is disabled
        if not server_config.get("enabled", True):
            logger.info(f"⏭️ Server '{server_id}' is disabled, skipping")
            return False
        
        # Create server instance if doesn't exist
        if server_id not in self.servers:
            self.servers[server_id] = self._create_server_instance(server_id, server_config)
        
        server = self.servers[server_id]
        
        # Check if already running
        if server.health.status == ServerStatus.RUNNING:
            logger.info(f"✅ Server '{server_id}' is already running")
            return True
        
        try:
            server.health.status = ServerStatus.STARTING
            server.health.start_time = time.time()
            
            # Prepare command and environment
            command = [server_config["command"]] + server_config.get("args", [])
            env = os.environ.copy()
            env.update(server_config.get("environment", {}))
            
            logger.info(f"🚀 Starting MCP server '{server_id}': {' '.join(command)}")
            
            # Start process
            server.process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env
            )
            
            # Wait for startup
            startup_delay = server_config.get("connection", {}).get("startup_delay", 3)
            time.sleep(startup_delay)
            
            # Check if process is still running
            if server.process.poll() is not None:
                stdout, stderr = server.process.communicate()
                error_msg = f"Process exited with code {server.process.returncode}. stderr: {stderr}"
                logger.error(f"❌ Server '{server_id}' failed to start: {error_msg}")
                server.health.status = ServerStatus.FAILED
                server.health.error_message = error_msg
                return False
            
            # Try to connect
            if self._connect_to_server(server):
                server.health.status = ServerStatus.RUNNING
                server.health.failure_count = 0
                server.health.error_message = None
                logger.info(f"✅ Server '{server_id}' started successfully with {len(server.tools)} tools")
                return True
            else:
                server.health.status = ServerStatus.FAILED
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to start server '{server_id}': {e}")
            server.health.status = ServerStatus.FAILED
            server.health.error_message = str(e)
            return False
    
    def _connect_to_server(self, server: MCP_Server) -> bool:
        """Connect to a server and discover tools"""
        try:
            # Determine base URL
            connection = server.config.get("connection", {})
            if "base_url" in connection:
                base_url = connection["base_url"]
            else:
                host = connection.get("host", "localhost")
                port = connection.get("port", server.port)
                base_url = f"http://{host}:{port}"
            
            logger.info(f"🔗 Connecting to server '{server.id}' at {base_url}")
            
            # Create client
            server.client = Client(base_url=base_url)
            
            # Discover tools
            discovered_tools = server.client.list_tools()
            logger.info(f"🔍 Discovered {len(discovered_tools)} tools for '{server.id}': {[t.get('name') for t in discovered_tools]}")
            
            # Create LangChain tools
            server.tools.clear()
            for tool_info in discovered_tools:
                tool_name = tool_info["name"]
                tool_description = tool_info.get("description", "No description provided.")
                parameters = tool_info.get("parameters", {})
                
                def create_tool_func(client, name):
                    def _run_tool(**kwargs):
                        try:
                            tool_method = getattr(client, name)
                            result = tool_method(**kwargs)
                            return str(result)
                        except Exception as e:
                            logger.error(f"❌ Error calling MCP tool {name}: {e}")
                            return f"Error calling MCP tool {name}: {e}"
                    return _run_tool
                
                server.tools.append(
                    Tool(
                        name=f"{server.id}_{tool_name}",
                        description=f"[{server.id}] {tool_description}",
                        func=create_tool_func(server.client, tool_name),
                        args_schema=parameters
                    )
                )
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to server '{server.id}': {e}")
            server.health.error_message = str(e)
            return False
    
    def stop_server(self, server_id: str) -> bool:
        """Stop a specific MCP server"""
        if server_id not in self.servers:
            logger.warning(f"⚠️ Server '{server_id}' is not running")
            return True
        
        server = self.servers[server_id]
        
        try:
            if server.process and server.process.poll() is None:
                logger.info(f"🛑 Stopping server '{server_id}'")
                server.process.terminate()
                
                # Wait for graceful shutdown
                try:
                    server.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning(f"⚠️ Force killing server '{server_id}'")
                    server.process.kill()
                    server.process.wait()
            
            # Clean up
            server.health.status = ServerStatus.STOPPED
            server.client = None
            server.tools.clear()
            
            # Return port to pool
            if server.port:
                self.port_pool.add(server.port)
            
            logger.info(f"✅ Server '{server_id}' stopped successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error stopping server '{server_id}': {e}")
            return False
    
    def restart_server(self, server_id: str) -> bool:
        """Restart a specific MCP server"""
        logger.info(f"🔄 Restarting server '{server_id}'")
        self.stop_server(server_id)
        time.sleep(1)  # Brief pause
        return self.start_server(server_id)
    
    def start_all_servers(self) -> Dict[str, bool]:
        """Start all enabled servers"""
        results = {}
        server_configs = self.config.get("mcp_servers", {})
        
        # Sort by priority (lower number = higher priority)
        sorted_servers = sorted(
            server_configs.items(),
            key=lambda x: x[1].get("priority", 5)
        )
        
        for server_id, server_config in sorted_servers:
            if server_config.get("auto_start", True):
                results[server_id] = self.start_server(server_id)
            else:
                logger.info(f"⏭️ Skipping server '{server_id}' (auto_start disabled)")
                results[server_id] = False
        
        return results
    
    def stop_all_servers(self) -> None:
        """Stop all running servers"""
        logger.info("🛑 Stopping all MCP servers")
        for server_id in list(self.servers.keys()):
            self.stop_server(server_id)
    
    def get_server_status(self, server_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed status of a server"""
        if server_id not in self.servers:
            return None
        
        server = self.servers[server_id]
        return {
            "id": server.id,
            "name": server.config.get("name", server.id),
            "status": server.health.status.value,
            "uptime": time.time() - server.health.start_time if server.health.start_time else 0,
            "last_check": server.health.last_check,
            "failure_count": server.health.failure_count,
            "error_message": server.health.error_message,
            "tools_count": len(server.tools),
            "port": server.port,
            "category": server.config.get("category", "unknown"),
            "capabilities": server.config.get("capabilities", [])
        }
    
    def get_all_tools(self) -> List[Tool]:
        """Get all tools from all running servers"""
        all_tools = []
        for server in self.servers.values():
            if server.health.status == ServerStatus.RUNNING:
                all_tools.extend(server.tools)
        return all_tools
    
    def get_tools_by_category(self, category: str) -> List[Tool]:
        """Get tools from servers of a specific category"""
        tools = []
        for server in self.servers.values():
            if (server.health.status == ServerStatus.RUNNING and 
                server.config.get("category") == category):
                tools.extend(server.tools)
        return tools
    
    def start_health_monitoring(self) -> None:
        """Start background health monitoring"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.health_monitor_thread = threading.Thread(target=self._health_monitor_loop, daemon=True)
        self.health_monitor_thread.start()
        logger.info("🏥 Health monitoring started")
    
    def stop_health_monitoring(self) -> None:
        """Stop background health monitoring"""
        self.monitoring_active = False
        if self.health_monitor_thread:
            self.health_monitor_thread.join(timeout=5)
        logger.info("🏥 Health monitoring stopped")
    
    def _health_monitor_loop(self) -> None:
        """Background health monitoring loop"""
        while self.monitoring_active:
            try:
                for server_id, server in self.servers.items():
                    if server.health.status == ServerStatus.RUNNING:
                        self._check_server_health(server)
                
                time.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"❌ Health monitoring error: {e}")
                time.sleep(30)  # Wait longer on error
    
    def _check_server_health(self, server: MCP_Server) -> None:
        """Check health of a specific server"""
        health_config = server.config.get("health_check", {})
        if not health_config.get("enabled", True):
            return
        
        interval = health_config.get("interval", 30)
        if time.time() - server.health.last_check < interval:
            return
        
        try:
            # Simple health check - try to list tools
            if server.client:
                server.client.list_tools()
                server.health.last_check = time.time()
                server.health.failure_count = 0
                server.health.error_message = None
            else:
                raise Exception("No client connection")
                
        except Exception as e:
            server.health.failure_count += 1
            server.health.error_message = str(e)
            server.health.last_check = time.time()
            
            retry_count = health_config.get("retry_count", 3)
            if server.health.failure_count >= retry_count:
                logger.warning(f"⚠️ Server '{server.id}' failed health check {server.health.failure_count} times")
                server.health.status = ServerStatus.UNHEALTHY
                
                # Auto-recovery if enabled
                if self.config.get("global_settings", {}).get("auto_recovery", True):
                    logger.info(f"🔄 Attempting auto-recovery for '{server.id}'")
                    if self.restart_server(server.id):
                        logger.info(f"✅ Auto-recovery successful for '{server.id}'")
                    else:
                        logger.error(f"❌ Auto-recovery failed for '{server.id}'")

def load_mcp_tools(config_path: str = "mcp_config.json") -> Tuple[List[Tool], List[subprocess.Popen]]:
    """
    Legacy function for backward compatibility
    Returns tools and processes for existing code
    """
    manager = MCPManager(config_path)
    manager.start_all_servers()
    manager.start_health_monitoring()
    
    # Extract processes for legacy compatibility
    processes = []
    for server in manager.servers.values():
        if server.process:
            processes.append(server.process)
    
    tools = manager.get_all_tools()
    
    # Store manager instance globally for cleanup
    global _global_mcp_manager
    _global_mcp_manager = manager
    
    return tools, processes

def terminate_mcp_processes(processes: List[subprocess.Popen]) -> None:
    """Legacy function for backward compatibility"""
    global _global_mcp_manager
    if '_global_mcp_manager' in globals() and _global_mcp_manager:
        _global_mcp_manager.stop_all_servers()
        _global_mcp_manager.stop_health_monitoring()

# Global manager instance for legacy compatibility
_global_mcp_manager: Optional[MCPManager] = None