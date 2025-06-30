import json
from langchain.tools import Tool
from fastmcp.client import FastMCPClient

def load_mcp_tools(config_path="mcp_config.json"):
    tools = []
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)

        for server_config in config.get("mcp_servers", []):
            base_url = server_config["base_url"]
            client = FastMCPClient(base_url=base_url)
            for tool_config in server_config.get("tools", []):
                tool_name = tool_config["name"]
                tool_description = tool_config["description"]
                # The endpoint is not directly used by FastMCPClient for tool invocation
                # FastMCPClient invokes tools by their name
                parameters = tool_config.get("parameters", {})

                def _run_tool(**kwargs):
                    try:
                        # FastMCPClient dynamically exposes tools as methods
                        # We need to get the tool method by name
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
                        args_schema=parameters  # This will be used by LangChain to validate inputs
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
