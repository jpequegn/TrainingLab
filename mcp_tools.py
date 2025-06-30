import json
import requests
from langchain.tools import Tool

def load_mcp_tools(config_path="mcp_config.json"):
    tools = []
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)

        for server_config in config.get("mcp_servers", []):
            base_url = server_config["base_url"]
            for tool_config in server_config.get("tools", []):
                tool_name = tool_config["name"]
                tool_description = tool_config["description"]
                endpoint = tool_config["endpoint"]
                parameters = tool_config.get("parameters", {})

                def _run_tool(args, tool_url=f"{base_url}{endpoint}"):
                    # In a real scenario, you'd parse args based on 'parameters' schema
                    # and handle different HTTP methods (GET/POST) as defined.
                    # For simplicity, this example assumes POST with JSON body.
                    try:
                        response = requests.post(tool_url, json=args)
                        response.raise_for_status()  # Raise an exception for HTTP errors
                        return response.text
                    except requests.exceptions.RequestException as e:
                        return f"Error calling MCP tool {tool_name}: {e}"

                # LangChain Tool expects a single string argument for _run
                # We'll need to parse this string into a dictionary inside _run_tool
                # For now, we'll pass the raw string and handle parsing within _run_tool
                # This will be refined in Phase 2 when integrating with LangChain agents
                tools.append(
                    Tool(
                        name=tool_name,
                        description=tool_description,
                        func=_run_tool,
                        args_schema=parameters # This will be used by LangChain to validate inputs
                    )
                )
    except FileNotFoundError:
        print(f"Configuration file not found: {config_path}")
    except json.JSONDecodeError:
        print(f"Error decoding JSON from {config_path}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    return tools

if __name__ == "__main__":
    # Example usage:
    mcp_tools = load_mcp_tools()
    for tool in mcp_tools:
        print(f"Tool Name: {tool.name}")
        print(f"Description: {tool.description}")
        print(f"Args Schema: {tool.args_schema}")
        print("---")
