
export async function fetchDirectory(path = '') {
    const res = await fetch(`/workouts${path ? '/' + encodeURIComponent(path) : ''}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
}

export async function fetchWorkoutFile(filePath) {
    const res = await fetch(`/workout?file=${encodeURIComponent(filePath)}`);
    if (res.ok) {
        const data = await res.json();
        return data.content;
    } else {
        throw new Error('Failed to fetch workout file');
    }
}

export async function deployWorkout(workoutName, zwoContent) {
    const response = await fetch('/deploy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: workoutName,
            content: zwoContent
        })
    });

    const result = await response.json();
    if (result.success) {
        return result.path;
    } else {
        throw new Error(result.error || 'Deployment failed');
    }
}

export async function sendChatMessage(message) {
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            // Handle HTTP errors (500, 404, etc.)
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(`Server error (${response.status}): ${response.statusText}`);
            error.serverResponse = errorData;
            error.status = response.status;
            throw error;
        }
        
        const data = await response.json();
        
        // Check if the server returned an error message in the reply
        if (data.reply && data.reply.includes('❌')) {
            // This is a server-side diagnostic message
            const error = new Error('Server-side LLM error');
            error.serverResponse = data;
            throw error;
        }
        
        return data.reply;
        
    } catch (error) {
        // Network or parsing errors
        if (error.serverResponse) {
            // Re-throw server errors with diagnostic info
            throw error;
        } else {
            // Handle network or other client-side errors
            const enhancedError = new Error(error.message || 'Network error');
            enhancedError.originalError = error;
            throw enhancedError;
        }
    }
}

export async function getZwiftWorkoutDirectory() {
    try {
        const response = await fetch('/zwift-directory');
        const data = await response.json();
        if (data.success) {
            return data.directory;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting Zwift directory:', error);
        return null;
    }
}

export async function saveAsWorkout(filename, zwoContent, directory) {
    const response = await fetch('/save-as', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            filename: filename,
            content: zwoContent,
            directory: directory
        })
    });

    const result = await response.json();
    if (result.success) {
        return result.path;
    } else {
        throw new Error(result.error || 'Save failed');
    }
}

export async function selectFolder() {
    try {
        const response = await fetch('/select-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const data = await response.json();
        if (data.success && data.folderPath) {
            return data.folderPath;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error selecting folder:', error);
        return null;
    }
}
