/**
 * WorkoutLibrary Storage Manager
 * IndexedDB-based storage system for workout library with metadata, tags, and collections
 *
 * @class WorkoutStorage
 * @description Manages persistent storage of workouts, metadata, and organization
 */
export class WorkoutStorage {
  constructor() {
    this.dbName = 'WorkoutLibraryDB';
    this.dbVersion = 2; // Incremented for new profile store
    this.db = null;

    // Store names
    this.stores = {
      workouts: 'workouts',
      collections: 'collections',
      tags: 'tags',
      userProfiles: 'userProfiles',
      ftpHistory: 'ftpHistory',
    };
  }

  /**
   * Initialize the database and create object stores
   * @returns {Promise<void>}
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('WorkoutLibrary database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;
        this.createObjectStores(db);
      };
    });
  }

  /**
   * Create object stores for the database
   * @private
   * @param {IDBDatabase} db - Database instance
   */
  createObjectStores(db) {
    // Workouts store with comprehensive metadata
    if (!db.objectStoreNames.contains(this.stores.workouts)) {
      const workoutStore = db.createObjectStore(this.stores.workouts, {
        keyPath: 'id',
        autoIncrement: false,
      });

      // Indexes for efficient searching and filtering
      workoutStore.createIndex('name', 'name', { unique: false });
      workoutStore.createIndex('author', 'author', { unique: false });
      workoutStore.createIndex('category', 'category', { unique: false });
      workoutStore.createIndex('difficulty', 'difficulty', { unique: false });
      workoutStore.createIndex('duration', 'duration', { unique: false });
      workoutStore.createIndex('tss', 'tss', { unique: false });
      workoutStore.createIndex('dateCreated', 'dateCreated', { unique: false });
      workoutStore.createIndex('dateModified', 'dateModified', {
        unique: false,
      });
      workoutStore.createIndex('tags', 'tags', {
        unique: false,
        multiEntry: true,
      });
      workoutStore.createIndex('collection', 'collection', { unique: false });
    }

    // Collections store for folder-like organization
    if (!db.objectStoreNames.contains(this.stores.collections)) {
      const collectionStore = db.createObjectStore(this.stores.collections, {
        keyPath: 'id',
        autoIncrement: false,
      });

      collectionStore.createIndex('name', 'name', { unique: true });
      collectionStore.createIndex('dateCreated', 'dateCreated', {
        unique: false,
      });
    }

    // Tags store for tag management
    if (!db.objectStoreNames.contains(this.stores.tags)) {
      const tagStore = db.createObjectStore(this.stores.tags, {
        keyPath: 'name',
        autoIncrement: false,
      });

      tagStore.createIndex('usageCount', 'usageCount', { unique: false });
      tagStore.createIndex('color', 'color', { unique: false });
    }

    // User profiles store for profile management
    if (!db.objectStoreNames.contains(this.stores.userProfiles)) {
      const profileStore = db.createObjectStore(this.stores.userProfiles, {
        keyPath: 'id',
        autoIncrement: false,
      });

      profileStore.createIndex('email', 'email', { unique: true });
      profileStore.createIndex('dateCreated', 'dateCreated', { unique: false });
      profileStore.createIndex('dateModified', 'dateModified', {
        unique: false,
      });
    }

    // FTP history store for tracking FTP changes over time
    if (!db.objectStoreNames.contains(this.stores.ftpHistory)) {
      const ftpHistoryStore = db.createObjectStore(this.stores.ftpHistory, {
        keyPath: 'id',
        autoIncrement: false,
      });

      ftpHistoryStore.createIndex('profileId', 'profileId', { unique: false });
      ftpHistoryStore.createIndex('date', 'date', { unique: false });
      ftpHistoryStore.createIndex('ftpValue', 'ftpValue', { unique: false });
    }

    console.log('Database object stores created successfully');
  }

