# 🚴‍♂️ Zwift Workout Visualizer

A web-based application that loads Zwift workout files (.zwo) and displays them as interactive graphs.

## Features

- **File Upload**: Load your own Zwift workout files (.zwo)
- **Sample Workout**: Try the application with a built-in sample workout
- **Interactive Graph**: Visualize power profiles over time with Chart.js
- **Workout Details**: View workout metadata (name, author, description, duration)
- **Segment Breakdown**: See detailed information about each workout segment
- **Responsive Design**: Works on desktop and mobile devices

## Supported Workout Elements

The visualizer supports the following Zwift workout elements:

- **Warmup**: Gradual power ramp from low to high
- **Cooldown**: Gradual power ramp from high to low  
- **SteadyState**: Constant power output
- **IntervalsT**: Repeated intervals with on/off periods
- **Ramp**: Linear power progression
- **FreeRide**: Free riding segments

## How to Use

1. **Start the Server**:
   ```bash
   python3 server.py
   ```

2. **Open in Browser**:
   - Local: http://localhost:12000
   - Network: https://work-1-jpkjjijvsbmtuklc.prod-runtime.all-hands.dev

3. **Load a Workout**:
   - Click "Choose Zwift Workout File" to upload your .zwo file
   - Or click "Load Sample Workout" to see a demo

4. **Explore**:
   - View the power profile graph
   - Hover over the chart for detailed information
   - Check the segment details below the chart

## File Structure

```
WkoLibrary/
├── index.html          # Main application page
├── styles.css          # Application styling
├── script.js           # JavaScript logic and XML parsing
├── server.py           # Simple HTTP server
├── sample_workout.zwo  # Sample Zwift workout file
└── README.md           # This file
```

## Zwift Workout File Format

Zwift workout files (.zwo) are XML files with the following structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
    <author>Author Name</author>
    <name>Workout Name</name>
    <description>Workout description</description>
    <sportType>bike</sportType>
    <workout>
        <Warmup Duration="600" PowerLow="0.5" PowerHigh="0.7"/>
        <SteadyState Duration="300" Power="0.6"/>
        <IntervalsT Repeat="4" OnDuration="240" OffDuration="120" 
                    PowerOnHigh="1.05" PowerOffHigh="0.5"/>
        <Cooldown Duration="600" PowerHigh="0.6" PowerLow="0.4"/>
    </workout>
</workout_file>
```

## Power Values

- Power values in .zwo files are expressed as decimals (e.g., 1.0 = 100% FTP)
- The visualizer displays power as percentages of FTP (Functional Threshold Power)
- FTP is the maximum power a cyclist can sustain for one hour

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charting**: Chart.js library
- **XML Parsing**: Native browser DOMParser
- **Server**: Python 3 HTTP server with CORS support

## Browser Compatibility

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

Contributions are welcome! Areas for improvement:

- Support for additional workout elements
- Export functionality (PNG, PDF)
- Workout comparison features
- Power zone visualization
- Training stress score calculation

## License

This project is open source and available under the MIT License.