import json
import subprocess
import time
from langchain.tools import Tool
from fastmcp import Client

def load_mcp_tools(config_path="mcp_config.json"):
    tools = []
    mcp_processes = [] # To keep track of launched MCP server processes

    try:
        with open(config_path, 'r') as f:
            config = json.load(f)

        for server_name, server_config in config.get("mcp_servers", {}).items():
            command = server_config["command"]
            args = server_config.get("args", [])
            full_command = [command] + args

            print(f"Launching MCP server '{server_name}' with command: {' '.join(full_command)}")
            # Launch the MCP server as a subprocess
            # Redirect stdout/stderr to avoid blocking and capture output if needed
            process = subprocess.Popen(full_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            mcp_processes.append(process)

            # For now, assume a default base_url and that the server starts quickly
            # In a real scenario, you might need to parse process.stdout for the actual URL
            # or implement a more robust readiness check.
            base_url = f"http://localhost:8000/{server_name}" # Example: Adjust based on actual MCP server output
            print(f"Attempting to connect to MCP server at {base_url}")
            time.sleep(5) # Give the server some time to start

            try:
                client = Client(base_url=base_url)
                # Discover tools from the running MCP server
                discovered_tools = client.list_tools()
                print(f"Discovered tools for {server_name}: {discovered_tools}")

                for tool_info in discovered_tools:
                    tool_name = tool_info["name"]
                    tool_description = tool_info.get("description", "No description provided.")
                    parameters = tool_info.get("parameters", {})

                    def _run_tool(**kwargs):
                        try:
                            tool_method = getattr(client, tool_name)
                            result = tool_method(**kwargs)
                            return str(result)
                        except Exception as e:
                            return f"Error calling MCP tool {tool_name}: {e}"

                    tools.append(
                        Tool(
                            name=tool_name,
                            description=tool_description,
                            func=_run_tool,
                            args_schema=parameters
                        )
                    )
            except Exception as e:
                print(f"Could not connect to or discover tools from MCP server {server_name} at {base_url}: {e}")

    except FileNotFoundError:
        print(f"Configuration file not found: {config_path}")
    except json.JSONDecodeError:
        print(f"Error decoding JSON from {config_path}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        # Important: In a production system, you'd need a more robust way to manage
        # these subprocesses, e.g., ensuring they are terminated when the main server stops.
        # For this example, they will remain running until explicitly killed.
        pass

    return tools, mcp_processes

def terminate_mcp_processes(processes):
    """Fast and responsive MCP process termination"""
    if not processes:
        return
    
    print(f"Terminating {len(processes)} MCP processes...")
    
    # Step 1: Send terminate signal to all processes simultaneously
    active_processes = []
    for p in processes:
        if p.poll() is None:  # Check if process is still running
            print(f"Terminating MCP process {p.pid}")
            p.terminate()
            active_processes.append(p)
    
    if not active_processes:
        print("No active MCP processes to terminate.")
        return
    
    # Step 2: Wait for graceful termination with reduced timeout
    timeout_start = time.time()
    timeout_duration = 2  # Reduced from 5 seconds to 2 seconds
    
    while active_processes and (time.time() - timeout_start) < timeout_duration:
        active_processes = [p for p in active_processes if p.poll() is None]
        if active_processes:
            time.sleep(0.1)  # Small delay before checking again
    
    # Step 3: Force kill remaining processes
    if active_processes:
        print(f"Force killing {len(active_processes)} unresponsive MCP processes...")
        for p in active_processes:
            if p.poll() is None:
                print(f"Killing MCP process {p.pid}")
                try:
                    p.kill()
                    p.wait(timeout=1)  # Brief wait for kill to complete
                except Exception as e:
                    print(f"Error killing MCP process {p.pid}: {e}")
    
    print("MCP process termination complete.")

if __name__ == "__main__":
    # Example usage:
    mcp_tools = load_mcp_tools()
    for tool in mcp_tools:
        print(f"Tool Name: {tool.name}")
        print(f"Description: {tool.description}")
        print(f"Args Schema: {tool.args_schema}")
        print("---")