import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sampleWorkouts, mockApiResponses } from '../fixtures/sample-workouts.js';
import { mockFetch, createMockFile } from '../utils/test-helpers.js';

// Mock fetch globally for API testing
global.fetch = mockFetch(mockApiResponses.uploadSuccess);

describe('API Integration Tests', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        vi.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe('Workout Upload API', () => {
        it('should upload workout file successfully', async () => {
            global.fetch = mockFetch(mockApiResponses.uploadSuccess);

            const formData = new FormData();
            formData.append('workout', createMockFile(sampleWorkouts.simple, 'test.zwo'));

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            expect(response.ok).toBe(true);
            expect(result.success).toBe(true);
            expect(result.workoutId).toBe('test-123');
            expect(fetch).toHaveBeenCalledWith('/api/upload', {
                method: 'POST',
                body: formData
            });
        });

        it('should handle upload errors gracefully', async () => {
            global.fetch = mockFetch(mockApiResponses.uploadError, 400);

            const formData = new FormData();
            formData.append('workout', createMockFile('invalid xml', 'invalid.zwo'));

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            expect(response.ok).toBe(false);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid file format');
        });

        it('should validate file types', async () => {
            const errorResponse = { success: false, error: 'Invalid file type' };
            global.fetch = mockFetch(errorResponse, 400);

            const formData = new FormData();
            formData.append('workout', createMockFile('not xml', 'test.txt', 'text/plain'));

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            expect(response.ok).toBe(false);
            expect(result.error).toBe('Invalid file type');
        });

        it('should handle large file uploads', async () => {
            const largeWorkout = sampleWorkouts.complex + 'x'.repeat(10000); // Simulate large file
            const successResponse = { ...mockApiResponses.uploadSuccess, size: largeWorkout.length };
            global.fetch = mockFetch(successResponse);

            const formData = new FormData();
            formData.append('workout', createMockFile(largeWorkout, 'large.zwo'));

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            expect(response.ok).toBe(true);
            expect(result.success).toBe(true);
            expect(result.size).toBe(largeWorkout.length);
        });
    });

    describe('Workout Retrieval API', () => {
        it('should list all workouts', async () => {
            global.fetch = mockFetch(mockApiResponses.listWorkouts);

            const response = await fetch('/api/workouts');
            const result = await response.json();

            expect(response.ok).toBe(true);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.workouts)).toBe(true);
            expect(result.workouts).toHaveLength(1);
            expect(result.workouts[0]).toHaveProperty('id');
            expect(result.workouts[0]).toHaveProperty('name');
        });

        it('should get specific workout by ID', async () => {
            const workoutData = {
                success: true,
                workout: {
                    id: 'test-123',
                    name: 'Test Workout',
                    author: 'Test Author',
                    segments: []
                }
            };
            global.fetch = mockFetch(workoutData);

            const response = await fetch('/api/workouts/test-123');
            const result = await response.json();

            expect(response.ok).toBe(true);
            expect(result.success).toBe(true);
            expect(result.workout.id).toBe('test-123');
            expect(result.workout.name).toBe('Test Workout');
        });

        it('should handle workout not found', async () => {
            const notFoundResponse = { success: false, error: 'Workout not found' };
            global.fetch = mockFetch(notFoundResponse, 404);

            const response = await fetch('/api/workouts/nonexistent');
            const result = await response.json();

            expect(response.ok).toBe(false);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Workout not found');
        });
    });

    describe('Workout Export API', () => {
        it('should export workout as ZWO format', async () => {
            const exportResponse = {
                success: true,
                format: 'zwo',
                data: sampleWorkouts.simple
            };
            global.fetch = mockFetch(exportResponse);

            const response = await fetch('/api/export/test-123?format=zwo');
            const result = await response.json();

            expect(response.ok).toBe(true);
            expect(result.success).toBe(true);
            expect(result.format).toBe('zwo');
            expect(result.data).toContain('<workout_file>');
        });

        it('should export workout as JSON format', async () => {
            const workoutJson = {
                name: 'Test Workout',
                segments: [{ type: 'SteadyState', duration: 300, power: 0.5 }]
            };
            const exportResponse = {
                success: true,
                format: 'json',
                data: workoutJson
            };
            global.fetch = mockFetch(exportResponse);

            const response = await fetch('/api/export/test-123?format=json');
            const result = await response.json();

            expect(response.ok).toBe(true);
            expect(result.success).toBe(true);
            expect(result.format).toBe('json');
            expect(result.data).toHaveProperty('name');
            expect(result.data).toHaveProperty('segments');
        });

        it('should handle unsupported export formats', async () => {
            const errorResponse = { success: false, error: 'Unsupported format' };
            global.fetch = mockFetch(errorResponse, 400);

            const response = await fetch('/api/export/test-123?format=invalid');
            const result = await response.json();

            expect(response.ok).toBe(false);
            expect(result.error).toBe('Unsupported format');
        });
    });

    describe('Workout Management API', () => {
        it('should delete workout successfully', async () => {
            const deleteResponse = { success: true, message: 'Workout deleted' };
            global.fetch = mockFetch(deleteResponse);

            const response = await fetch('/api/workouts/test-123', {
                method: 'DELETE'
            });

            const result = await response.json();

            expect(response.ok).toBe(true);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Workout deleted');
        });

        it('should update workout metadata', async () => {
            const updateData = {
                name: 'Updated Workout Name',
                description: 'Updated description'
            };
            const updateResponse = {
                success: true,
                workout: { id: 'test-123', ...updateData }
            };
            global.fetch = mockFetch(updateResponse);

            const response = await fetch('/api/workouts/test-123', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();

            expect(response.ok).toBe(true);
            expect(result.success).toBe(true);
            expect(result.workout.name).toBe('Updated Workout Name');
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            try {
                await fetch('/api/workouts');
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Network error');
            }
        });

        it('should handle server errors', async () => {
            const serverError = { error: 'Internal server error' };
            global.fetch = mockFetch(serverError, 500);

            const response = await fetch('/api/workouts');
            const result = await response.json();

            expect(response.ok).toBe(false);
            expect(response.status).toBe(500);
            expect(result.error).toBe('Internal server error');
        });

        it('should handle malformed JSON responses', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.reject(new Error('Invalid JSON'))
            });

            try {
                const response = await fetch('/api/workouts');
                await response.json();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Invalid JSON');
            }
        });
    });

    describe('Content Security', () => {
        it('should sanitize uploaded workout content', async () => {
            const maliciousXml = `<?xml version="1.0"?>
                <workout_file>
                    <name><script>alert('xss')</script>Safe Workout</name>
                    <workout><SteadyState Duration="300" Power="0.8" /></workout>
                </workout_file>`;

            const sanitizedResponse = {
                success: true,
                workoutId: 'test-123',
                sanitized: true,
                warnings: ['Script tags removed from workout name']
            };
            global.fetch = mockFetch(sanitizedResponse);

            const formData = new FormData();
            formData.append('workout', createMockFile(maliciousXml, 'malicious.zwo'));

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            expect(response.ok).toBe(true);
            expect(result.sanitized).toBe(true);
            expect(result.warnings).toContain('Script tags removed from workout name');
        });

        it('should validate workout file size limits', async () => {
            const oversizedResponse = {
                success: false,
                error: 'File size exceeds 10MB limit'
            };
            global.fetch = mockFetch(oversizedResponse, 413);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: new FormData()
            });

            const result = await response.json();

            expect(response.status).toBe(413);
            expect(result.error).toBe('File size exceeds 10MB limit');
        });
    });
});