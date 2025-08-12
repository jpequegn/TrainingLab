#!/usr/bin/env python3
"""
Simple HTTP server for the Zwift Workout Visualizer
"""

import http.server
import socketserver
import socket
import os
import sys
import json
import signal
import threading
import time
from pathlib import Path
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from mcp_manager import load_mcp_tools, terminate_mcp_processes, MCPManager

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Enhanced HTTP request handler with CORS support and comprehensive error handling"""
    
    # Class-level shared instances
    llm = None
    agent_executor = None
    mcp_processes = []  # Store MCP server processes (legacy)
    mcp_manager = None  # Enhanced MCP manager
    
    # Request routing configuration
    POST_ROUTES = {
        '/deploy': '_handle_deploy',
        '/chat': '_handle_chat',
        '/mcp/start/': '_handle_mcp_start',
        '/mcp/stop/': '_handle_mcp_stop', 
        '/mcp/restart/': '_handle_mcp_restart'
    }
    
    GET_ROUTES = {
        '/mcp/status': '_handle_mcp_status',
        '/mcp/validate': '_handle_mcp_validate',
        '/health': '_handle_health',
        '/health/ready': '_handle_readiness',
        '/health/live': '_handle_liveness',
        '/metrics': '_handle_metrics'
    }

    @classmethod
    def initialize_agent(cls):
        try:
            load_dotenv()
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                print("[ERROR] OPENAI_API_KEY not set. LLM functionality will be disabled.")
                print("[INFO] Create a .env file with: OPENAI_API_KEY=your_key_here")
                print("[INFO] Get an API key from: https://platform.openai.com/api-keys")
                cls.llm = None # Explicitly set LLM to None if API key is missing
                cls.agent_executor = None
                return

            print("[INFO] Initializing OpenAI LLM with API key...")
            cls.llm = ChatOpenAI(model="gpt-4o-mini", api_key=api_key)
            
            print("[INFO] Loading MCP tools...")
            cls.mcp_manager = MCPManager()
            mcp_tools, cls.mcp_processes = load_mcp_tools()

            print("📝 Creating agent prompt template...")
            prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", "You are a helpful assistant for Zwift workouts. You have access to the following tools:"),
                    MessagesPlaceholder(variable_name="chat_history"),
                    ("human", "{input}"),
                    MessagesPlaceholder(variable_name="agent_scratchpad"),
                ]
            )

            print("🤖 Creating LangChain agent...")
            agent = create_tool_calling_agent(cls.llm, mcp_tools, prompt)
            cls.agent_executor = AgentExecutor(agent=agent, tools=mcp_tools, verbose=True)
            
            print("[SUCCESS] LLM agent initialized successfully!")
            
        except Exception as e:
            error_type = type(e).__name__
            print(f"[ERROR] Failed to initialize LLM agent: {error_type}: {e}")
            print("[INFO] Troubleshooting:")
            
            if "openai" in str(e).lower() or "api" in str(e).lower():
                if "api_key" in str(e).lower() or "authentication" in str(e).lower():
                    print("   • Check your OpenAI API key is valid")
                    print("   • Verify the key at: https://platform.openai.com/api-keys")
                elif "rate" in str(e).lower() or "quota" in str(e).lower():
                    print("   • Check your OpenAI usage limits")
                    print("   • Visit: https://platform.openai.com/usage")
                else:
                    print("   • Check your internet connection")
                    print("   • Verify OpenAI service status: https://status.openai.com")
            else:
                print("   • Check all dependencies are installed")
                print("   • Verify the .env file is in the correct location")
            
            cls.llm = None
            cls.agent_executor = None

    def end_headers(self):
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Security headers
        self.add_security_headers()
        super().end_headers()
    
    def add_security_headers(self):
        """Add comprehensive security headers"""
        # Content Security Policy
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "connect-src 'self' https://api.openai.com; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        self.send_header('Content-Security-Policy', csp_policy)
        
        # Additional security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
        
        # Remove server information disclosure
        self.send_header('Server', 'WkoLibrary/1.0')

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        """Handle POST requests with improved error handling and routing"""
        try:
            # Route to appropriate handler
            handler_name = None
            for route, handler in self.POST_ROUTES.items():
                if self.path == route or (route.endswith('/') and self.path.startswith(route)):
                    handler_name = handler
                    break
            
            if handler_name:
                handler_method = getattr(self, handler_name)
                handler_method()
            else:
                self._send_error_response(404, 'Endpoint not found')
                
        except Exception as e:
            print(f"❌ Error handling POST request to {self.path}: {e}")
            self._send_error_response(500, f'Internal server error: {str(e)}')
    
    def _handle_deploy(self):
        """Handle workout deployment requests with enhanced security validation"""
        try:
            data = self._parse_json_request()
            if not data:
                return
            
            # Validate required fields
            required_fields = ['name', 'content']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                self._send_error_response(400, f'Missing required fields: {", ".join(missing_fields)}')
                return
            
            # Enhanced input validation
            validation_result = self._validate_workout_content(data['content'])
            if not validation_result['valid']:
                self._send_error_response(400, f'Invalid workout content: {validation_result["error"]}')
                return
                
            name_validation = self._validate_workout_name(data['name'])
            if not name_validation['valid']:
                self._send_error_response(400, f'Invalid workout name: {name_validation["error"]}')
                return
            
            # Get the Zwift workout directory
            zwift_dir = os.path.expanduser('~/Documents/Zwift/Workouts')
            os.makedirs(zwift_dir, exist_ok=True)
            
            # Sanitize filename
            safe_name = self._sanitize_filename(data['name'])
            workout_path = os.path.join(zwift_dir, f"{safe_name}.zwo")
            
            # Additional path traversal protection
            if not os.path.abspath(workout_path).startswith(os.path.abspath(zwift_dir)):
                self._send_error_response(400, 'Invalid workout path')
                return
            
            # Save the workout file
            with open(workout_path, 'w', encoding='utf-8') as f:
                f.write(data['content'])
            
            self._send_json_response({'success': True, 'path': workout_path})
            
        except Exception as e:
            print(f"❌ Error deploying workout: {e}")
            self._send_error_response(500, f'Failed to deploy workout: {str(e)}')
    def _handle_chat(self):
        """Handle chat requests with LLM"""
        try:
            data = self._parse_json_request()
            if not data:
                return
                
            user_message = data.get('message', '').strip()
            if not user_message:
                self._send_error_response(400, 'Message cannot be empty')
                return

            if not CORSHTTPRequestHandler.agent_executor:
                diagnostic_reply = self._get_llm_diagnostic_message()
                self._send_json_response({'reply': diagnostic_reply}, status_code=500)
                return

            try:
                # Process LLM request
                result = CORSHTTPRequestHandler.agent_executor.invoke(
                    {"input": user_message, "chat_history": []}
                )
                reply = result['output']
                self._send_json_response({'reply': reply})
                
            except Exception as e:
                print(f"❌ Error processing LLM request: {e}")
                reply = self._categorize_llm_error(e)
                self._send_json_response({'reply': reply})
                
        except Exception as e:
            print(f"❌ Error handling chat request: {e}")
            self._send_error_response(500, f'Failed to process chat request: {str(e)}')
    def _handle_mcp_status(self):
        """Handle MCP server status requests"""
        if not self._check_mcp_manager():
            return
            
        try:
            servers_status = {}
            for server_id in CORSHTTPRequestHandler.mcp_manager.servers:
                servers_status[server_id] = CORSHTTPRequestHandler.mcp_manager.get_server_status(server_id)
            
            self._send_json_response({'servers': servers_status})
            
        except Exception as e:
            print(f"❌ Error getting MCP status: {e}")
            self._send_error_response(500, f'Failed to get MCP status: {str(e)}')
    
    def _handle_mcp_start(self):
        """Handle MCP server start requests"""
        if not self._check_mcp_manager():
            return
            
        try:
            data = self._parse_json_request()
            if not data:
                return
                
            server_id = data.get('server_id')
            if not server_id:
                self._send_error_response(400, 'server_id is required')
                return
            
            success = CORSHTTPRequestHandler.mcp_manager.start_server(server_id)
            status = CORSHTTPRequestHandler.mcp_manager.get_server_status(server_id)
            
            self._send_json_response({'success': success, 'status': status})
            
        except Exception as e:
            print(f"❌ Error starting MCP server: {e}")
            self._send_error_response(500, f'Failed to start server: {str(e)}')
    
    def _handle_mcp_stop(self):
        """Handle MCP server stop requests"""
        if not self._check_mcp_manager():
            return
            
        try:
            data = self._parse_json_request()
            if not data:
                return
                
            server_id = data.get('server_id')
            if not server_id:
                self._send_error_response(400, 'server_id is required')
                return
            
            success = CORSHTTPRequestHandler.mcp_manager.stop_server(server_id)
            self._send_json_response({'success': success})
            
        except Exception as e:
            print(f"❌ Error stopping MCP server: {e}")
            self._send_error_response(500, f'Failed to stop server: {str(e)}')
    
    def _handle_mcp_restart(self):
        """Handle MCP server restart requests"""
        if not self._check_mcp_manager():
            return
            
        try:
            data = self._parse_json_request()
            if not data:
                return
                
            server_id = data.get('server_id')
            if not server_id:
                self._send_error_response(400, 'server_id is required')
                return
            
            success = CORSHTTPRequestHandler.mcp_manager.restart_server(server_id)
            status = CORSHTTPRequestHandler.mcp_manager.get_server_status(server_id)
            
            self._send_json_response({'success': success, 'status': status})
            
        except Exception as e:
            print(f"❌ Error restarting MCP server: {e}")
            self._send_error_response(500, f'Failed to restart server: {str(e)}')
    
    def _handle_mcp_validate(self):
        """Handle MCP configuration validation requests"""
        if not self._check_mcp_manager():
            return
            
        try:
            validation_result = CORSHTTPRequestHandler.mcp_manager.validator.validate_config(
                CORSHTTPRequestHandler.mcp_manager.config
            )
            
            self._send_json_response(validation_result)
            
        except Exception as e:
            print(f"❌ Error validating MCP configuration: {e}")
            self._send_error_response(500, f'Failed to validate configuration: {str(e)}')

    def _handle_health(self):
        """Handle comprehensive application health check"""
        import psutil
        import time
        
        try:
            health_data = {
                'status': 'healthy',
                'timestamp': time.time(),
                'version': '1.0.0',
                'checks': {
                    'server': {'status': 'up', 'message': 'HTTP server operational'},
                    'mcp_manager': self._check_mcp_health(),
                    'system_resources': self._check_system_resources(),
                    'dependencies': self._check_dependencies()
                }
            }
            
            # Determine overall health status
            failed_checks = [name for name, check in health_data['checks'].items() 
                           if check['status'] != 'healthy' and check['status'] != 'up']
            
            if failed_checks:
                health_data['status'] = 'degraded' if len(failed_checks) < len(health_data['checks']) / 2 else 'unhealthy'
                
            response_code = 200 if health_data['status'] == 'healthy' else 503
            self._send_json_response(health_data, status_code=response_code)
            
        except Exception as e:
            error_response = {
                'status': 'unhealthy',
                'timestamp': time.time(),
                'error': str(e)
            }
            self._send_json_response(error_response, status_code=503)

    def _handle_readiness(self):
        """Handle readiness probe for container orchestration"""
        try:
            readiness_checks = {
                'server_ready': True,
                'mcp_manager_initialized': CORSHTTPRequestHandler.mcp_manager is not None,
                'dependencies_loaded': self._check_critical_dependencies()
            }
            
            all_ready = all(readiness_checks.values())
            status = 'ready' if all_ready else 'not_ready'
            
            response = {
                'status': status,
                'timestamp': time.time(),
                'checks': readiness_checks
            }
            
            response_code = 200 if all_ready else 503
            self._send_json_response(response, status_code=response_code)
            
        except Exception as e:
            self._send_json_response({
                'status': 'not_ready',
                'timestamp': time.time(),
                'error': str(e)
            }, status_code=503)

    def _handle_liveness(self):
        """Handle liveness probe for container orchestration"""
        try:
            # Simple liveness check - if we can respond, we're alive
            response = {
                'status': 'alive',
                'timestamp': time.time(),
                'uptime_seconds': time.time() - getattr(self, 'start_time', time.time())
            }
            self._send_json_response(response, status_code=200)
            
        except Exception as e:
            # If we can't even handle this simple request, we're not alive
            self._send_json_response({
                'status': 'dead',
                'timestamp': time.time(),
                'error': str(e)
            }, status_code=503)

    def _handle_metrics(self):
        """Handle metrics endpoint for monitoring"""
        import psutil
        
        try:
            # Get system metrics
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            metrics = {
                'system': {
                    'cpu_usage_percent': cpu_usage,
                    'memory_usage_percent': memory.percent,
                    'memory_available_mb': memory.available // (1024 * 1024),
                    'disk_usage_percent': disk.percent,
                    'disk_free_gb': disk.free // (1024 * 1024 * 1024)
                },
                'application': {
                    'mcp_servers_active': len(getattr(CORSHTTPRequestHandler.mcp_manager, 'servers', {})) if CORSHTTPRequestHandler.mcp_manager else 0,
                    'llm_initialized': CORSHTTPRequestHandler.llm is not None,
                    'agent_initialized': CORSHTTPRequestHandler.agent_executor is not None
                },
                'timestamp': time.time()
            }
            
            self._send_json_response(metrics)
            
        except Exception as e:
            self._send_error_response(500, f'Failed to collect metrics: {str(e)}')

    def _check_mcp_health(self):
        """Check MCP manager and servers health"""
        try:
            if CORSHTTPRequestHandler.mcp_manager is None:
                return {'status': 'unhealthy', 'message': 'MCP Manager not initialized'}
            
            server_count = len(CORSHTTPRequestHandler.mcp_manager.servers)
            healthy_servers = sum(1 for server in CORSHTTPRequestHandler.mcp_manager.servers.values() 
                                if server.status == 'running')
            
            if server_count == 0:
                return {'status': 'warning', 'message': 'No MCP servers configured'}
            elif healthy_servers == server_count:
                return {'status': 'healthy', 'message': f'All {server_count} MCP servers running'}
            else:
                return {'status': 'degraded', 'message': f'{healthy_servers}/{server_count} MCP servers running'}
                
        except Exception as e:
            return {'status': 'unhealthy', 'message': f'MCP health check failed: {str(e)}'}

    def _check_system_resources(self):
        """Check system resource availability"""
        try:
            import psutil
            
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Define thresholds
            cpu_critical = 90
            memory_critical = 90
            disk_critical = 95
            
            issues = []
            if cpu_usage > cpu_critical:
                issues.append(f'High CPU usage: {cpu_usage:.1f}%')
            if memory.percent > memory_critical:
                issues.append(f'High memory usage: {memory.percent:.1f}%')
            if disk.percent > disk_critical:
                issues.append(f'High disk usage: {disk.percent:.1f}%')
            
            if issues:
                return {'status': 'warning', 'message': '; '.join(issues)}
            else:
                return {'status': 'healthy', 'message': 'System resources within normal limits'}
                
        except Exception as e:
            return {'status': 'unhealthy', 'message': f'Resource check failed: {str(e)}'}

    def _check_dependencies(self):
        """Check critical application dependencies"""
        try:
            dependencies = []
            
            # Check OpenAI API connectivity
            if CORSHTTPRequestHandler.llm is not None:
                dependencies.append('OpenAI API: Connected')
            else:
                dependencies.append('OpenAI API: Not configured')
            
            # Check file system access
            import os
            if os.access('.', os.R_OK | os.W_OK):
                dependencies.append('File system: Accessible')
            else:
                dependencies.append('File system: Access denied')
            
            return {'status': 'healthy', 'message': '; '.join(dependencies)}
            
        except Exception as e:
            return {'status': 'unhealthy', 'message': f'Dependency check failed: {str(e)}'}

    def _check_critical_dependencies(self):
        """Check if critical dependencies are ready"""
        try:
            # Check if we can access the file system
            import os
            return os.access('.', os.R_OK | os.W_OK)
        except:
            return False

    # Helper methods
    
    def _parse_json_request(self):
        """Parse JSON request body with error handling"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._send_error_response(400, 'Request body is required')
                return None
                
            post_data = self.rfile.read(content_length)
            return json.loads(post_data.decode('utf-8'))
            
        except json.JSONDecodeError as e:
            self._send_error_response(400, f'Invalid JSON: {str(e)}')
            return None
        except Exception as e:
            self._send_error_response(400, f'Failed to parse request: {str(e)}')
            return None
    
    def _send_json_response(self, data, status_code=200):
        """Send JSON response with proper headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response_data = json.dumps(data, ensure_ascii=False)
        self.wfile.write(response_data.encode('utf-8'))
    
    def _send_error_response(self, status_code, message):
        """Send error response with consistent format"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        error_data = {'error': message, 'status': status_code}
        self.wfile.write(json.dumps(error_data).encode('utf-8'))
    
    def _sanitize_filename(self, filename):
        """Sanitize filename to prevent path traversal attacks"""
        import re
        # Remove any path separators and dangerous characters
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Limit length and strip whitespace
        return safe_name.strip()[:100]
    
    def _validate_workout_content(self, content):
        """Validate workout content for security and format"""
        import xml.etree.ElementTree as ET
        
        try:
            # File size validation (10MB limit)
            if len(content) > 10_000_000:
                return {'valid': False, 'error': f'Content too large: {len(content)} bytes (max: 10MB)'}
            
            # XML bomb protection - check for entity declarations
            if '<!ENTITY' in content:
                return {'valid': False, 'error': 'XML entities are not allowed'}
            
            # Check for external DTD references
            if '<!DOCTYPE' in content and 'SYSTEM' in content:
                return {'valid': False, 'error': 'External DTD references are not allowed'}
            
            # Check for potentially dangerous processing instructions
            dangerous_pi = ['<?php', '<?xml-stylesheet', '<?import']
            for pi in dangerous_pi:
                if pi in content:
                    return {'valid': False, 'error': f'Dangerous processing instruction detected: {pi}'}
            
            # Basic XML structure validation
            try:
                doc = ET.fromstring(content)
                # Validate it's a workout file
                if doc.tag != 'workout_file':
                    return {'valid': False, 'error': 'Not a valid Zwift workout file (missing workout_file root)'}
            except ET.ParseError as e:
                return {'valid': False, 'error': f'Invalid XML structure: {str(e)}'}
            
            return {'valid': True, 'error': None}
            
        except Exception as e:
            return {'valid': False, 'error': f'Content validation failed: {str(e)}'}
    
    def _validate_workout_name(self, name):
        """Validate workout name for security"""
        try:
            # Length validation
            if not name or len(name.strip()) == 0:
                return {'valid': False, 'error': 'Workout name cannot be empty'}
            
            if len(name) > 200:
                return {'valid': False, 'error': f'Workout name too long: {len(name)} chars (max: 200)'}
            
            # Check for dangerous characters
            dangerous_chars = ['<', '>', '"', "'", '&', '\x00', '\n', '\r', '\t']
            for char in dangerous_chars:
                if char in name:
                    return {'valid': False, 'error': f'Invalid character in workout name: {repr(char)}'}
            
            # Check for path traversal attempts
            if '..' in name or '/' in name or '\\' in name:
                return {'valid': False, 'error': 'Path separators not allowed in workout name'}
            
            return {'valid': True, 'error': None}
            
        except Exception as e:
            return {'valid': False, 'error': f'Name validation failed: {str(e)}'}
    
    def _check_mcp_manager(self):
        """Check if MCP manager is initialized"""
        if not CORSHTTPRequestHandler.mcp_manager:
            self._send_error_response(500, 'MCP manager not initialized')
            return False
        return True
    
    def _get_llm_diagnostic_message(self):
        """Get diagnostic message for LLM initialization issues"""
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return "❌ **LLM Configuration Error**\n\nOpenAI API key not found.\n\n**Troubleshooting Steps:**\n1. Create a `.env` file in the project root\n2. Add your OpenAI API key: `OPENAI_API_KEY=your_key_here`\n3. Get an API key from https://platform.openai.com/api-keys\n4. Restart the server after adding the key\n\n**Current Status:** No API key detected in environment variables"
        else:
            return "❌ **LLM Initialization Error**\n\nThe LLM agent failed to initialize despite having an API key.\n\n**Troubleshooting Steps:**\n1. Verify your API key is valid at https://platform.openai.com/api-keys\n2. Check your OpenAI account has sufficient credits\n3. Restart the server to retry initialization\n4. Check the server console for detailed error messages\n\n**Current Status:** API key present but agent initialization failed"
    
    def _categorize_llm_error(self, error):
        """Categorize LLM errors and provide specific guidance"""
        error_type = type(error).__name__
        error_message = str(error).lower()
        
        if "openai" in error_message or "api" in error_message:
            if "api_key" in error_message or "authentication" in error_message:
                return f"❌ **Authentication Error**\n\nThe OpenAI API key is invalid or missing.\n\n**Troubleshooting Steps:**\n1. Check that your .env file contains: `OPENAI_API_KEY=your_key_here`\n2. Verify your API key is valid at https://platform.openai.com/api-keys\n3. Restart the server after updating the .env file\n\n**Technical Details:** {error_type}: {error_message}"
            elif "rate" in error_message or "quota" in error_message:
                return f"❌ **Rate Limit/Quota Error**\n\nYou've exceeded your OpenAI API usage limits.\n\n**Troubleshooting Steps:**\n1. Check your usage at https://platform.openai.com/usage\n2. Upgrade your OpenAI plan if needed\n3. Wait for rate limits to reset (usually 1 minute)\n\n**Technical Details:** {error_type}: {error_message}"
            elif "connection" in error_message or "timeout" in error_message:
                return f"❌ **Network Connection Error**\n\nUnable to connect to OpenAI servers.\n\n**Troubleshooting Steps:**\n1. Check your internet connection\n2. Try again in a few moments\n3. Check OpenAI status at https://status.openai.com\n\n**Technical Details:** {error_type}: {error_message}"
        elif "mcp" in error_message or "tool" in error_message:
            return f"❌ **Tool Execution Error**\n\nError occurred while executing workout generation tools.\n\n**Troubleshooting Steps:**\n1. Check that all required dependencies are installed\n2. Verify the workout instructions are properly formatted\n3. Try a simpler workout description\n\n**Technical Details:** {error_type}: {error_message}"
        elif "json" in error_message or "parse" in error_message:
            return f"❌ **Data Processing Error**\n\nError occurred while processing the workout data.\n\n**Troubleshooting Steps:**\n1. Check that your workout description follows the expected format\n2. Try simplifying the workout structure\n3. Check the debug output for malformed data\n\n**Technical Details:** {error_type}: {error_message}"
        
        # Generic error
        return f"❌ **Unexpected Error**\n\nAn unexpected error occurred during workout generation.\n\n**Troubleshooting Steps:**\n1. Try refreshing the page and submitting again\n2. Check the browser console for additional errors\n3. Verify all system requirements are met\n4. Try using local generation mode instead\n\n**Technical Details:** {error_type}: {str(error)}\n\n**Need Help?** Check the console logs or try a simpler workout description."

    def do_GET(self):
        """Handle GET requests with improved error handling and routing"""
        try:
            # Route to appropriate handler
            handler_name = None
            for route, handler in self.GET_ROUTES.items():
                if self.path == route or (route.endswith('/') and self.path.startswith(route)):
                    handler_name = handler
                    break
            
            if handler_name:
                handler_method = getattr(self, handler_name)
                handler_method()
                return
                
        except Exception as e:
            print(f"❌ Error handling GET request to {self.path}: {e}")
            self._send_error_response(500, f'Internal server error: {str(e)}')
            return
            
        # Fall back to parent implementation for file serving
        if self.path.startswith('/workouts'):
            # List Zwift/Workouts directory
            zwift_dir = os.path.expanduser('~/Documents/Zwift/Workouts')
            rel_path = self.path[len('/workouts'):].lstrip('/')
            target_dir = os.path.join(zwift_dir, rel_path)
            if not os.path.exists(target_dir):
                self.send_response(404)
                self.end_headers()
                return
            items = []
            for entry in os.scandir(target_dir):
                items.append({
                    'name': entry.name,
                    'is_dir': entry.is_dir(),
                    'path': os.path.relpath(entry.path, zwift_dir)
                })
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'items': items}).encode('utf-8'))
        elif self.path.startswith('/workout?file='):
            # Return the content of a .zwo file
            from urllib.parse import unquote
            zwift_dir = os.path.expanduser('~/Documents/Zwift/Workouts')
            file_param = self.path[len('/workout?file='):]
            file_path = os.path.join(zwift_dir, unquote(file_param))
            if not os.path.isfile(file_path):
                self.send_response(404)
                self.end_headers()
                return
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'content': content}).encode('utf-8'))
        else:
            super().do_GET()