  /**
   * Generate a unique ID for a workout
   * @private
   * @returns {string} Unique identifier
   */
  generateWorkoutId() {
    return `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique ID for a collection
   * @private
   * @returns {string} Unique identifier
   */
  generateCollectionId() {
    return `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save a workout to the library
   * @param {Object} workoutData - Workout data from ZWO parsing
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} Workout ID
   */
  async saveWorkout(workoutData, metadata = {}) {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    const workoutId = this.generateWorkoutId();
    const now = new Date().toISOString();

    // Create comprehensive workout record
    const workoutRecord = {
      id: workoutId,

      // Core workout data
      workoutData: JSON.stringify(workoutData),

      // Metadata for organization and search
      name: workoutData.name || metadata.name || 'Untitled Workout',
      description: workoutData.description || metadata.description || '',
      author: workoutData.author || metadata.author || 'Unknown',

      // Calculated metrics
      duration: workoutData.totalDuration || 0,
      tss: workoutData.tss || this.calculateTSS(workoutData),
      averagePower: this.calculateAveragePower(workoutData),
      maxPower: this.calculateMaxPower(workoutData),

      // Organization
      category: metadata.category || this.inferCategory(workoutData),
      difficulty: metadata.difficulty || this.calculateDifficulty(workoutData),
      tags: metadata.tags || [],
      collection: metadata.collection || null,

      // System metadata
      dateCreated: now,
      dateModified: now,
      source: metadata.source || 'user', // 'user', 'import', 'generated'
      starred: metadata.starred || false,
      notes: metadata.notes || '',
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.workouts],
        'readwrite'
      );
      const store = transaction.objectStore(this.stores.workouts);
      const request = store.add(workoutRecord);

      request.onsuccess = () => {
        console.log(
          `Workout saved to library: ${workoutRecord.name} (${workoutId})`
        );
        this.updateTagUsage(workoutRecord.tags);
        resolve(workoutId);
      };

