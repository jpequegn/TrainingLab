#!/usr/bin/env python3
"""
Simple test HTTP server for E2E tests
Stripped down version without MCP dependencies
"""

import http.server
import socketserver
import os
import sys
import json
from pathlib import Path

class TestHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Simple HTTP request handler for testing"""
    
    def end_headers(self):
        # CORS headers for testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        """Handle POST requests for testing"""
        try:
            if self.path == '/deploy':
                self._handle_deploy()
            elif self.path == '/chat':
                self._handle_chat()
            else:
                self._send_error_response(404, 'Endpoint not found')
        except Exception as e:
            print(f"Error handling POST request: {e}")
            self._send_error_response(500, f'Internal server error: {str(e)}')
    
    def _handle_deploy(self):
        """Simple deploy handler for testing"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._send_error_response(400, 'Request body is required')
                return
                
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            if 'name' not in data or 'content' not in data:
                self._send_error_response(400, 'Missing required fields: name, content')
                return
            
            # For testing, just return success
            self._send_json_response({'success': True, 'path': f'/tmp/{data["name"]}.zwo'})
            
        except Exception as e:
            self._send_error_response(500, f'Failed to deploy workout: {str(e)}')
    
    def _handle_chat(self):
        """Simple chat handler for testing"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            message = data.get('message', '')
            # Return a simple test response
            self._send_json_response({
                'reply': f'Test server received: {message}'
            })
            
        except Exception as e:
            self._send_error_response(500, f'Failed to process chat: {str(e)}')
    
    def _send_json_response(self, data, status_code=200):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response_data = json.dumps(data, ensure_ascii=False)
        self.wfile.write(response_data.encode('utf-8'))
    
    def _send_error_response(self, status_code, message):
        """Send error response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        error_data = {'error': message, 'status': status_code}
        self.wfile.write(json.dumps(error_data).encode('utf-8'))

def main():
    port = 53218
    
    # Change to the directory containing the HTML files
    os.chdir(Path(__file__).parent)
    
    with socketserver.TCPServer(("0.0.0.0", port), TestHTTPRequestHandler) as httpd:
        print(f"Test server running at http://localhost:{port}")
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nTest server stopped.")
            sys.exit(0)

if __name__ == "__main__":
    main()