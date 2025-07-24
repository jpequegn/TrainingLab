"""
MCP Configuration Validator
Provides validation and error handling for MCP server configurations.
"""

import json
import jsonschema
import os
import socket
import subprocess
import shutil
from typing import Dict, List, Any, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class MCPConfigValidator:
    """Validator for MCP server configurations"""
    
    def __init__(self, schema_path: str = "mcp_config_schema.json"):
        self.schema_path = schema_path
        self.schema = self._load_schema()
    
    def _load_schema(self) -> Optional[Dict[str, Any]]:
        """Load JSON schema for validation"""
        try:
            if os.path.exists(self.schema_path):
                with open(self.schema_path, 'r') as f:
                    return json.load(f)
            else:
                logger.warning(f"Schema file not found: {self.schema_path}")
                return None
        except Exception as e:
            logger.error(f"Failed to load schema: {e}")
            return None
    
    def validate_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate complete MCP configuration
        
        Args:
            config: Configuration dictionary to validate
            
        Returns:
            Validation result with errors, warnings, and recommendations
        """
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "recommendations": [],
            "server_validations": {}
        }
        
        # Schema validation
        if self.schema:
            try:
                jsonschema.validate(config, self.schema)
                logger.info("✅ Configuration passed schema validation")
            except jsonschema.ValidationError as e:
                result["valid"] = False
                result["errors"].append(f"Schema validation failed: {e.message}")
                logger.error(f"Schema validation error: {e.message}")
        
        # Validate individual servers
        mcp_servers = config.get("mcp_servers", {})
        for server_id, server_config in mcp_servers.items():
            server_validation = self.validate_server(server_id, server_config)
            result["server_validations"][server_id] = server_validation
            
            if not server_validation["valid"]:
                result["valid"] = False
                result["errors"].extend([f"[{server_id}] {err}" for err in server_validation["errors"]])
            
            result["warnings"].extend([f"[{server_id}] {warn}" for warn in server_validation["warnings"]])
            result["recommendations"].extend([f"[{server_id}] {rec}" for rec in server_validation["recommendations"]])
        
        # Global validations
        self._validate_global_settings(config, result)
        self._validate_port_conflicts(config, result)
        self._validate_priorities(config, result)
        
        return result
    
    def validate_server(self, server_id: str, server_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate individual server configuration
        
        Args:
            server_id: Server identifier
            server_config: Server configuration dictionary
            
        Returns:
            Server validation result
        """
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "recommendations": []
        }
        
        # Required fields validation
        self._validate_required_fields(server_config, result)
        
        # Command validation
        self._validate_command(server_config, result)
        
        # Connection validation
        self._validate_connection(server_config, result)
        
        # Health check validation
        self._validate_health_check(server_config, result)
        
        # Environment validation
        self._validate_environment(server_config, result)
        
        # Category and capabilities validation
        self._validate_categories_capabilities(server_config, result)
        
        return result
    
    def _validate_required_fields(self, server_config: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate required server fields"""
        required_fields = ["command"]
        
        for field in required_fields:
            if field not in server_config:
                result["valid"] = False
                result["errors"].append(f"Missing required field: {field}")
        
        # Recommended fields
        recommended_fields = ["name", "description", "category"]
        for field in recommended_fields:
            if field not in server_config:
                result["recommendations"].append(f"Consider adding '{field}' for better organization")
    
    def _validate_command(self, server_config: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate server command and arguments"""
        command = server_config.get("command")
        if not command:
            return
        
        # Check if command exists
        if not shutil.which(command):
            result["warnings"].append(f"Command '{command}' not found in PATH")
        
        # Validate arguments
        args = server_config.get("args", [])
        if not isinstance(args, list):
            result["errors"].append("Server args must be a list")
            result["valid"] = False
        
        # Security check for dangerous commands
        dangerous_commands = ["rm", "del", "format", "sudo", "su"]
        if any(dangerous in command.lower() for dangerous in dangerous_commands):
            result["warnings"].append(f"Potentially dangerous command detected: {command}")
    
    def _validate_connection(self, server_config: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate connection settings"""
        connection = server_config.get("connection", {})
        
        if "port" in connection:
            port = connection["port"]
            if not isinstance(port, int) or port < 1 or port > 65535:
                result["errors"].append(f"Invalid port number: {port}")
                result["valid"] = False
            elif port < 1024:
                result["warnings"].append(f"Port {port} requires elevated privileges")
        
        if "host" in connection:
            host = connection["host"]
            if not isinstance(host, str) or not host.strip():
                result["errors"].append("Host must be a non-empty string")
                result["valid"] = False
        
        startup_delay = connection.get("startup_delay", 3)
        if not isinstance(startup_delay, int) or startup_delay < 0:
            result["warnings"].append("startup_delay should be a non-negative integer")
    
    def _validate_health_check(self, server_config: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate health check configuration"""
        health_check = server_config.get("health_check", {})
        
        if not isinstance(health_check, dict):
            result["errors"].append("health_check must be an object")
            result["valid"] = False
            return
        
        # Validate intervals and timeouts
        interval = health_check.get("interval", 30)
        timeout = health_check.get("timeout", 10)
        retry_count = health_check.get("retry_count", 3)
        
        if not isinstance(interval, int) or interval < 5:
            result["warnings"].append("Health check interval should be at least 5 seconds")
        
        if not isinstance(timeout, int) or timeout < 1:
            result["warnings"].append("Health check timeout should be at least 1 second")
        
        if timeout >= interval:
            result["warnings"].append("Health check timeout should be less than interval")
        
        if not isinstance(retry_count, int) or retry_count < 1:
            result["warnings"].append("Health check retry_count should be at least 1")
    
    def _validate_environment(self, server_config: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate environment variables"""
        environment = server_config.get("environment", {})
        
        if not isinstance(environment, dict):
            result["errors"].append("environment must be an object")
            result["valid"] = False
            return
        
        # Check environment variable naming
        for var_name, var_value in environment.items():
            if not isinstance(var_name, str) or not var_name.replace("_", "").replace("-", "").isalnum():
                result["warnings"].append(f"Environment variable name '{var_name}' may be invalid")
            
            if not isinstance(var_value, str):
                result["warnings"].append(f"Environment variable '{var_name}' should be a string")
    
    def _validate_categories_capabilities(self, server_config: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate category and capabilities"""
        valid_categories = ["workout", "testing", "automation", "data", "ai", "custom"]
        category = server_config.get("category", "custom")
        
        if category not in valid_categories:
            result["warnings"].append(f"Unknown category '{category}'. Valid categories: {', '.join(valid_categories)}")
        
        capabilities = server_config.get("capabilities", [])
        if capabilities and not isinstance(capabilities, list):
            result["errors"].append("capabilities must be a list")
            result["valid"] = False
        
        tags = server_config.get("tags", [])
        if tags and not isinstance(tags, list):
            result["errors"].append("tags must be a list")
            result["valid"] = False
    
    def _validate_global_settings(self, config: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate global settings"""
        global_settings = config.get("global_settings", {})
        
        max_concurrent = global_settings.get("max_concurrent_servers", 10)
        if not isinstance(max_concurrent, int) or max_concurrent < 1:
            result["warnings"].append("max_concurrent_servers should be a positive integer")
        
        startup_timeout = global_settings.get("startup_timeout", 30)
        if not isinstance(startup_timeout, int) or startup_timeout < 5:
            result["warnings"].append("startup_timeout should be at least 5 seconds")
        
        # Validate port range
        port_range = global_settings.get("port_range", {})
        if port_range:
            start_port = port_range.get("start", 8000)
            end_port = port_range.get("end", 9000)
            
            if not isinstance(start_port, int) or not isinstance(end_port, int):
                result["errors"].append("Port range start and end must be integers")
                result["valid"] = False
            elif start_port >= end_port:
                result["errors"].append("Port range start must be less than end")
                result["valid"] = False
            elif end_port - start_port < 10:
                result["warnings"].append("Small port range may cause conflicts with multiple servers")
    
    def _validate_port_conflicts(self, config: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Check for port conflicts between servers"""
        used_ports = set()
        mcp_servers = config.get("mcp_servers", {})
        
        for server_id, server_config in mcp_servers.items():
            connection = server_config.get("connection", {})
            if "port" in connection:
                port = connection["port"]
                if port in used_ports:
                    result["errors"].append(f"Port conflict: Multiple servers trying to use port {port}")
                    result["valid"] = False
                else:
                    used_ports.add(port)
                    
                    # Check if port is already in use
                    if self._is_port_in_use(port):
                        result["warnings"].append(f"Port {port} appears to be already in use")
    
    def _validate_priorities(self, config: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Validate server priorities for startup order"""
        mcp_servers = config.get("mcp_servers", {})
        priorities = []
        
        for server_id, server_config in mcp_servers.items():
            priority = server_config.get("priority", 5)
            if not isinstance(priority, int) or priority < 1 or priority > 10:
                result["warnings"].append(f"Server '{server_id}' has invalid priority {priority} (should be 1-10)")
            else:
                priorities.append((server_id, priority))
        
        # Check for duplicate priorities
        priority_counts = {}
        for server_id, priority in priorities:
            if priority in priority_counts:
                priority_counts[priority].append(server_id)
            else:
                priority_counts[priority] = [server_id]
        
        for priority, servers in priority_counts.items():
            if len(servers) > 1:
                result["recommendations"].append(
                    f"Multiple servers have priority {priority}: {', '.join(servers)}. "
                    "Consider using different priorities for deterministic startup order"
                )
    
    def _is_port_in_use(self, port: int) -> bool:
        """Check if a port is currently in use"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                result = s.connect_ex(('localhost', port))
                return result == 0
        except Exception:
            return False
    
    def validate_server_executable(self, server_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Test if a server can be started (dry run)
        
        Args:
            server_config: Server configuration to test
            
        Returns:
            Test result with details
        """
        result = {
            "can_start": True,
            "errors": [],
            "warnings": [],
            "info": []
        }
        
        command = server_config.get("command")
        args = server_config.get("args", [])
        
        if not command:
            result["can_start"] = False
            result["errors"].append("No command specified")
            return result
        
        # Check command exists
        if not shutil.which(command):
            result["can_start"] = False
            result["errors"].append(f"Command '{command}' not found in PATH")
            return result
        
        # Try to get version or help (non-destructive test)
        test_commands = [
            [command, "--version"],
            [command, "-v"],
            [command, "--help"],
            [command, "-h"]
        ]
        
        for test_cmd in test_commands:
            try:
                process = subprocess.run(
                    test_cmd,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if process.returncode == 0:
                    result["info"].append(f"Command responds to {' '.join(test_cmd[1:])}")
                    break
            except subprocess.TimeoutExpired:
                result["warnings"].append("Command test timed out")
                break
            except Exception as e:
                result["warnings"].append(f"Command test failed: {e}")
        
        # Check environment variables
        environment = server_config.get("environment", {})
        for var_name, var_value in environment.items():
            if not var_value or var_value.strip() == "":
                result["warnings"].append(f"Environment variable '{var_name}' is empty")
        
        return result
    
    def generate_config_report(self, config: Dict[str, Any]) -> str:
        """
        Generate a comprehensive configuration report
        
        Args:
            config: Configuration to analyze
            
        Returns:
            Formatted report string
        """
        validation = self.validate_config(config)
        
        report = []
        report.append("=" * 60)
        report.append("MCP CONFIGURATION VALIDATION REPORT")
        report.append("=" * 60)
        report.append("")
        
        # Summary
        report.append("SUMMARY:")
        report.append(f"  Overall Status: {'✅ VALID' if validation['valid'] else '❌ INVALID'}")
        report.append(f"  Servers: {len(config.get('mcp_servers', {}))}")
        report.append(f"  Errors: {len(validation['errors'])}")
        report.append(f"  Warnings: {len(validation['warnings'])}")
        report.append(f"  Recommendations: {len(validation['recommendations'])}")
        report.append("")
        
        # Errors
        if validation["errors"]:
            report.append("ERRORS:")
            for error in validation["errors"]:
                report.append(f"  ❌ {error}")
            report.append("")
        
        # Warnings
        if validation["warnings"]:
            report.append("WARNINGS:")
            for warning in validation["warnings"]:
                report.append(f"  ⚠️ {warning}")
            report.append("")
        
        # Recommendations
        if validation["recommendations"]:
            report.append("RECOMMENDATIONS:")
            for rec in validation["recommendations"]:
                report.append(f"  💡 {rec}")
            report.append("")
        
        # Server details
        if validation["server_validations"]:
            report.append("SERVER DETAILS:")
            for server_id, server_val in validation["server_validations"].items():
                status = "✅ VALID" if server_val["valid"] else "❌ INVALID"
                report.append(f"  {server_id}: {status}")
                
                if server_val["errors"]:
                    for error in server_val["errors"]:
                        report.append(f"    ❌ {error}")
                
                if server_val["warnings"]:
                    for warning in server_val["warnings"]:
                        report.append(f"    ⚠️ {warning}")
            report.append("")
        
        report.append("=" * 60)
        
        return "\n".join(report)

def main():
    """CLI interface for validation"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate MCP server configuration")
    parser.add_argument("config_file", help="Path to MCP configuration file")
    parser.add_argument("--schema", help="Path to JSON schema file", default="mcp_config_schema.json")
    parser.add_argument("--report", help="Generate detailed report", action="store_true")
    
    args = parser.parse_args()
    
    try:
        with open(args.config_file, 'r') as f:
            config = json.load(f)
        
        validator = MCPConfigValidator(args.schema)
        
        if args.report:
            report = validator.generate_config_report(config)
            print(report)
        else:
            result = validator.validate_config(config)
            if result["valid"]:
                print("✅ Configuration is valid")
            else:
                print("❌ Configuration has errors:")
                for error in result["errors"]:
                    print(f"  - {error}")
                
                if result["warnings"]:
                    print("\nWarnings:")
                    for warning in result["warnings"]:
                        print(f"  - {warning}")
        
    except Exception as e:
        print(f"❌ Failed to validate configuration: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())