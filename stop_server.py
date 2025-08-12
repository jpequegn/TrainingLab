#!/usr/bin/env python3
"""
Simple script to forcefully stop the workout server
"""
import subprocess
import sys

def stop_server():
    """Find and kill all server.py processes"""
    try:
        print("[SEARCH] Searching for running server processes...")
        
        # Find all python processes running server.py
        result = subprocess.run([
            'wmic', 'process', 'where', 
            "commandline like '%server.py%' and name='python.exe'", 
            'get', 'processid,commandline'
        ], capture_output=True, text=True, check=True)
        
        lines = result.stdout.strip().split('\n')
        pids = []
        
        for line in lines[1:]:  # Skip header
            if line.strip() and 'server.py' in line:
                parts = line.strip().split()
                if parts:
                    pid = parts[-1]  # Last part is usually the PID
                    try:
                        pid = int(pid)
                        pids.append(pid)
                        print(f"[FOUND] Server process: PID {pid}")
                    except ValueError:
                        continue
        
        if not pids:
            print("[OK] No server processes found running")
            return True
        
        # Kill each process
        killed_count = 0
        for pid in pids:
            try:
                subprocess.run(['taskkill', '/F', '/PID', str(pid)], 
                             check=True, capture_output=True)
                print(f"[KILL] Killed process PID {pid}")
                killed_count += 1
            except subprocess.CalledProcessError as e:
                print(f"[WARN] Could not kill PID {pid}: {e}")
        
        if killed_count > 0:
            print(f"[SUCCESS] Successfully killed {killed_count} server process(es)")
            
            # Also kill any remaining MCP server processes
            try:
                subprocess.run([
                    'wmic', 'process', 'where', 
                    "commandline like '%workout_mcp_server.py%'", 
                    'delete'
                ], capture_output=True)
                print("[CLEANUP] Cleaned up MCP server processes")
            except Exception:
                pass
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Error finding processes: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("[STOP] Workout Server Stopper")
    print("=" * 30)
    
    success = stop_server()
    
    if success:
        print("\n[DONE] Server shutdown complete!")
        print("\n[TIP] If Ctrl+C doesn't work in the future, just run:")
        print("   python stop_server.py")
    else:
        print("\n[ERROR] Failed to stop server. You may need to:")
        print("   1. Close the terminal window running the server")
        print("   2. Restart your terminal")
        print("   3. Use Task Manager to kill python.exe processes")
    
    sys.exit(0 if success else 1)