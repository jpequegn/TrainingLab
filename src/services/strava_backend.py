#!/usr/bin/env python3
"""
Strava Integration Backend Service
Handles Strava API integration, OAuth flow, and webhook processing
"""

import os
import time
from datetime import datetime
from typing import Dict, List, Optional
import logging

import requests
from cryptography.fernet import Fernet


logger = logging.getLogger(__name__)


class StravaBackendService:
    """Backend service for Strava integration"""
    
    def __init__(self):
        """Initialize Strava backend service"""
        self.client_id = os.getenv('STRAVA_CLIENT_ID')
        self.client_secret = os.getenv('STRAVA_CLIENT_SECRET')
        self.webhook_verify_token = os.getenv('STRAVA_WEBHOOK_VERIFY_TOKEN')
        self.webhook_callback_url = os.getenv('STRAVA_WEBHOOK_CALLBACK_URL')
        self.oauth_redirect_uri = os.getenv('STRAVA_OAUTH_REDIRECT_URI')
        
        # API endpoints
        self.api_base_url = 'https://www.strava.com/api/v3'
        self.oauth_base_url = 'https://www.strava.com/oauth'
        
        # Rate limiting
        self.rate_limits = {
            'short_term': {'limit': 600, 'window': 900},  # 15 minutes
            'long_term': {'limit': 30000, 'window': 86400},  # 24 hours
        }
        self.request_history = []
        
        # Storage (in production, use proper database)
        self.user_tokens = {}  # user_id -> token_data
        self.user_settings = {}  # user_id -> settings
        self.activity_cache = {}  # user_id -> activities
        
        # Encryption for token storage
        self._init_encryption()
        
        logger.info("Strava backend service initialized")
    
    def _init_encryption(self):
        """Initialize encryption for token storage"""
        encryption_key = os.getenv('STRAVA_ENCRYPTION_KEY')
        if not encryption_key:
            # Generate new key (in production, store this securely)
            encryption_key = Fernet.generate_key().decode()
            logger.warning("Generated new encryption key - store this securely!")
            logger.info(f"Encryption key: {encryption_key}")
        
        self.fernet = Fernet(encryption_key.encode())
    
    def _encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        return self.fernet.encrypt(data.encode()).decode()
    
    def _decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return self.fernet.decrypt(encrypted_data.encode()).decode()
    
    def _check_rate_limit(self) -> bool:
        """Check if we're hitting Strava API rate limits"""
        now = time.time()
        
        # Clean old requests
        self.request_history = [
            timestamp for timestamp in self.request_history
            if now - timestamp < self.rate_limits['long_term']['window']
        ]
        
        # Check short-term limit
        recent_requests = [
            timestamp for timestamp in self.request_history
            if now - timestamp < self.rate_limits['short_term']['window']
        ]
        
        if len(recent_requests) >= self.rate_limits['short_term']['limit']:
            logger.warning("Rate limit exceeded: short-term limit")
            return False
        
        if len(self.request_history) >= self.rate_limits['long_term']['limit']:
            logger.warning("Rate limit exceeded: long-term limit")
            return False
        
        return True
    
    def _record_api_call(self):
        """Record an API call for rate limiting"""
        self.request_history.append(time.time())
    
    def _make_strava_request(self, method: str, endpoint: str, 
                           access_token: Optional[str] = None,
                           params: Optional[Dict] = None,
                           data: Optional[Dict] = None) -> Dict:
        """Make authenticated request to Strava API"""
        if not self._check_rate_limit():
            raise Exception("Rate limit exceeded")
        
        url = f"{self.api_base_url}{endpoint}"
        headers = {'Accept': 'application/json'}
        
        if access_token:
            headers['Authorization'] = f'Bearer {access_token}'
        
        if method == 'POST' and data:
            headers['Content-Type'] = 'application/json'
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data,
                timeout=30
            )
            
            self._record_api_call()
            
            if response.status_code == 401:
                raise Exception("Strava token expired or invalid")
            elif response.status_code == 429:
                retry_after = response.headers.get('Retry-After', '900')
                raise Exception(f"Rate limited. Retry after {retry_after} seconds")
            elif response.status_code >= 400:
                raise Exception(f"Strava API error: {response.status_code} {response.text}")
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Strava API request failed: {e}")
            raise Exception(f"Request failed: {e}")
    
    # OAuth Flow Methods
    
    def exchange_code_for_token(self, code: str, user_id: str) -> Dict:
        """Exchange authorization code for access token"""
        try:
            data = {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'code': code,
                'grant_type': 'authorization_code'
            }
            
            response = requests.post(
                f"{self.oauth_base_url}/token",
                data=data,
                timeout=30
            )
            
            if not response.ok:
                error_data = response.json() if response.content else {}
                raise Exception(f"Token exchange failed: {error_data}")
            
            token_data = response.json()
            
            # Encrypt and store token data
            encrypted_token_data = {
                'access_token': self._encrypt_data(token_data['access_token']),
                'refresh_token': self._encrypt_data(token_data['refresh_token']),
                'expires_at': token_data.get('expires_at', time.time() + 21600),  # 6 hours default
                'scope': token_data.get('scope', ''),
                'athlete_id': token_data.get('athlete', {}).get('id'),
                'created_at': time.time()
            }
            
            self.user_tokens[user_id] = encrypted_token_data
            
            logger.info(f"Successfully stored tokens for user {user_id}")
            return {
                'success': True,
                'athlete': token_data.get('athlete', {}),
                'expires_at': encrypted_token_data['expires_at']
            }
            
        except Exception as e:
            logger.error(f"Token exchange failed for user {user_id}: {e}")
            raise e
    
    def refresh_access_token(self, user_id: str) -> Dict:
        """Refresh expired access token"""
        if user_id not in self.user_tokens:
            raise Exception("No tokens found for user")
        
        token_data = self.user_tokens[user_id]
        refresh_token = self._decrypt_data(token_data['refresh_token'])
        
        try:
            data = {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'refresh_token': refresh_token,
                'grant_type': 'refresh_token'
            }
            
            response = requests.post(
                f"{self.oauth_base_url}/token",
                data=data,
                timeout=30
            )
            
            if not response.ok:
                error_data = response.json() if response.content else {}
                raise Exception(f"Token refresh failed: {error_data}")
            
            new_token_data = response.json()
            
            # Update stored tokens
            self.user_tokens[user_id].update({
                'access_token': self._encrypt_data(new_token_data['access_token']),
                'refresh_token': self._encrypt_data(new_token_data['refresh_token']),
                'expires_at': new_token_data.get('expires_at', time.time() + 21600),
                'updated_at': time.time()
            })
            
            logger.info(f"Successfully refreshed tokens for user {user_id}")
            return {
                'success': True,
                'expires_at': self.user_tokens[user_id]['expires_at']
            }
            
        except Exception as e:
            logger.error(f"Token refresh failed for user {user_id}: {e}")
            raise e
    
    def get_access_token(self, user_id: str) -> str:
        """Get valid access token for user, refreshing if necessary"""
        if user_id not in self.user_tokens:
            raise Exception("No tokens found for user")
        
        token_data = self.user_tokens[user_id]
        
        # Check if token is expired (with 5 minute buffer)
        if time.time() > (token_data['expires_at'] - 300):
            logger.info(f"Token expired for user {user_id}, refreshing...")
            self.refresh_access_token(user_id)
            token_data = self.user_tokens[user_id]
        
        return self._decrypt_data(token_data['access_token'])
    
    def disconnect_user(self, user_id: str) -> bool:
        """Disconnect user's Strava account"""
        try:
            if user_id in self.user_tokens:
                # In a real implementation, you might want to revoke the token with Strava
                # For now, just remove from local storage
                del self.user_tokens[user_id]
            
            if user_id in self.user_settings:
                del self.user_settings[user_id]
            
            if user_id in self.activity_cache:
                del self.activity_cache[user_id]
            
            logger.info(f"Successfully disconnected user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to disconnect user {user_id}: {e}")
            return False
    
    # User Status and Profile Methods
    
    def is_user_connected(self, user_id: str) -> bool:
        """Check if user has valid Strava connection"""
        return user_id in self.user_tokens
    
    def get_connection_status(self, user_id: str) -> Optional[Dict]:
        """Get user's connection status and profile info"""
        if not self.is_user_connected(user_id):
            return None
        
        try:
            access_token = self.get_access_token(user_id)
            
            # Get athlete profile
            profile = self._make_strava_request('GET', '/athlete', access_token)
            
            # Get athlete stats
            try:
                stats = self._make_strava_request('GET', '/athlete/stats', access_token)
            except Exception:
                stats = {}  # Stats might not be available for all users
            
            # Get user settings
            settings = self.user_settings.get(user_id, {
                'autoSync': True,
                'excludePrivate': False,
                'excludeCommute': False,
                'excludeTrainer': False
            })
            
            # Get activity count from cache
            total_activities = len(self.activity_cache.get(user_id, []))
            
            return {
                'connected': True,
                'profile': profile,
                'stats': stats,
                'settings': settings,
                'totalActivities': total_activities,
                'lastSync': self.user_tokens[user_id].get('last_sync'),
                'webhookActive': self.get_webhook_status().get('active', False)
            }
            
        except Exception as e:
            logger.error(f"Failed to get connection status for user {user_id}: {e}")
            return {
                'connected': False,
                'error': str(e)
            }
    
    # Activity Sync Methods
    
    def sync_user_activities(self, user_id: str, after_date: Optional[datetime] = None) -> Dict:
        """Sync user's activities from Strava"""
        if not self.is_user_connected(user_id):
            raise Exception("User not connected to Strava")
        
        try:
            access_token = self.get_access_token(user_id)
            settings = self.user_settings.get(user_id, {})
            
            # Get activities
            params = {'per_page': 200}
            if after_date:
                params['after'] = int(after_date.timestamp())
            
            activities = self._make_strava_request('GET', '/athlete/activities', access_token, params)
            
            # Filter activities based on user settings
            filtered_activities = []
            for activity in activities:
                if settings.get('excludePrivate', False) and activity.get('private', False):
                    continue
                if settings.get('excludeCommute', False) and activity.get('commute', False):
                    continue
                if settings.get('excludeTrainer', False) and activity.get('trainer', False):
                    continue
                
                filtered_activities.append(activity)
            
            # Update cache
            if user_id not in self.activity_cache:
                self.activity_cache[user_id] = []
            
            # Merge with existing activities (avoid duplicates)
            existing_ids = {act['id'] for act in self.activity_cache[user_id]}
            new_activities = [act for act in filtered_activities if act['id'] not in existing_ids]
            
            self.activity_cache[user_id].extend(new_activities)
            
            # Update last sync time
            self.user_tokens[user_id]['last_sync'] = datetime.now().isoformat()
            
            logger.info(f"Synced {len(new_activities)} new activities for user {user_id}")
            
            return {
                'success': True,
                'newActivities': len(new_activities),
                'totalActivities': len(filtered_activities),
                'lastSync': self.user_tokens[user_id]['last_sync']
            }
            
        except Exception as e:
            logger.error(f"Activity sync failed for user {user_id}: {e}")
            raise e
    
    def import_historical_activities(self, user_id: str, progress_callback=None) -> Dict:
        """Import all historical activities for user"""
        if not self.is_user_connected(user_id):
            raise Exception("User not connected to Strava")
        
        try:
            access_token = self.get_access_token(user_id)
            settings = self.user_settings.get(user_id, {})
            
            all_activities = []
            page = 1
            per_page = 200
            
            while True:
                params = {
                    'page': page,
                    'per_page': per_page
                }
                
                activities = self._make_strava_request('GET', '/athlete/activities', access_token, params)
                
                if not activities:
                    break
                
                # Filter activities
                filtered_activities = []
                for activity in activities:
                    if settings.get('excludePrivate', False) and activity.get('private', False):
                        continue
                    if settings.get('excludeCommute', False) and activity.get('commute', False):
                        continue
                    if settings.get('excludeTrainer', False) and activity.get('trainer', False):
                        continue
                    
                    filtered_activities.append(activity)
                
                all_activities.extend(filtered_activities)
                
                # Progress callback
                if progress_callback:
                    progress_callback({
                        'page': page,
                        'count': len(filtered_activities),
                        'total': len(all_activities),
                        'hasMore': len(activities) == per_page
                    })
                
                # Check if we got less than requested (end of data)
                if len(activities) < per_page:
                    break
                
                page += 1
                
                # Rate limiting delay
                time.sleep(0.1)
            
            # Update cache
            self.activity_cache[user_id] = all_activities
            
            # Update last sync time
            self.user_tokens[user_id]['last_sync'] = datetime.now().isoformat()
            
            logger.info(f"Imported {len(all_activities)} historical activities for user {user_id}")
            
            return {
                'success': True,
                'totalActivities': len(all_activities),
                'pages': page,
                'lastSync': self.user_tokens[user_id]['last_sync']
            }
            
        except Exception as e:
            logger.error(f"Historical import failed for user {user_id}: {e}")
            raise e
    
    def get_activity_details(self, user_id: str, activity_id: int) -> Dict:
        """Get detailed activity information"""
        if not self.is_user_connected(user_id):
            raise Exception("User not connected to Strava")
        
        try:
            access_token = self.get_access_token(user_id)
            
            # Get detailed activity
            activity = self._make_strava_request('GET', f'/activities/{activity_id}', access_token)
            
            return activity
            
        except Exception as e:
            logger.error(f"Failed to get activity details for user {user_id}, activity {activity_id}: {e}")
            raise e
    
    def get_activity_streams(self, user_id: str, activity_id: int, 
                           stream_types: List[str] = None) -> Dict:
        """Get activity streams (power, HR, etc.)"""
        if not self.is_user_connected(user_id):
            raise Exception("User not connected to Strava")
        
        if stream_types is None:
            stream_types = ['watts', 'heartrate', 'cadence', 'time', 'velocity_smooth']
        
        try:
            access_token = self.get_access_token(user_id)
            
            keys = ','.join(stream_types)
            params = {
                'keys': keys,
                'key_by_type': 'true'
            }
            
            streams = self._make_strava_request(
                'GET', 
                f'/activities/{activity_id}/streams', 
                access_token, 
                params
            )
            
            return streams
            
        except Exception as e:
            logger.error(f"Failed to get activity streams for user {user_id}, activity {activity_id}: {e}")
            raise e
    
    # Settings Methods
    
    def update_user_settings(self, user_id: str, settings: Dict) -> bool:
        """Update user's Strava integration settings"""
        try:
            if user_id not in self.user_settings:
                self.user_settings[user_id] = {}
            
            self.user_settings[user_id].update(settings)
            
            logger.info(f"Updated settings for user {user_id}: {settings}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update settings for user {user_id}: {e}")
            return False
    
    # Webhook Methods
    
    def verify_webhook_subscription(self, hub_challenge: str, verify_token: str) -> Optional[str]:
        """Verify webhook subscription request"""
        if verify_token == self.webhook_verify_token:
            logger.info("Webhook subscription verified")
            return hub_challenge
        else:
            logger.warning(f"Webhook verification failed: invalid token {verify_token}")
            return None
    
    def process_webhook_event(self, event_data: Dict) -> bool:
        """Process incoming webhook event"""
        try:
            event_type = event_data.get('object_type')
            aspect_type = event_data.get('aspect_type')
            owner_id = event_data.get('owner_id')
            # Note: object_id is available but not currently used in processing
            
            logger.info(f"Processing webhook event: {event_type} {aspect_type} for owner {owner_id}")
            
            if event_type == 'activity':
                return self._process_activity_webhook(event_data)
            elif event_type == 'athlete':
                return self._process_athlete_webhook(event_data)
            else:
                logger.warning(f"Unknown webhook event type: {event_type}")
                return False
                
        except Exception as e:
            logger.error(f"Webhook processing failed: {e}")
            return False
    
    def _process_activity_webhook(self, event_data: Dict) -> bool:
        """Process activity webhook event"""
        aspect_type = event_data.get('aspect_type')
        owner_id = event_data.get('owner_id')
        activity_id = event_data.get('object_id')
        
        # Find user by athlete ID
        user_id = None
        for uid, token_data in self.user_tokens.items():
            if token_data.get('athlete_id') == owner_id:
                user_id = uid
                break
        
        if not user_id:
            logger.warning(f"No user found for athlete ID {owner_id}")
            return False
        
        try:
            if aspect_type == 'create':
                # New activity created - sync it
                self.sync_user_activities(user_id)
                logger.info(f"Synced new activity {activity_id} for user {user_id}")
                
            elif aspect_type == 'update':
                # Activity updated - re-sync
                self.sync_user_activities(user_id)
                logger.info(f"Re-synced updated activity {activity_id} for user {user_id}")
                
            elif aspect_type == 'delete':
                # Activity deleted - remove from cache
                if user_id in self.activity_cache:
                    self.activity_cache[user_id] = [
                        act for act in self.activity_cache[user_id] 
                        if act['id'] != activity_id
                    ]
                logger.info(f"Removed deleted activity {activity_id} for user {user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Activity webhook processing failed: {e}")
            return False
    
    def _process_athlete_webhook(self, event_data: Dict) -> bool:
        """Process athlete webhook event"""
        aspect_type = event_data.get('aspect_type')
        owner_id = event_data.get('owner_id')
        
        # Find user by athlete ID
        user_id = None
        for uid, token_data in self.user_tokens.items():
            if token_data.get('athlete_id') == owner_id:
                user_id = uid
                break
        
        if not user_id:
            logger.warning(f"No user found for athlete ID {owner_id}")
            return False
        
        if aspect_type == 'update':
            updates = event_data.get('updates', {})
            if updates.get('authorized') == 'false':
                # User revoked access - disconnect
                logger.info(f"User {user_id} revoked Strava access, disconnecting")
                self.disconnect_user(user_id)
        
        return True
    
    # Webhook Subscription Management
    
    def create_webhook_subscription(self) -> Optional[Dict]:
        """Create a new webhook subscription with Strava"""
        try:
            subscription_data = {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'callback_url': self.webhook_callback_url,
                'verify_token': self.webhook_verify_token
            }
            
            response = requests.post(
                'https://www.strava.com/api/v3/push_subscriptions',
                data=subscription_data,
                timeout=30
            )
            
            if response.status_code == 201:
                subscription = response.json()
                logger.info(f"Created webhook subscription with ID: {subscription.get('id')}")
                return subscription
            else:
                logger.error(f"Failed to create webhook subscription: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Webhook subscription creation failed: {e}")
            return None
    
    def get_webhook_subscriptions(self) -> List[Dict]:
        """Get existing webhook subscriptions"""
        try:
            params = {
                'client_id': self.client_id,
                'client_secret': self.client_secret
            }
            
            response = requests.get(
                'https://www.strava.com/api/v3/push_subscriptions',
                params=params,
                timeout=30
            )
            
            if response.status_code == 200:
                subscriptions = response.json()
                logger.info(f"Found {len(subscriptions)} webhook subscriptions")
                return subscriptions
            else:
                logger.error(f"Failed to get webhook subscriptions: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to get webhook subscriptions: {e}")
            return []
    
    def delete_webhook_subscription(self, subscription_id: int) -> bool:
        """Delete a webhook subscription"""
        try:
            params = {
                'client_id': self.client_id,
                'client_secret': self.client_secret
            }
            
            response = requests.delete(
                f'https://www.strava.com/api/v3/push_subscriptions/{subscription_id}',
                params=params,
                timeout=30
            )
            
            if response.status_code == 204:
                logger.info(f"Deleted webhook subscription {subscription_id}")
                return True
            else:
                logger.error(f"Failed to delete webhook subscription: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete webhook subscription: {e}")
            return False
    
    def get_webhook_status(self) -> Dict:
        """Get current webhook subscription status"""
        try:
            subscriptions = self.get_webhook_subscriptions()
            
            # Find subscription for our callback URL
            active_subscription = None
            for sub in subscriptions:
                if sub.get('callback_url') == self.webhook_callback_url:
                    active_subscription = sub
                    break
            
            return {
                'active': active_subscription is not None,
                'subscription': active_subscription,
                'total_subscriptions': len(subscriptions)
            }
            
        except Exception as e:
            logger.error(f"Failed to get webhook status: {e}")
            return {
                'active': False,
                'error': str(e),
                'total_subscriptions': 0
            }


# Global instance
strava_service = StravaBackendService()