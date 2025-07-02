
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
