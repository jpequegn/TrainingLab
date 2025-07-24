#!/usr/bin/env python3
"""
Simple HTTP server for the Zwift Workout Visualizer
"""

import http.server
import socketserver
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
import requests
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from mcp_manager import load_mcp_tools, terminate_mcp_processes, MCPManager

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    llm = None
    agent_executor = None
    mcp_processes = [] # Store MCP server processes (legacy)
    mcp_manager = None # Enhanced MCP manager

    @classmethod
    def initialize_agent(cls):
        try:
            load_dotenv()
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                print("❌ Error: OPENAI_API_KEY not set. LLM functionality will be disabled.")
                print("📝 Create a .env file with: OPENAI_API_KEY=your_key_here")
                print("🔑 Get an API key from: https://platform.openai.com/api-keys")
                cls.llm = None # Explicitly set LLM to None if API key is missing
                cls.agent_executor = None
                return

            print("🔑 Initializing OpenAI LLM with API key...")
            cls.llm = ChatOpenAI(model="gpt-4o-mini", api_key=api_key)
            
            print("🛠️ Loading MCP tools...")
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
            
            print("✅ LLM agent initialized successfully!")
            
        except Exception as e:
            error_type = type(e).__name__
            print(f"❌ Failed to initialize LLM agent: {error_type}: {e}")
            print("🔧 Troubleshooting:")
            
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
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/deploy':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Get the Zwift workout directory
            zwift_dir = os.path.expanduser('~/Documents/Zwift/Workouts')
            if not os.path.exists(zwift_dir):
                os.makedirs(zwift_dir)
            
            # Save the workout file
            workout_path = os.path.join(zwift_dir, f"{data['name']}.zwo")
            with open(workout_path, 'w', encoding='utf-8') as f:
                f.write(data['content'])
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'path': workout_path}).encode('utf-8'))
        elif self.path == '/chat':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            user_message = data.get('message', '')

            if not CORSHTTPRequestHandler.agent_executor:
                # Enhanced LLM initialization error with diagnostics
                api_key = os.getenv('OPENAI_API_KEY')
                if not api_key:
                    diagnostic_reply = "❌ **LLM Configuration Error**\n\nOpenAI API key not found.\n\n**Troubleshooting Steps:**\n1. Create a `.env` file in the project root\n2. Add your OpenAI API key: `OPENAI_API_KEY=your_key_here`\n3. Get an API key from https://platform.openai.com/api-keys\n4. Restart the server after adding the key\n\n**Current Status:** No API key detected in environment variables"
                else:
                    # API key exists but initialization failed
                    diagnostic_reply = "❌ **LLM Initialization Error**\n\nThe LLM agent failed to initialize despite having an API key.\n\n**Troubleshooting Steps:**\n1. Verify your API key is valid at https://platform.openai.com/api-keys\n2. Check your OpenAI account has sufficient credits\n3. Restart the server to retry initialization\n4. Check the server console for detailed error messages\n\n**Current Status:** API key present but agent initialization failed"
                
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'reply': diagnostic_reply}).encode('utf-8'))
                return

            try:
                # For simplicity, we're not maintaining chat history in this example
                # You would typically load/store chat history here
                result = CORSHTTPRequestHandler.agent_executor.invoke(
                    {"input": user_message, "chat_history": []}
                )
                reply = result['output']
            except Exception as e:
                # Enhanced error handling with detailed diagnostics
                error_type = type(e).__name__
                error_message = str(e)
                
                # Categorize common LLM errors and provide specific guidance
                if "openai" in error_message.lower() or "api" in error_message.lower():
                    if "api_key" in error_message.lower() or "authentication" in error_message.lower():
                        reply = f"❌ **Authentication Error**\n\nThe OpenAI API key is invalid or missing.\n\n**Troubleshooting Steps:**\n1. Check that your .env file contains: `OPENAI_API_KEY=your_key_here`\n2. Verify your API key is valid at https://platform.openai.com/api-keys\n3. Restart the server after updating the .env file\n\n**Technical Details:** {error_type}: {error_message}"
                    elif "rate" in error_message.lower() or "quota" in error_message.lower():
                        reply = f"❌ **Rate Limit/Quota Error**\n\nYou've exceeded your OpenAI API usage limits.\n\n**Troubleshooting Steps:**\n1. Check your usage at https://platform.openai.com/usage\n2. Upgrade your OpenAI plan if needed\n3. Wait for rate limits to reset (usually 1 minute)\n\n**Technical Details:** {error_type}: {error_message}"
                    elif "connection" in error_message.lower() or "timeout" in error_message.lower():
                        reply = f"❌ **Network Connection Error**\n\nUnable to connect to OpenAI servers.\n\n**Troubleshooting Steps:**\n1. Check your internet connection\n2. Try again in a few moments\n3. Check OpenAI status at https://status.openai.com\n\n**Technical Details:** {error_type}: {error_message}"
                    else:
                        reply = f"❌ **OpenAI API Error**\n\nAn unexpected error occurred with the OpenAI API.\n\n**Troubleshooting Steps:**\n1. Check your API key and account status\n2. Try a simpler request to test connectivity\n3. Check the server logs for more details\n\n**Technical Details:** {error_type}: {error_message}"
                elif "mcp" in error_message.lower() or "tool" in error_message.lower():
                    reply = f"❌ **Tool Execution Error**\n\nError occurred while executing workout generation tools.\n\n**Troubleshooting Steps:**\n1. Check that all required dependencies are installed\n2. Verify the workout instructions are properly formatted\n3. Try a simpler workout description\n\n**Technical Details:** {error_type}: {error_message}"
                elif "json" in error_message.lower() or "parse" in error_message.lower():
                    reply = f"❌ **Data Processing Error**\n\nError occurred while processing the workout data.\n\n**Troubleshooting Steps:**\n1. Check that your workout description follows the expected format\n2. Try simplifying the workout structure\n3. Check the debug output for malformed data\n\n**Technical Details:** {error_type}: {error_message}"
                else:
                    # Generic error with enhanced diagnostics
                    reply = f"❌ **Unexpected Error**\n\nAn unexpected error occurred during workout generation.\n\n**Troubleshooting Steps:**\n1. Try refreshing the page and submitting again\n2. Check the browser console for additional errors\n3. Verify all system requirements are met\n4. Try using local generation mode instead\n\n**Technical Details:** {error_type}: {error_message}\n\n**Need Help?** Check the console logs or try a simpler workout description."

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'reply': reply}).encode('utf-8'))
        elif self.path == '/mcp/status':
            # Get status of all MCP servers
            if not CORSHTTPRequestHandler.mcp_manager:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'MCP manager not initialized'}).encode('utf-8'))
                return
            
            servers_status = {}
            for server_id in CORSHTTPRequestHandler.mcp_manager.servers:
                servers_status[server_id] = CORSHTTPRequestHandler.mcp_manager.get_server_status(server_id)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'servers': servers_status}).encode('utf-8'))
        elif self.path.startswith('/mcp/start/'):
            # Start specific MCP server
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            server_id = data.get('server_id')
            
            if not CORSHTTPRequestHandler.mcp_manager:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'MCP manager not initialized'}).encode('utf-8'))
                return
            
            success = CORSHTTPRequestHandler.mcp_manager.start_server(server_id)
            status = CORSHTTPRequestHandler.mcp_manager.get_server_status(server_id)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': success, 'status': status}).encode('utf-8'))
        elif self.path.startswith('/mcp/stop/'):
            # Stop specific MCP server
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            server_id = data.get('server_id')
            
            if not CORSHTTPRequestHandler.mcp_manager:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'MCP manager not initialized'}).encode('utf-8'))
                return
            
            success = CORSHTTPRequestHandler.mcp_manager.stop_server(server_id)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': success}).encode('utf-8'))
        elif self.path.startswith('/mcp/restart/'):
            # Restart specific MCP server
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            server_id = data.get('server_id')
            
            if not CORSHTTPRequestHandler.mcp_manager:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'MCP manager not initialized'}).encode('utf-8'))
                return
            
            success = CORSHTTPRequestHandler.mcp_manager.restart_server(server_id)
            status = CORSHTTPRequestHandler.mcp_manager.get_server_status(server_id)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': success, 'status': status}).encode('utf-8'))
        elif self.path == '/mcp/validate':
            # Validate MCP configuration
            if not CORSHTTPRequestHandler.mcp_manager:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'MCP manager not initialized'}).encode('utf-8'))
                return
            
            # Get current configuration validation
            validation_result = CORSHTTPRequestHandler.mcp_manager.validator.validate_config(
                CORSHTTPRequestHandler.mcp_manager.config
            )
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(validation_result).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
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

def main():
    port = 53218
    
    # Change to the directory containing the HTML files
    os.chdir(Path(__file__).parent)

    # Initialize the LangChain agent
    CORSHTTPRequestHandler.initialize_agent()
    
    with socketserver.TCPServer(("0.0.0.0", port), CORSHTTPRequestHandler) as httpd:
        print("🚴‍♂️ Zwift Workout Visualizer server running at:")
        print(f"   Local: http://localhost:{port}")
        print("   Network: https://work-1-jpkjjijvsbmtuklc.prod-runtime.all-hands.dev")
        print("\nPress Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")
            terminate_mcp_processes(CORSHTTPRequestHandler.mcp_processes)
            sys.exit(0)

if __name__ == "__main__":
    main()