      request.onerror = () => {
        reject(new Error(`Failed to save workout: ${request.error}`));
      };
    });
  }

  /**
   * Update an existing workout in the library
   * @param {string} workoutId - Workout ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<void>}
   */
  async updateWorkout(workoutId, updates) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.workouts],
        'readwrite'
      );
      const store = transaction.objectStore(this.stores.workouts);
      const getRequest = store.get(workoutId);

      getRequest.onsuccess = () => {
        const workout = getRequest.result;
        if (!workout) {
          reject(new Error('Workout not found'));
          return;
        }

        // Apply updates
        const updatedWorkout = {
          ...workout,
          ...updates,
          dateModified: new Date().toISOString(),
        };

        const putRequest = store.put(updatedWorkout);
        putRequest.onsuccess = () => {
          console.log(`Workout updated: ${workoutId}`);
          resolve();
        };
        putRequest.onerror = () => {
          reject(new Error(`Failed to update workout: ${putRequest.error}`));
        };
      };

      getRequest.onerror = () => {
        reject(new Error(`Failed to get workout: ${getRequest.error}`));
      };
    });
  }

  /**
   * Get a workout by ID
   * @param {string} workoutId - Workout ID
   * @returns {Promise<Object|null>} Workout record or null if not found
   */
  async getWorkout(workoutId) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.workouts],
        'readonly'
      );
      const store = transaction.objectStore(this.stores.workouts);
      const request = store.get(workoutId);

      request.onsuccess = () => {
        const workout = request.result;
        if (workout) {
          // Parse workout data back to object
          workout.workoutData = JSON.parse(workout.workoutData);
        }
        resolve(workout);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get workout: ${request.error}`));
      };
    });
  }

  /**
   * Delete a workout from the library
   * @param {string} workoutId - Workout ID
   * @returns {Promise<void>}
   */
  async deleteWorkout(workoutId) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.workouts],
        'readwrite'
      );
      const store = transaction.objectStore(this.stores.workouts);
      const request = store.delete(workoutId);

      request.onsuccess = () => {
        console.log(`Workout deleted: ${workoutId}`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete workout: ${request.error}`));
      };
    });
  }

  /**
   * Get all workouts with optional filtering
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of workout records
   */
  async getAllWorkouts(filters = {}) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.workouts],
        'readonly'
      );
      const store = transaction.objectStore(this.stores.workouts);
      const request = store.getAll();

      request.onsuccess = () => {
        let workouts = request.result.map(workout => {
          // Parse workout data back to object
          workout.workoutData = JSON.parse(workout.workoutData);
          return workout;
        });

        // Apply filters
        workouts = this.applyFilters(workouts, filters);

        resolve(workouts);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get workouts: ${request.error}`));
      };
    });
  }

  /**
   * Search workouts by text
   * @param {string} searchText - Text to search for
   * @returns {Promise<Array>} Array of matching workout records
   */
  async searchWorkouts(searchText) {
    if (!searchText || !searchText.trim()) {
      return this.getAllWorkouts();
    }

    const workouts = await this.getAllWorkouts();
    const searchLower = searchText.toLowerCase();

    return workouts.filter(workout => {
      return (
        workout.name.toLowerCase().includes(searchLower) ||
        workout.description.toLowerCase().includes(searchLower) ||
        workout.author.toLowerCase().includes(searchLower) ||
        workout.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        (workout.notes && workout.notes.toLowerCase().includes(searchLower))
      );
    });
  }

  /**
   * Apply filters to workout array
   * @private
   * @param {Array} workouts - Array of workouts
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered workouts
   */
  applyFilters(workouts, filters) {
    return workouts.filter(workout => {
      // Category filter
      if (filters.category && workout.category !== filters.category) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulty && workout.difficulty !== filters.difficulty) {
        return false;
      }

      // Duration range filter (in minutes)
      if (filters.minDuration && workout.duration / 60 < filters.minDuration) {
        return false;
      }
      if (filters.maxDuration && workout.duration / 60 > filters.maxDuration) {
        return false;
      }

      // TSS range filter
      if (filters.minTSS && workout.tss < filters.minTSS) {
        return false;
      }
      if (filters.maxTSS && workout.tss > filters.maxTSS) {
        return false;
      }

      // Tags filter (must have at least one matching tag)
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag =>
          workout.tags.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Collection filter
      if (filters.collection && workout.collection !== filters.collection) {
        return false;
      }

      // Starred filter
      if (
        filters.starred !== undefined &&
        workout.starred !== filters.starred
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate TSS for a workout
   * @private
   * @param {Object} workoutData - Workout data
   * @returns {number} Calculated TSS
   */
  calculateTSS(workoutData) {
    // Basic TSS calculation - can be enhanced
    if (workoutData.tss) return workoutData.tss;

    // Simplified calculation based on duration and intensity
    const durationHours = (workoutData.totalDuration || 3600) / 3600;
    const avgIntensity = 0.75; // Assume 75% average intensity
    return Math.round(durationHours * avgIntensity * 100);
  }

  /**
   * Calculate average power for a workout
   * @private
   * @param {Object} workoutData - Workout data
   * @returns {number} Average power as percentage of FTP
   */
  calculateAveragePower(workoutData) {
    if (!workoutData.segments || workoutData.segments.length === 0) {
      return 65; // Default moderate intensity
    }

    let totalPower = 0;
    let totalDuration = 0;

    workoutData.segments.forEach(segment => {
      const duration = segment.duration || 0;
      let power = 65; // Default

      if (segment.power !== undefined) {
        power = segment.power * 100;
      } else if (
        segment.powerLow !== undefined &&
        segment.powerHigh !== undefined
      ) {
        power = ((segment.powerLow + segment.powerHigh) / 2) * 100;
      }

      totalPower += power * duration;
      totalDuration += duration;
    });

    return totalDuration > 0 ? Math.round(totalPower / totalDuration) : 65;
  }

  /**
   * Calculate maximum power for a workout
   * @private
   * @param {Object} workoutData - Workout data
   * @returns {number} Maximum power as percentage of FTP
   */
  calculateMaxPower(workoutData) {
    if (!workoutData.segments || workoutData.segments.length === 0) {
      return 100;
    }

    let maxPower = 0;

    workoutData.segments.forEach(segment => {
      let power = 65; // Default

      if (segment.power !== undefined) {
        power = segment.power * 100;
      } else if (
        segment.powerLow !== undefined &&
        segment.powerHigh !== undefined
      ) {
        power = Math.max(segment.powerLow, segment.powerHigh) * 100;
      }

      maxPower = Math.max(maxPower, power);
    });

    return Math.round(maxPower);
  }

  /**
   * Infer workout category based on workout characteristics
   * @private
   * @param {Object} workoutData - Workout data
   * @returns {string} Inferred category
   */
  inferCategory(workoutData) {
    const avgPower = this.calculateAveragePower(workoutData);
    const duration = (workoutData.totalDuration || 0) / 60; // minutes
    const maxPower = this.calculateMaxPower(workoutData);

    // Basic categorization logic
    if (maxPower > 150) {
      return 'Neuromuscular';
    } else if (avgPower > 100) {
      return 'VO2 Max';
    } else if (avgPower > 85) {
      return 'Threshold';
    } else if (duration > 60 && avgPower > 65) {
      return 'Endurance';
    } else if (avgPower < 65) {
      return 'Recovery';
    } else {
      return 'Mixed';
    }
  }

  /**
   * Calculate workout difficulty
   * @private
   * @param {Object} workoutData - Workout data
   * @returns {number} Difficulty level (1-5)
   */
  calculateDifficulty(workoutData) {
    const tss = this.calculateTSS(workoutData);
    const maxPower = this.calculateMaxPower(workoutData);

    // Simple difficulty calculation based on TSS and max power
    let difficulty = 1;

    if (tss > 150 || maxPower > 120) {
      difficulty = 5;
    } else if (tss > 100 || maxPower > 105) {
      difficulty = 4;
    } else if (tss > 70 || maxPower > 90) {
      difficulty = 3;
    } else if (tss > 40 || maxPower > 75) {
      difficulty = 2;
    }

    return difficulty;
  }

  /**
   * Update tag usage statistics
   * @private
   * @param {Array} tags - Array of tag names
   */
  async updateTagUsage(tags) {
    if (!tags || tags.length === 0) return;

    const transaction = this.db.transaction([this.stores.tags], 'readwrite');
    const store = transaction.objectStore(this.stores.tags);

    tags.forEach(tagName => {
      const getRequest = store.get(tagName);
      getRequest.onsuccess = () => {
        const tag = getRequest.result || {
          name: tagName,
          usageCount: 0,
          color: this.generateTagColor(),
          dateCreated: new Date().toISOString(),
        };

        tag.usageCount++;
        store.put(tag);
      };
    });
  }

  /**
   * Generate a color for a tag
   * @private
   * @returns {string} Hex color code
   */
  generateTagColor() {
    const colors = [
      '#3B82F6',
      '#EF4444',
      '#10B981',
      '#F59E0B',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Create a new collection
   * @param {string} name - Collection name
   * @param {Object} metadata - Collection metadata
   * @returns {Promise<string>} Collection ID
   */
  async createCollection(name, metadata = {}) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const collectionId = this.generateCollectionId();
    const collection = {
      id: collectionId,
      name,
      description: metadata.description || '',
      color: metadata.color || this.generateTagColor(),
      dateCreated: new Date().toISOString(),
      workoutCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.collections],
        'readwrite'
      );
      const store = transaction.objectStore(this.stores.collections);
      const request = store.add(collection);

      request.onsuccess = () => {
        console.log(`Collection created: ${name} (${collectionId})`);
        resolve(collectionId);
      };

      request.onerror = () => {
        reject(new Error(`Failed to create collection: ${request.error}`));
      };
    });
  }

  /**
   * Get all collections
   * @returns {Promise<Array>} Array of collections
   */
  async getAllCollections() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.collections],
        'readonly'
      );
      const store = transaction.objectStore(this.stores.collections);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get collections: ${request.error}`));
      };
    });
  }

  /**
   * Get all tags with usage statistics
   * @returns {Promise<Array>} Array of tags
   */
  async getAllTags() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.stores.tags], 'readonly');
      const store = transaction.objectStore(this.stores.tags);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get tags: ${request.error}`));
      };
    });
  }

  /**
   * Export library data for backup
   * @returns {Promise<Object>} Library data
   */
  async exportLibrary() {
    const [workouts, collections, tags] = await Promise.all([
      this.getAllWorkouts(),
      this.getAllCollections(),
      this.getAllTags(),
    ]);

    return {
      version: this.dbVersion,
      exportDate: new Date().toISOString(),
      workouts,
      collections,
      tags,
    };
  }

  /**
   * Import library data from backup
   * @param {Object} libraryData - Library data to import
   * @returns {Promise<void>}
   */
  async importLibrary(libraryData) {
    if (!libraryData.workouts) {
      throw new Error('Invalid library data: missing workouts');
    }

    // Import collections first
    if (libraryData.collections) {
      for (const collection of libraryData.collections) {
        try {
          await this.createCollection(collection.name, collection);
        } catch (error) {
          console.warn(
            `Failed to import collection ${collection.name}:`,
            error
          );
        }
      }
    }

    // Import workouts
    for (const workout of libraryData.workouts) {
      try {
        await this.saveWorkout(workout.workoutData, {
          name: workout.name,
          description: workout.description,
          author: workout.author,
          category: workout.category,
          difficulty: workout.difficulty,
          tags: workout.tags,
          collection: workout.collection,
          starred: workout.starred,
          notes: workout.notes,
          source: 'import',
        });
      } catch (error) {
        console.warn(`Failed to import workout ${workout.name}:`, error);
      }
    }

    console.log(
      `Library import completed: ${libraryData.workouts.length} workouts`
    );
  }

  /**
   * Get library statistics
   * @returns {Promise<Object>} Library statistics
   */
  async getLibraryStats() {
    const workouts = await this.getAllWorkouts();
    const collections = await this.getAllCollections();
    const tags = await this.getAllTags();

    const stats = {
      totalWorkouts: workouts.length,
      totalCollections: collections.length,
      totalTags: tags.length,
      categories: {},
      difficulties: {},
      totalDuration: 0,
      averageTSS: 0,
    };

    // Calculate category distribution
    workouts.forEach(workout => {
      stats.categories[workout.category] =
        (stats.categories[workout.category] || 0) + 1;
      stats.difficulties[workout.difficulty] =
        (stats.difficulties[workout.difficulty] || 0) + 1;
      stats.totalDuration += workout.duration;
    });

    stats.totalDuration = Math.round(stats.totalDuration / 60); // Convert to minutes
    stats.averageTSS =
      workouts.length > 0
        ? Math.round(
            workouts.reduce((sum, w) => sum + w.tss, 0) / workouts.length
          )
        : 0;

    return stats;
  }

  // ===============================
  // USER PROFILE MANAGEMENT METHODS
  // ===============================

  /**
   * Generate a unique ID for a user profile
   * @private
   * @returns {string} Unique identifier
   */
  generateProfileId() {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique ID for FTP history entry
   * @private
   * @returns {string} Unique identifier
   */
  generateFTPHistoryId() {
    return `ftp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create or update user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<string>} Profile ID
   */
  async saveUserProfile(profileData) {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    const now = new Date().toISOString();
    const isUpdate = !!profileData.id;

    const profileRecord = {
      id: profileData.id || this.generateProfileId(),

      // Personal information
      name: profileData.name || '',
      email: profileData.email || '',
      weight: profileData.weight || null, // in kg
      height: profileData.height || null, // in cm
      age: profileData.age || null,
      birthYear: profileData.birthYear || null,

      // Training data
      ftp: profileData.ftp || 250,
      units: profileData.units || 'metric', // metric or imperial

      // Profile photo
      profilePhoto: profileData.profilePhoto || null, // base64 string or blob URL

      // Preferences
      preferences: {
        theme: profileData.preferences?.theme || 'light',
        notifications: profileData.preferences?.notifications !== false,
        dataPrivacy: profileData.preferences?.dataPrivacy || 'private',
        displayOptions: {
          showPowerInWatts:
            profileData.preferences?.displayOptions?.showPowerInWatts !== false,
          chartType:
            profileData.preferences?.displayOptions?.chartType || 'line',
          zoneModel:
            profileData.preferences?.displayOptions?.zoneModel || 'coggan',
        },
        ...profileData.preferences,
      },

      // System metadata
      dateCreated: profileData.dateCreated || now,
      dateModified: now,
    };

    return new Promise(async (resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.userProfiles],
        'readwrite'
      );
      const store = transaction.objectStore(this.stores.userProfiles);

      const request = isUpdate
        ? store.put(profileRecord)
        : store.add(profileRecord);

      request.onsuccess = async () => {
        console.log(
          `User profile ${isUpdate ? 'updated' : 'created'}: ${profileRecord.name} (${profileRecord.id})`
        );

        // If FTP changed, add to history
        if (isUpdate && profileData.ftp !== undefined) {
          try {
            await this.addFTPHistoryEntry(profileRecord.id, profileData.ftp);
          } catch (error) {
            console.warn('Failed to add FTP history entry:', error);
          }
        }

        resolve(profileRecord.id);
      };

      request.onerror = () => {
        reject(new Error(`Failed to save user profile: ${request.error}`));
      };
    });
  }

  /**
   * Get user profile by ID
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object|null>} Profile record or null if not found
   */
  async getUserProfile(profileId) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.userProfiles],
        'readonly'
      );
      const store = transaction.objectStore(this.stores.userProfiles);
      const request = store.get(profileId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get user profile: ${request.error}`));
      };
    });
  }

  /**
   * Get the primary user profile (first created)
   * @returns {Promise<Object|null>} Primary profile or null if none exists
   */
  async getPrimaryUserProfile() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.userProfiles],
        'readonly'
      );
      const store = transaction.objectStore(this.stores.userProfiles);
      const index = store.index('dateCreated');
      const request = index.openCursor();

      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          resolve(cursor.value); // Return the first (oldest) profile
        } else {
          resolve(null); // No profiles exist
        }
      };

      request.onerror = () => {
        reject(
          new Error(`Failed to get primary user profile: ${request.error}`)
        );
      };
    });
  }

  /**
   * Delete user profile
   * @param {string} profileId - Profile ID
   * @returns {Promise<void>}
   */
  async deleteUserProfile(profileId) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.userProfiles, this.stores.ftpHistory],
        'readwrite'
      );

      const profileStore = transaction.objectStore(this.stores.userProfiles);
      const ftpHistoryStore = transaction.objectStore(this.stores.ftpHistory);

      // Delete profile
      const deleteProfileRequest = profileStore.delete(profileId);

      // Delete associated FTP history
      const ftpHistoryIndex = ftpHistoryStore.index('profileId');
      const ftpHistoryCursor = ftpHistoryIndex.openCursor(
        IDBKeyRange.only(profileId)
      );

      ftpHistoryCursor.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      deleteProfileRequest.onsuccess = () => {
        console.log(`User profile deleted: ${profileId}`);
        resolve();
      };

      deleteProfileRequest.onerror = () => {
        reject(
          new Error(
            `Failed to delete user profile: ${deleteProfileRequest.error}`
          )
        );
      };
    });
  }

  // ===============================
  // FTP HISTORY MANAGEMENT METHODS
  // ===============================

  /**
   * Add FTP history entry
   * @param {string} profileId - Profile ID
   * @param {number} ftpValue - FTP value in watts
   * @param {Date} date - Date of FTP test (optional, defaults to now)
   * @param {string} source - Source of FTP data (test, estimate, manual)
   * @returns {Promise<string>} FTP history entry ID
   */
  async addFTPHistoryEntry(
    profileId,
    ftpValue,
    date = null,
    source = 'manual'
  ) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const ftpHistoryRecord = {
      id: this.generateFTPHistoryId(),
      profileId,
      ftpValue: Math.round(ftpValue),
      date: (date || new Date()).toISOString(),
      source, // 'test', 'estimate', 'manual'
      dateCreated: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.ftpHistory],
        'readwrite'
      );
      const store = transaction.objectStore(this.stores.ftpHistory);
      const request = store.add(ftpHistoryRecord);

      request.onsuccess = () => {
        console.log(
          `FTP history entry added: ${ftpValue}W on ${ftpHistoryRecord.date}`
        );
        resolve(ftpHistoryRecord.id);
      };

      request.onerror = () => {
        reject(new Error(`Failed to add FTP history entry: ${request.error}`));
      };
    });
  }

  /**
   * Get FTP history for a profile
   * @param {string} profileId - Profile ID
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array>} Array of FTP history entries
   */
  async getFTPHistory(profileId, limit = 50) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.stores.ftpHistory],
        'readonly'
      );
      const store = transaction.objectStore(this.stores.ftpHistory);
      const index = store.index('profileId');
      const request = index.getAll(profileId);

      request.onsuccess = () => {
        let results = request.result;

        // Sort by date descending and limit results
        results.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (limit) {
          results = results.slice(0, limit);
        }

        resolve(results);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get FTP history: ${request.error}`));
      };
    });
  }

  /**
   * Export user profile data including FTP history
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object>} Profile data with FTP history
   */
  async exportUserProfile(profileId) {
    const [profile, ftpHistory] = await Promise.all([
      this.getUserProfile(profileId),
      this.getFTPHistory(profileId, null), // Get all history
    ]);

    if (!profile) {
      throw new Error('Profile not found');
    }

    return {
      version: this.dbVersion,
      exportDate: new Date().toISOString(),
      profile,
      ftpHistory,
    };
  }

  /**
   * Import user profile data
   * @param {Object} profileData - Profile data to import
   * @returns {Promise<string>} Imported profile ID
   */
  async importUserProfile(profileData) {
    if (!profileData.profile) {
      throw new Error('Invalid profile data: missing profile');
    }

    // Import the profile
    const newProfileId = await this.saveUserProfile({
      ...profileData.profile,
      id: undefined, // Generate new ID
    });

    // Import FTP history if available
    if (profileData.ftpHistory && profileData.ftpHistory.length > 0) {
      for (const ftpEntry of profileData.ftpHistory) {
        try {
          await this.addFTPHistoryEntry(
            newProfileId,
            ftpEntry.ftpValue,
            new Date(ftpEntry.date),
            ftpEntry.source || 'import'
          );
        } catch (error) {
          console.warn(`Failed to import FTP history entry:`, error);
        }
      }
    }

    console.log(
      `User profile imported with ${profileData.ftpHistory?.length || 0} FTP history entries`
    );
    return newProfileId;
  }
}

// Create singleton instance
export const workoutStorage = new WorkoutStorage();

// Make globally accessible for debugging
if (typeof window !== 'undefined') {
  window.workoutStorage = workoutStorage;
}