def find_available_port(start_port=3000):
    """Find an available port starting from the given port number"""
    for port in range(start_port, start_port + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('0.0.0.0', port))
                return port
            except OSError:
                continue
    raise RuntimeError("Could not find an available port")

# Global shutdown flag for cross-platform compatibility
shutdown_flag_file = "server_shutdown.flag"
shutdown_event = threading.Event()

def signal_handler(signum, frame):
    """Handle Ctrl+C and other termination signals gracefully"""
    print(f"\n\n[SHUTDOWN] Received signal {signum}. Shutting down server...")
    
    # Create shutdown flag file and set event
    try:
        with open(shutdown_flag_file, 'w') as f:
            f.write(str(os.getpid()))
        print(f"[SHUTDOWN] Created shutdown flag: {shutdown_flag_file}")
    except Exception as e:
        print(f"[SHUTDOWN] Error creating shutdown flag: {e}")
    
    shutdown_event.set()
    
    # Terminate MCP processes
    try:
        terminate_mcp_processes(CORSHTTPRequestHandler.mcp_processes)
        print("[SHUTDOWN] MCP processes terminated.")
    except Exception as e:
        print(f"[SHUTDOWN] Error terminating MCP processes: {e}")
    
    print("[SHUTDOWN] Server stopped.")
    # Force exit immediately on Windows
    os._exit(0)

