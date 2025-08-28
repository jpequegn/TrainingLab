#!/usr/bin/env python3
"""
Configuration Manager for WkoLibrary
Handles environment-specific configuration loading and validation
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import jsonschema

class ConfigurationError(Exception):
    """Raised when configuration is invalid or missing"""
    pass

class ConfigManager:
    """Environment-aware configuration manager"""
    
    def __init__(self, environment: Optional[str] = None):
        self.environment = environment or os.getenv('NODE_ENV', 'development')
        self.config_dir = Path(__file__).parent / 'environments'
        self.schema_path = Path(__file__).parent / 'config_schema.json'
        self._config: Dict[str, Any] = {}
        self._env_vars: Dict[str, str] = {}
        
        # Load configuration
        self._load_environment_variables()
        self._load_config_file()
        self._validate_configuration()
        
    def _load_environment_variables(self):
        """Load environment variables from .env file and system"""
        load_dotenv()
        
        # Get all relevant environment variables
        env_vars = {
            'SERVER_HOST': os.getenv('SERVER_HOST'),
            'SERVER_PORT': os.getenv('SERVER_PORT'),
            'DEBUG_MODE': os.getenv('DEBUG_MODE'),
            'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY'),
            'OPENAI_MODEL': os.getenv('OPENAI_MODEL'),
            'REDIS_URL': os.getenv('REDIS_URL'),
            'LOG_LEVEL': os.getenv('LOG_LEVEL'),
            'SECRET_KEY': os.getenv('SECRET_KEY'),
            'CORS_ALLOWED_ORIGINS': os.getenv('CORS_ALLOWED_ORIGINS'),
            'RATE_LIMIT_PER_MINUTE': os.getenv('RATE_LIMIT_PER_MINUTE'),
            'DATABASE_URL': os.getenv('DATABASE_URL'),
            'ENABLE_METRICS': os.getenv('ENABLE_METRICS'),
        }
        
        # Filter out None values
        self._env_vars = {k: v for k, v in env_vars.items() if v is not None}
        
    def _load_config_file(self):
        """Load configuration from environment-specific JSON file"""
        config_file = self.config_dir / f"{self.environment}.json"
        
        if not config_file.exists():
            raise ConfigurationError(f"Configuration file not found: {config_file}")
        
        try:
            with open(config_file, 'r') as f:
                self._config = json.load(f)
        except json.JSONDecodeError as e:
            raise ConfigurationError(f"Invalid JSON in configuration file {config_file}: {e}")
        except Exception as e:
            raise ConfigurationError(f"Failed to load configuration file {config_file}: {e}")
    
    def _validate_configuration(self):
        """Validate configuration against schema if available"""
        if not self.schema_path.exists():
            logging.warning(f"Configuration schema not found: {self.schema_path}")
            return
        
        try:
            with open(self.schema_path, 'r') as f:
                schema = json.load(f)
            
            jsonschema.validate(self._config, schema)
            logging.info("Configuration validation passed")
            
        except jsonschema.ValidationError as e:
            raise ConfigurationError(f"Configuration validation failed: {e.message}")
        except Exception as e:
            logging.warning(f"Failed to validate configuration: {e}")
    
    def get(self, key: str, default: Any = None, required: bool = False) -> Any:
        """Get configuration value with environment variable override"""
        # Check for environment variable override first
        env_key = key.upper().replace('.', '_')
        if env_key in self._env_vars:
            value = self._env_vars[env_key]
            # Convert string values to appropriate types
            return self._convert_value(value)
        
        # Get from nested config using dot notation
        value = self._get_nested(self._config, key.split('.'), default)
        
        if required and value is None:
            raise ConfigurationError(f"Required configuration key '{key}' not found")
        
        return value
    
    def _get_nested(self, config: Dict[str, Any], keys: list, default: Any) -> Any:
        """Get nested configuration value using dot notation"""
        current = config
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default
        return current
    
    def _convert_value(self, value: str) -> Any:
        """Convert string environment variable to appropriate type"""
        if value.lower() in ('true', 'false'):
            return value.lower() == 'true'
        
        if value.isdigit():
            return int(value)
        
        try:
            return float(value)
        except ValueError:
            pass
        
        # Handle JSON arrays/objects
        if value.startswith('[') or value.startswith('{'):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
        
        return value
    
    def get_server_config(self) -> Dict[str, Any]:
        """Get server-specific configuration"""
        return {
            'host': self.get('server.host', '0.0.0.0'),
            'port': int(self.get('server.port', 8000)),
            'cors_origins': self.get('server.cors_origins', ['*']),
            'request_timeout': self.get('server.request_timeout', 30),
            'max_upload_size_mb': self.get('server.max_upload_size_mb', 10)
        }
    
    def get_logging_config(self) -> Dict[str, Any]:
        """Get logging configuration"""
        return {
            'level': self.get('logging.level', 'INFO'),
            'format': self.get('logging.format', 'simple'),
            'file_logging': self.get('logging.file_logging', False),
            'console_logging': self.get('logging.console_logging', True),
            'log_file': self.get('logging.log_file', 'app.log')
        }
    
    def get_security_config(self) -> Dict[str, Any]:
        """Get security configuration"""
        return {
            'rate_limit_per_minute': self.get('security.rate_limit_per_minute', 60),
            'cors_strict': self.get('security.cors_strict', True),
            'csrf_protection': self.get('security.csrf_protection', True),
            'secure_cookies': self.get('security.secure_cookies', True),
            'force_https': self.get('security.force_https', False)
        }
    
    def get_mcp_config(self) -> Dict[str, Any]:
        """Get MCP configuration"""
        return {
            'health_check_interval': self.get('mcp.health_check_interval', 30),
            'max_retry_attempts': self.get('mcp.max_retry_attempts', 3),
            'timeout_seconds': self.get('mcp.timeout_seconds', 10),
            'auto_restart': self.get('mcp.auto_restart', True)
        }
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == 'production'
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment == 'development'
    
    def is_debug_enabled(self) -> bool:
        """Check if debug mode is enabled"""
        return self.get('debug', False)
    
    def validate_required_env_vars(self):
        """Validate that all required environment variables are set"""
        required_vars = []
        
        if self.get('features.enable_ai_features', True):
            if not os.getenv('OPENAI_API_KEY'):
                required_vars.append('OPENAI_API_KEY')
        
        if self.is_production():
            if not os.getenv('SECRET_KEY'):
                required_vars.append('SECRET_KEY')
        
        if required_vars:
            raise ConfigurationError(
                f"Required environment variables not set: {', '.join(required_vars)}"
            )
    
    def __str__(self) -> str:
        """String representation of configuration"""
        return f"ConfigManager(environment={self.environment})"

# Global configuration instance
config_manager: Optional[ConfigManager] = None

def get_config() -> ConfigManager:
    """Get global configuration manager instance"""
    global config_manager
    if config_manager is None:
        config_manager = ConfigManager()
    return config_manager

def init_config(environment: Optional[str] = None) -> ConfigManager:
    """Initialize global configuration manager"""
    global config_manager
    config_manager = ConfigManager(environment)
    return config_manager