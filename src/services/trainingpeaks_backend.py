#!/usr/bin/env python3
"""
TrainingPeaks Integration Backend Service
Handles TrainingPeaks OAuth2 flow, API integration, and data synchronization
"""

import os
import time
import json
import hashlib
import base64
from typing import Dict, List, Optional
import logging

import requests
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

class TrainingPeaksBackendService:
    """TrainingPeaks integration backend service"""
    
    def __init__(self):
        """Initialize TrainingPeaks backend service"""
        # Configuration
        self.client_id = os.getenv('TRAININGPEAKS_CLIENT_ID')
        self.client_secret = os.getenv('TRAININGPEAKS_CLIENT_SECRET')
        self.redirect_uri = os.getenv('TRAININGPEAKS_OAUTH_REDIRECT_URI', 'http://localhost:8000/api/trainingpeaks/callback')
        self.api_base_url = os.getenv('TRAININGPEAKS_API_BASE_URL', 'https://api.trainingpeaks.com/v1')
        self.webhook_callback_url = os.getenv('TRAININGPEAKS_WEBHOOK_CALLBACK_URL')
        self.webhook_verify_token = os.getenv('TRAININGPEAKS_WEBHOOK_VERIFY_TOKEN')
        
        # Rate limiting (1000 requests per hour)
        self.rate_limit_requests = 1000
        self.rate_limit_window = 3600  # 1 hour in seconds
        self.request_timestamps = []
        
        # Token encryption
        self.encryption_key = self._get_or_create_encryption_key()
        self.fernet = Fernet(self.encryption_key)
        
        # In-memory storage (replace with database in production)
        self.user_tokens = {}
        self.user_settings = {}
        self.sync_cache = {}
        self.webhook_subscriptions = {}
        
        logger.info("TrainingPeaks backend service initialized")

    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for token storage"""
        key_path = '.trainingpeaks_key'
        
        if os.path.exists(key_path):
            with open(key_path, 'rb') as f:
                key = f.read()
                logger.info("Loaded existing encryption key")
                return key
        else:
            key = Fernet.generate_key()
            with open(key_path, 'wb') as f:
                f.write(key)
            logger.warning("Generated new encryption key - store this securely!")
            logger.info(f"Encryption key: {key.decode()}")
            return key

    def _check_rate_limit(self):
        """Check if we're within rate limits"""
        now = time.time()
        
        # Remove old timestamps outside the window
        self.request_timestamps = [ts for ts in self.request_timestamps if now - ts < self.rate_limit_window]
        
        if len(self.request_timestamps) >= self.rate_limit_requests:
            raise Exception("Rate limit exceeded - too many requests per hour")
        
        self.request_timestamps.append(now)

    def _make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make HTTP request with rate limiting and error handling"""
        self._check_rate_limit()
        
        try:
            response = requests.request(method, url, timeout=30, **kwargs)
            logger.debug(f"{method} {url} -> {response.status_code}")
            return response
        except requests.RequestException as e:
            logger.error(f"Request failed: {method} {url} - {e}")
            raise

    def _encrypt_token_data(self, token_data: Dict) -> str:
        """Encrypt token data for secure storage"""
        json_data = json.dumps(token_data)
        encrypted = self.fernet.encrypt(json_data.encode())
        return base64.b64encode(encrypted).decode()

    def _decrypt_token_data(self, encrypted_data: str) -> Dict:
        """Decrypt token data"""
        try:
            encrypted_bytes = base64.b64decode(encrypted_data.encode())
            decrypted = self.fernet.decrypt(encrypted_bytes)
            return json.loads(decrypted.decode())
        except Exception as e:
            logger.error(f"Token decryption failed: {e}")
            raise Exception("Invalid or corrupted token data")

    # OAuth2 Authentication Methods
    
    def generate_auth_url(self, user_id: str) -> Dict:
        """Generate OAuth2 authorization URL with PKCE"""
        try:
            # Generate PKCE parameters
            code_verifier = base64.urlsafe_b64encode(os.urandom(96)).decode('utf-8').rstrip('=')
            code_challenge = base64.urlsafe_b64encode(
                hashlib.sha256(code_verifier.encode()).digest()
            ).decode('utf-8').rstrip('=')
            
            # Generate state parameter
            state = base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8').rstrip('=')
            
            # Store PKCE data temporarily (in production, use Redis or database)
            self.sync_cache[state] = {
                'user_id': user_id,
                'code_verifier': code_verifier,
                'timestamp': time.time(),
                'expires': time.time() + 600  # 10 minutes
            }
            
            # Build authorization URL
            auth_url = f"{self.api_base_url.replace('/v1', '')}/oauth/authorize"
            params = {
                'client_id': self.client_id,
                'redirect_uri': self.redirect_uri,
                'response_type': 'code',
                'scope': 'read:athlete read:workouts write:workouts read:activities write:activities read:metrics',
                'state': state,
                'code_challenge': code_challenge,
                'code_challenge_method': 'S256'
            }
            
            full_url = f"{auth_url}?" + "&".join([f"{k}={v}" for k, v in params.items()])
            
            logger.info(f"Generated auth URL for user {user_id}")
            return {
                'authUrl': full_url,
                'state': state
            }
            
        except Exception as e:
            logger.error(f"Failed to generate auth URL: {e}")
            raise

    def exchange_code_for_tokens(self, code: str, state: str) -> Dict:
        """Exchange authorization code for access tokens"""
        try:
            # Validate state and get PKCE data
            if state not in self.sync_cache:
                raise Exception("Invalid or expired state parameter")
            
            auth_data = self.sync_cache[state]
            if time.time() > auth_data['expires']:
                del self.sync_cache[state]
                raise Exception("Authentication session expired")
            
            # Exchange code for tokens
            token_url = f"{self.api_base_url.replace('/v1', '')}/oauth/token"
            data = {
                'grant_type': 'authorization_code',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'code': code,
                'redirect_uri': self.redirect_uri,
                'code_verifier': auth_data['code_verifier']
            }
            
            response = self._make_request('POST', token_url, data=data)
            
            if response.status_code != 200:
                raise Exception(f"Token exchange failed: {response.status_code} {response.text}")
            
            token_data = response.json()
            
            # Calculate expiration time
            expires_at = time.time() + token_data.get('expires_in', 3600)
            
            # Store encrypted tokens
            user_id = auth_data['user_id']
            encrypted_tokens = self._encrypt_token_data({
                'access_token': token_data['access_token'],
                'refresh_token': token_data.get('refresh_token'),
                'expires_at': expires_at,
                'scope': token_data.get('scope'),
                'token_type': token_data.get('token_type', 'bearer')
            })
            
            self.user_tokens[user_id] = encrypted_tokens
            
            # Clean up auth cache
            del self.sync_cache[state]
            
            logger.info(f"Successfully exchanged tokens for user {user_id}")
            return {'success': True, 'user_id': user_id}
            
        except Exception as e:
            logger.error(f"Token exchange failed: {e}")
            return {'success': False, 'error': str(e)}

    def refresh_access_token(self, user_id: str) -> Dict:
        """Refresh user's access token"""
        try:
            if user_id not in self.user_tokens:
                raise Exception("User not connected")
            
            token_data = self._decrypt_token_data(self.user_tokens[user_id])
            
            if not token_data.get('refresh_token'):
                raise Exception("No refresh token available")
            
            # Request token refresh
            token_url = f"{self.api_base_url.replace('/v1', '')}/oauth/token"
            data = {
                'grant_type': 'refresh_token',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'refresh_token': token_data['refresh_token']
            }
            
            response = self._make_request('POST', token_url, data=data)
            
            if response.status_code != 200:
                raise Exception(f"Token refresh failed: {response.status_code}")
            
            new_token_data = response.json()
            expires_at = time.time() + new_token_data.get('expires_in', 3600)
            
            # Update stored tokens
            updated_tokens = {
                'access_token': new_token_data['access_token'],
                'refresh_token': new_token_data.get('refresh_token', token_data['refresh_token']),
                'expires_at': expires_at,
                'scope': new_token_data.get('scope', token_data.get('scope')),
                'token_type': new_token_data.get('token_type', 'bearer')
            }
            
            self.user_tokens[user_id] = self._encrypt_token_data(updated_tokens)
            
            logger.info(f"Refreshed tokens for user {user_id}")
            return {'success': True}
            
        except Exception as e:
            logger.error(f"Token refresh failed for user {user_id}: {e}")
            return {'success': False, 'error': str(e)}

    def get_access_token(self, user_id: str) -> Optional[str]:
        """Get valid access token for user"""
        try:
            if user_id not in self.user_tokens:
                return None
            
            token_data = self._decrypt_token_data(self.user_tokens[user_id])
            
            # Check if token is expired (with 5 minute buffer)
            if time.time() > (token_data['expires_at'] - 300):
                refresh_result = self.refresh_access_token(user_id)
                if not refresh_result['success']:
                    return None
                # Get updated token data
                token_data = self._decrypt_token_data(self.user_tokens[user_id])
            
            return token_data['access_token']
            
        except Exception as e:
            logger.error(f"Failed to get access token for user {user_id}: {e}")
            return None

    def disconnect_user(self, user_id: str) -> bool:
        """Disconnect user and revoke tokens"""
        try:
            # Revoke token if possible
            access_token = self.get_access_token(user_id)
            if access_token:
                revoke_url = f"{self.api_base_url.replace('/v1', '')}/oauth/revoke"
                self._make_request('POST', revoke_url, data={
                    'token': access_token,
                    'client_id': self.client_id
                })
            
            # Clean up stored data
            if user_id in self.user_tokens:
                del self.user_tokens[user_id]
            if user_id in self.user_settings:
                del self.user_settings[user_id]
            
            logger.info(f"Disconnected user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disconnect user {user_id}: {e}")
            return False

    def is_user_connected(self, user_id: str) -> bool:
        """Check if user is connected and has valid token"""
        access_token = self.get_access_token(user_id)
        return access_token is not None

    # API Methods
    
    def _make_api_request(self, user_id: str, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """Make authenticated API request"""
        access_token = self.get_access_token(user_id)
        if not access_token:
            raise Exception("User not authenticated")
        
        headers = kwargs.pop('headers', {})
        headers.update({
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        url = f"{self.api_base_url}{endpoint}"
        response = self._make_request(method, url, headers=headers, **kwargs)
        
        if response.status_code == 401:
            # Token might be expired, try refresh
            if self.refresh_access_token(user_id)['success']:
                access_token = self.get_access_token(user_id)
                headers['Authorization'] = f'Bearer {access_token}'
                response = self._make_request(method, url, headers=headers, **kwargs)
        
        if response.status_code >= 400:
            logger.error(f"API request failed: {response.status_code} {response.text}")
            return None
        
        return response.json() if response.content else {}

    def get_athlete_profile(self, user_id: str) -> Optional[Dict]:
        """Get athlete profile information"""
        try:
            return self._make_api_request(user_id, 'GET', '/athlete')
        except Exception as e:
            logger.error(f"Failed to get athlete profile: {e}")
            return None

    def get_workouts(self, user_id: str, start_date: str, end_date: str) -> List[Dict]:
        """Get workouts for date range"""
        try:
            params = {'startDate': start_date, 'endDate': end_date, 'limit': 100}
            result = self._make_api_request(user_id, 'GET', '/workouts', params=params)
            return result if result else []
        except Exception as e:
            logger.error(f"Failed to get workouts: {e}")
            return []

    def get_activities(self, user_id: str, start_date: str, end_date: str) -> List[Dict]:
        """Get activities for date range"""
        try:
            params = {'startDate': start_date, 'endDate': end_date, 'limit': 100}
            result = self._make_api_request(user_id, 'GET', '/activities', params=params)
            return result if result else []
        except Exception as e:
            logger.error(f"Failed to get activities: {e}")
            return []

    def create_workout(self, user_id: str, workout_data: Dict) -> Optional[Dict]:
        """Create new workout"""
        try:
            return self._make_api_request(user_id, 'POST', '/workouts', json=workout_data)
        except Exception as e:
            logger.error(f"Failed to create workout: {e}")
            return None

    def upload_activity(self, user_id: str, activity_data: Dict) -> Optional[Dict]:
        """Upload activity"""
        try:
            return self._make_api_request(user_id, 'POST', '/activities', json=activity_data)
        except Exception as e:
            logger.error(f"Failed to upload activity: {e}")
            return None

    # Settings Management
    
    def update_user_settings(self, user_id: str, settings: Dict) -> bool:
        """Update user's sync settings"""
        try:
            self.user_settings[user_id] = settings
            logger.info(f"Updated settings for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to update settings: {e}")
            return False

    def get_user_settings(self, user_id: str) -> Dict:
        """Get user's sync settings"""
        return self.user_settings.get(user_id, {
            'autoSync': True,
            'syncWorkouts': True,
            'syncActivities': True,
            'syncMetrics': True,
            'includePrivate': False,
            'syncDirection': 'bidirectional'
        })

    # Connection Status
    
    def get_connection_status(self, user_id: str) -> Dict:
        """Get comprehensive connection status"""
        try:
            if not self.is_user_connected(user_id):
                return {'connected': False}
            
            # Get user profile
            profile = self.get_athlete_profile(user_id)
            
            # Get settings
            settings = self.get_user_settings(user_id)
            
            # Calculate stats (simplified)
            stats = self._calculate_user_stats(user_id)
            
            return {
                'connected': True,
                'user': profile,
                'settings': settings,
                'stats': stats,
                'lastSync': self._get_last_sync_time(user_id),
                'webhookStatus': 'active'  # Simplified
            }
            
        except Exception as e:
            logger.error(f"Failed to get connection status for user {user_id}: {e}")
            return {'connected': False, 'error': str(e)}

    def _calculate_user_stats(self, user_id: str) -> Dict:
        """Calculate user statistics (simplified)"""
        # In a real implementation, this would query the database
        return {
            'totalWorkouts': 0,
            'totalActivities': 0, 
            'workoutsSynced': 0,
            'activitiesSynced': 0,
            'lastSyncDuration': 0,
            'syncErrors': 0
        }

    def _get_last_sync_time(self, user_id: str) -> Optional[str]:
        """Get last sync timestamp for user"""
        # In a real implementation, this would be stored in database
        return None

    # Sync Operations
    
    def sync_user_data(self, user_id: str) -> Dict:
        """Sync user's workouts and activities"""
        try:
            if not self.is_user_connected(user_id):
                raise Exception("User not connected")
            
            settings = self.get_user_settings(user_id)
            
            workouts_synced = 0
            activities_synced = 0
            
            # Sync workouts if enabled
            if settings.get('syncWorkouts', True):
                # Simplified sync - in real implementation would be more complex
                workouts_synced = self._sync_workouts(user_id)
            
            # Sync activities if enabled
            if settings.get('syncActivities', True):
                activities_synced = self._sync_activities(user_id)
            
            logger.info(f"Sync completed for user {user_id}: {workouts_synced} workouts, {activities_synced} activities")
            
            return {
                'success': True,
                'workoutsSynced': workouts_synced,
                'activitiesSynced': activities_synced
            }
            
        except Exception as e:
            logger.error(f"Sync failed for user {user_id}: {e}")
            return {'success': False, 'error': str(e)}

    def _sync_workouts(self, user_id: str) -> int:
        """Sync workouts (simplified implementation)"""
        # In real implementation, would fetch from TrainingPeaks and convert to TrainingLab format
        return 0

    def _sync_activities(self, user_id: str) -> int:
        """Sync activities (simplified implementation)"""  
        # In real implementation, would upload TrainingLab activities to TrainingPeaks
        return 0

    # Webhook Management (Basic Implementation)
    
    def create_webhook_subscription(self) -> Optional[Dict]:
        """Create webhook subscription"""
        try:
            if not self.webhook_callback_url:
                raise Exception("Webhook callback URL not configured")
            
            # Simplified webhook creation
            subscription_id = f"tp_webhook_{int(time.time())}"
            self.webhook_subscriptions[subscription_id] = {
                'id': subscription_id,
                'callback_url': self.webhook_callback_url,
                'verify_token': self.webhook_verify_token,
                'active': True,
                'created': time.time()
            }
            
            logger.info(f"Created webhook subscription: {subscription_id}")
            return self.webhook_subscriptions[subscription_id]
            
        except Exception as e:
            logger.error(f"Failed to create webhook subscription: {e}")
            return None

    def verify_webhook(self, challenge: str, verify_token: str) -> Optional[str]:
        """Verify webhook subscription"""
        if verify_token == self.webhook_verify_token:
            logger.info("Webhook verification successful")
            return challenge
        
        logger.warning("Webhook verification failed - invalid verify token")
        return None

    def process_webhook_event(self, event_data: Dict) -> bool:
        """Process incoming webhook event"""
        try:
            event_type = event_data.get('type', 'unknown')
            logger.info(f"Processing webhook event: {event_type}")
            
            # Simplified webhook processing
            if event_type == 'workout.created':
                return self._handle_workout_created(event_data)
            elif event_type == 'activity.created':
                return self._handle_activity_created(event_data)
            
            logger.info(f"Webhook event processed: {event_type}")
            return True
            
        except Exception as e:
            logger.error(f"Webhook event processing failed: {e}")
            return False

    def _handle_workout_created(self, event_data: Dict) -> bool:
        """Handle workout created webhook"""
        # In real implementation, would sync the new workout to TrainingLab
        logger.info(f"Workout created webhook received: {event_data.get('workout_id')}")
        return True

    def _handle_activity_created(self, event_data: Dict) -> bool:
        """Handle activity created webhook"""  
        # In real implementation, would process the new activity
        logger.info(f"Activity created webhook received: {event_data.get('activity_id')}")
        return True


# Global instance
trainingpeaks_service = TrainingPeaksBackendService()