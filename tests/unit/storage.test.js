import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkoutStorage } from '../../storage.js';

// Mock IndexedDB for testing
const mockIDBRequest = (result = null, error = null) => ({
    result,
    error,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
});

const mockIDBDatabase = {
    createObjectStore: vi.fn(() => ({
        createIndex: vi.fn()
    })),
    transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
            add: vi.fn(() => mockIDBRequest()),
            get: vi.fn(() => mockIDBRequest()),
            put: vi.fn(() => mockIDBRequest()),
            delete: vi.fn(() => mockIDBRequest()),
            getAll: vi.fn(() => mockIDBRequest([])),
            clear: vi.fn(() => mockIDBRequest())
        })),
        oncomplete: null,
        onerror: null
    })),
    close: vi.fn()
};

// Mock indexedDB
global.indexedDB = {
    open: vi.fn(() => {
        const request = mockIDBRequest(mockIDBDatabase);
        // Simulate successful opening
        setTimeout(() => {
            if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
    }),
    deleteDatabase: vi.fn(() => mockIDBRequest())
};

describe('WorkoutStorage', () => {
    let storage;

    beforeEach(() => {
        storage = new WorkoutStorage();
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (storage.db) {
            storage.db.close();
        }
    });

    describe('Constructor', () => {
        it('should initialize with correct default values', () => {
            expect(storage.dbName).toBe('WorkoutLibraryDB');
            expect(storage.dbVersion).toBe(1);
            expect(storage.db).toBeNull();
            expect(storage.stores).toEqual({
                workouts: 'workouts',
                collections: 'collections',
                tags: 'tags'
            });
        });
    });

    describe('Database initialization', () => {
        it('should initialize database successfully', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            await storage.initialize();
            
            expect(indexedDB.open).toHaveBeenCalledWith('WorkoutLibraryDB', 1);
            expect(storage.db).toBe(mockIDBDatabase);
            expect(consoleSpy).toHaveBeenCalledWith('WorkoutLibrary database initialized successfully');
            
            consoleSpy.mockRestore();
        });

        it('should handle database open errors', async () => {
            const errorMessage = 'Database access denied';
            global.indexedDB.open = vi.fn(() => {
                const request = mockIDBRequest(null, new Error(errorMessage));
                setTimeout(() => {
                    if (request.onerror) request.onerror();
                }, 0);
                return request;
            });

            await expect(storage.initialize()).rejects.toThrow(`Failed to open database: ${errorMessage}`);
        });

        it('should handle upgrade needed event', async () => {
            const createStoresSpy = vi.spyOn(storage, 'createObjectStores').mockImplementation(() => {});
            
            global.indexedDB.open = vi.fn(() => {
                const request = mockIDBRequest(mockIDBDatabase);
                setTimeout(() => {
                    const event = { target: { result: mockIDBDatabase } };
                    if (request.onupgradeneeded) request.onupgradeneeded(event);
                    if (request.onsuccess) request.onsuccess();
                }, 0);
                return request;
            });

            await storage.initialize();
            
            expect(createStoresSpy).toHaveBeenCalledWith(mockIDBDatabase);
            createStoresSpy.mockRestore();
        });
    });

    describe('Database operations', () => {
        beforeEach(async () => {
            await storage.initialize();
        });

        it('should save workout successfully', async () => {
            const workout = {
                id: 'test-123',
                name: 'Test Workout',
                author: 'Test Author',
                segments: []
            };

            const mockTransaction = mockIDBDatabase.transaction();
            const mockStore = mockTransaction.objectStore();
            mockStore.add = vi.fn(() => {
                const request = mockIDBRequest(workout.id);
                setTimeout(() => request.onsuccess && request.onsuccess(), 0);
                return request;
            });

            const result = await storage.saveWorkout(workout);
            
            expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['workouts'], 'readwrite');
            expect(result).toBe(workout.id);
        });

        it('should get workout by id successfully', async () => {
            const workoutId = 'test-123';
            const expectedWorkout = {
                id: workoutId,
                name: 'Test Workout',
                author: 'Test Author'
            };

            const mockTransaction = mockIDBDatabase.transaction();
            const mockStore = mockTransaction.objectStore();
            mockStore.get = vi.fn(() => {
                const request = mockIDBRequest(expectedWorkout);
                setTimeout(() => request.onsuccess && request.onsuccess(), 0);
                return request;
            });

            const result = await storage.getWorkout(workoutId);
            
            expect(mockStore.get).toHaveBeenCalledWith(workoutId);
            expect(result).toEqual(expectedWorkout);
        });

        it('should handle workout not found', async () => {
            const workoutId = 'nonexistent';

            const mockTransaction = mockIDBDatabase.transaction();
            const mockStore = mockTransaction.objectStore();
            mockStore.get = vi.fn(() => {
                const request = mockIDBRequest(undefined);
                setTimeout(() => request.onsuccess && request.onsuccess(), 0);
                return request;
            });

            const result = await storage.getWorkout(workoutId);
            
            expect(result).toBeNull();
        });

        it('should list all workouts', async () => {
            const expectedWorkouts = [
                { id: '1', name: 'Workout 1' },
                { id: '2', name: 'Workout 2' }
            ];

            const mockTransaction = mockIDBDatabase.transaction();
            const mockStore = mockTransaction.objectStore();
            mockStore.getAll = vi.fn(() => {
                const request = mockIDBRequest(expectedWorkouts);
                setTimeout(() => request.onsuccess && request.onsuccess(), 0);
                return request;
            });

            const result = await storage.listWorkouts();
            
            expect(result).toEqual(expectedWorkouts);
        });

        it('should delete workout successfully', async () => {
            const workoutId = 'test-123';

            const mockTransaction = mockIDBDatabase.transaction();
            const mockStore = mockTransaction.objectStore();
            mockStore.delete = vi.fn(() => {
                const request = mockIDBRequest(undefined);
                setTimeout(() => request.onsuccess && request.onsuccess(), 0);
                return request;
            });

            const result = await storage.deleteWorkout(workoutId);
            
            expect(mockStore.delete).toHaveBeenCalledWith(workoutId);
            expect(result).toBe(true);
        });

        it('should handle database transaction errors', async () => {
            const mockTransaction = mockIDBDatabase.transaction();
            const mockStore = mockTransaction.objectStore();
            mockStore.add = vi.fn(() => {
                const request = mockIDBRequest(null, new Error('Transaction failed'));
                setTimeout(() => request.onerror && request.onerror(), 0);
                return request;
            });

            const workout = { id: 'test', name: 'Test' };
            
            await expect(storage.saveWorkout(workout)).rejects.toThrow('Transaction failed');
        });
    });

    describe('Validation', () => {
        beforeEach(async () => {
            await storage.initialize();
        });

        it('should validate workout data before saving', async () => {
            const invalidWorkout = { name: 'Test' }; // Missing required fields
            
            await expect(storage.saveWorkout(invalidWorkout)).rejects.toThrow();
        });

        it('should validate workout ID format', () => {
            expect(() => storage.validateWorkoutId('')).toThrow();
            expect(() => storage.validateWorkoutId(null)).toThrow();
            expect(() => storage.validateWorkoutId(undefined)).toThrow();
            expect(() => storage.validateWorkoutId('valid-id')).not.toThrow();
        });
    });

    describe('Collections and Tags', () => {
        beforeEach(async () => {
            await storage.initialize();
        });

        it('should create collection successfully', async () => {
            const collection = {
                id: 'collection-1',
                name: 'My Collection',
                workoutIds: ['workout-1', 'workout-2']
            };

            const mockTransaction = mockIDBDatabase.transaction();
            const mockStore = mockTransaction.objectStore();
            mockStore.add = vi.fn(() => {
                const request = mockIDBRequest(collection.id);
                setTimeout(() => request.onsuccess && request.onsuccess(), 0);
                return request;
            });

            const result = await storage.createCollection(collection);
            
            expect(result).toBe(collection.id);
        });

        it('should manage tags effectively', async () => {
            const tag = {
                id: 'tag-1',
                name: 'intervals',
                color: '#ff6b6b'
            };

            const mockTransaction = mockIDBDatabase.transaction();
            const mockStore = mockTransaction.objectStore();
            mockStore.add = vi.fn(() => {
                const request = mockIDBRequest(tag.id);
                setTimeout(() => request.onsuccess && request.onsuccess(), 0);
                return request;
            });

            const result = await storage.saveTag(tag);
            
            expect(result).toBe(tag.id);
        });
    });

    describe('Search and filtering', () => {
        beforeEach(async () => {
            await storage.initialize();
        });

        it('should search workouts by name', async () => {
            const searchTerm = 'interval';
            const expectedResults = [
                { id: '1', name: 'Interval Training' },
                { id: '2', name: 'High Intensity Intervals' }
            ];

            const searchSpy = vi.spyOn(storage, 'searchWorkouts').mockResolvedValue(expectedResults);

            const results = await storage.searchWorkouts(searchTerm);
            
            expect(results).toEqual(expectedResults);
            expect(searchSpy).toHaveBeenCalledWith(searchTerm);
            
            searchSpy.mockRestore();
        });

        it('should filter workouts by tags', async () => {
            const tags = ['intervals', 'ftp'];
            const expectedResults = [
                { id: '1', name: 'FTP Intervals', tags: ['intervals', 'ftp'] }
            ];

            const filterSpy = vi.spyOn(storage, 'filterByTags').mockResolvedValue(expectedResults);

            const results = await storage.filterByTags(tags);
            
            expect(results).toEqual(expectedResults);
            expect(filterSpy).toHaveBeenCalledWith(tags);
            
            filterSpy.mockRestore();
        });
    });

    describe('Error handling', () => {
        it('should handle database connection failures gracefully', async () => {
            global.indexedDB.open = vi.fn(() => {
                const request = mockIDBRequest(null, new Error('Connection failed'));
                setTimeout(() => request.onerror && request.onerror(), 0);
                return request;
            });

            await expect(storage.initialize()).rejects.toThrow('Failed to open database: Connection failed');
        });

        it('should handle quota exceeded errors', async () => {
            await storage.initialize();
            
            const mockTransaction = mockIDBDatabase.transaction();
            const mockStore = mockTransaction.objectStore();
            mockStore.add = vi.fn(() => {
                const request = mockIDBRequest(null, new Error('QuotaExceededError'));
                setTimeout(() => request.onerror && request.onerror(), 0);
                return request;
            });

            const largeWorkout = { 
                id: 'large',
                name: 'Large Workout',
                data: 'x'.repeat(1000000) // Large data
            };
            
            await expect(storage.saveWorkout(largeWorkout)).rejects.toThrow('QuotaExceededError');
        });
    });
});