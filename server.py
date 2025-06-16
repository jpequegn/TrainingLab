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
        else:
            self.send_response(404)
            self.end_headers()

def main():
    port = 53218
    
    # Change to the directory containing the HTML files
    os.chdir(Path(__file__).parent)
    
    with socketserver.TCPServer(("0.0.0.0", port), CORSHTTPRequestHandler) as httpd:
        print(f"🚴‍♂️ Zwift Workout Visualizer server running at:")
        print(f"   Local: http://localhost:{port}")
        print(f"   Network: https://work-1-jpkjjijvsbmtuklc.prod-runtime.all-hands.dev")
        print(f"\nPress Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")
            sys.exit(0)

if __name__ == "__main__":
    main()