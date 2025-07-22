
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
    const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });
    const data = await response.json();
    return data.reply;
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