def check_shutdown_flag():
    """Check if shutdown flag file exists"""
    return os.path.exists(shutdown_flag_file)

def cleanup_shutdown_flag():
    """Remove shutdown flag file"""
    try:
        if os.path.exists(shutdown_flag_file):
            os.remove(shutdown_flag_file)
            print(f"[CLEANUP] Removed shutdown flag: {shutdown_flag_file}")
    except Exception as e:
        print(f"[CLEANUP] Error removing shutdown flag: {e}")

def main():
    port = find_available_port()
    print(f"[INFO] Using port: {port}")
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, signal_handler)  # Terminate signal
    
    # Change to the directory containing the HTML files
    os.chdir(Path(__file__).parent)

    # Initialize the LangChain agent
    CORSHTTPRequestHandler.initialize_agent()
    
    # Clean up any existing shutdown flag
    cleanup_shutdown_flag()
    
    # Clear shutdown event
    shutdown_event.clear()
    
    with socketserver.TCPServer(("0.0.0.0", port), CORSHTTPRequestHandler) as httpd:
        # Configure socket options for better shutdown behavior
        httpd.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        print("[INFO] Zwift Workout Visualizer server running at:")
        print(f"   Local: http://localhost:{port}")
        print("   Network: https://work-1-jpkjjijvsbmtuklc.prod-runtime.all-hands.dev")
        print("\nPress Ctrl+C to stop the server")
        
        # Start server in a separate thread
        def run_server():
            print("[DEBUG] Server thread started")
            httpd.serve_forever()
            print("[DEBUG] Server thread ended")
        
        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()
        
        try:
            # Main thread watches for shutdown signal or file
            print("[DEBUG] Monitoring for shutdown signal...")
            print("[TIP] To stop the server manually, create a file named 'server_shutdown.flag' or press Ctrl+C")
            while not (shutdown_event.is_set() or check_shutdown_flag()):
                time.sleep(0.5)  # Check every 500ms
            
            print("[SHUTDOWN] Shutdown signal received, stopping server...")
            httpd.shutdown()
            httpd.server_close()
            cleanup_shutdown_flag()
            
        except KeyboardInterrupt:
            # Direct Ctrl+C handling as fallback
            print("\n\n[FALLBACK] KeyboardInterrupt caught. Shutting down...")
            shutdown_event.set()
            httpd.shutdown()
            httpd.server_close()
            terminate_mcp_processes(CORSHTTPRequestHandler.mcp_processes)
            os._exit(0)
        except Exception as e:
            print(f"\n\n[ERROR] Server error: {e}")
            shutdown_event.set()
            httpd.shutdown()
            httpd.server_close()
            terminate_mcp_processes(CORSHTTPRequestHandler.mcp_processes)
            os._exit(1)
        
        print("[SHUTDOWN] Server cleanup completed.")

if __name__ == "__main__":
    main()