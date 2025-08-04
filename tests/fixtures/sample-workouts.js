// Test fixtures for workout data
export const sampleWorkouts = {
    simple: `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <author>Test Author</author>
    <name>Simple Test Workout</name>
    <description>A simple workout for testing</description>
    <sportType>bike</sportType>
    <tags>
        <tag name="test"/>
    </tags>
    <workout>
        <SteadyState Duration="300" Power="0.5" />
        <SteadyState Duration="600" Power="0.8" />
        <SteadyState Duration="300" Power="0.5" />
    </workout>
</workout_file>`,

    complex: `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <author>Test Author</author>
    <name>Complex Test Workout</name>
    <description>A complex workout with intervals</description>
    <sportType>bike</sportType>
    <tags>
        <tag name="test"/>
        <tag name="intervals"/>
    </tags>
    <workout>
        <SteadyState Duration="600" Power="0.5" />
        <IntervalsT Repeat="5" OnDuration="30" OffDuration="30" OnPower="1.2" OffPower="0.4" />
        <SteadyState Duration="300" Power="0.6" />
        <Ramp Duration="300" PowerLow="0.6" PowerHigh="1.0" />
        <SteadyState Duration="300" Power="0.5" />
    </workout>
</workout_file>`,

    invalid: `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <name>Invalid Workout</name>
    <workout>
        <InvalidSegment Duration="300" />
    </workout>
</workout_file>`,

    empty: `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <author>Test Author</author>
    <name>Empty Workout</name>
    <description>Empty workout for testing</description>
    <sportType>bike</sportType>
    <workout>
    </workout>
</workout_file>`
};

export const mockApiResponses = {
    uploadSuccess: {
        success: true,
        message: 'Workout uploaded successfully',
        workoutId: 'test-123'
    },
    uploadError: {
        success: false,
        error: 'Invalid file format'
    },
    listWorkouts: {
        success: true,
        workouts: [
            { id: 'test-123', name: 'Test Workout', author: 'Test Author' }
        ]
    }
};