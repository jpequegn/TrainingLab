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
from mcp_tools import load_mcp_tools, terminate_mcp_processes

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    llm = None
    agent_executor = None
    mcp_processes = [] # Store MCP server processes

    @classmethod
    def initialize_agent(cls):
        load_dotenv()
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            print("Error: OPENAI_API_KEY not set. LLM functionality will be disabled.")
            cls.llm = None # Explicitly set LLM to None if API key is missing
            cls.agent_executor = None
            return

        cls.llm = ChatOpenAI(model="gpt-4o-mini", api_key=api_key)
        mcp_tools, cls.mcp_processes = load_mcp_tools()

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", "You are a helpful assistant for Zwift workouts. You have access to the following tools:"),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )

        agent = create_tool_calling_agent(cls.llm, mcp_tools, prompt)
        cls.agent_executor = AgentExecutor(agent=agent, tools=mcp_tools, verbose=True)

    def end_headers(self):

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
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
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'reply': 'LLM agent not initialized.'}).encode('utf-8'))
                return

            try:
                # For simplicity, we're not maintaining chat history in this example
                # You would typically load/store chat history here
                result = CORSHTTPRequestHandler.agent_executor.invoke(
                    {"input": user_message, "chat_history": []}
                )
                reply = result['output']
            except Exception as e:
                reply = f'Error processing LLM request: {e}'

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'reply': reply}).encode('utf-8'))
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