/**
 * Advanced Chart Visualizations Suite
 * Advanced chart types for comprehensive workout and performance analysis
 */

import * as d3 from 'd3';
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export class AdvancedCharts {
  constructor() {
    this.charts = new Map();
    this.d3Charts = new Map();
    this.threeJsScenes = new Map();
    this.animationFrames = new Map();
    this.defaultColors = {
      recovery: '#808080',
      endurance: '#007BFF',
      tempo: '#28A745',
      threshold: '#FFC107',
      vo2max: '#FF5722',
      neuromuscular: '#F44336',
    };
  }

  /**
   * Create 3D Power Surface Plot
   * Visualizes power over time with elevation/gradient data
   */
  async create3DPowerSurface(containerId, workoutData, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    const config = {
      width: container.clientWidth || 800,
      height: container.clientHeight || 400,
      backgroundColor: options.backgroundColor || 0x000000,
      cameraPosition: { x: 50, y: 50, z: 100 },
      showGrid: options.showGrid !== false,
      showAxes: options.showAxes !== false,
      ...options,
    };

    // Create THREE.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      config.width / config.height,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(config.width, config.height);
    renderer.setClearColor(config.backgroundColor);
    container.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // Create surface geometry
    const segments = workoutData.segments || [];
    const geometry = new THREE.PlaneGeometry(100, 100, segments.length - 1, 10);
    const vertices = geometry.attributes.position.array;

    // Map workout data to surface height
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const segmentIndex = Math.floor(((x + 50) / 100) * (segments.length - 1));
      const segment = segments[segmentIndex] || segments[0];

      // Height based on power (z-coordinate)
      vertices[i + 2] = (segment.power || 0) * 0.5;

      // Color based on elevation if available
      if (segment.elevation) {
        vertices[i + 1] = segment.elevation * 0.1;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Create material with color gradient
    const material = new THREE.MeshLambertMaterial({
      color: 0x00ff00,
      wireframe: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Add grid helper if enabled
    if (config.showGrid) {
      const gridHelper = new THREE.GridHelper(100, 10);
      scene.add(gridHelper);
    }

    // Add axes helper if enabled
    if (config.showAxes) {
      const axesHelper = new THREE.AxesHelper(50);
      scene.add(axesHelper);
    }

    // Position camera
    camera.position.set(
      config.cameraPosition.x,
      config.cameraPosition.y,
      config.cameraPosition.z
    );
    camera.lookAt(0, 0, 0);

    // Animation loop
    const animate = () => {
      const frameId = requestAnimationFrame(animate);
      this.animationFrames.set(containerId, frameId);

      // Rotate the surface for better visualization
      if (options.autoRotate !== false) {
        mesh.rotation.z += 0.005;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Store references
    this.threeJsScenes.set(containerId, {
      scene,
      camera,
      renderer,
      mesh,
      container,
    });

    // Add resize handling
    this.addResizeHandler(containerId, config);

    return { scene, camera, renderer, mesh };
  }

  /**
   * Create Heat Map Calendar
   * Training load calendar with color-coded intensity
   */
  createHeatMapCalendar(containerId, trainingData, options = {}) {
    const container = d3.select(`#${containerId}`);
    if (container.empty()) {
      throw new Error(`Container not found: ${containerId}`);
    }

    const config = {
      width: options.width || 800,
      height: options.height || 200,
      cellSize: options.cellSize || 12,
      margin: options.margin || { top: 20, right: 20, bottom: 20, left: 20 },
      colorScale: options.colorScale || 'viridis',
      showTooltip: options.showTooltip !== false,
      showLegend: options.showLegend !== false,
      ...options,
    };

    // Clear previous content
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', config.width)
      .attr('height', config.height)
      .attr('role', 'img')
      .attr('aria-label', 'Training load heat map calendar');

    const g = svg
      .append('g')
      .attr(
        'transform',
        `translate(${config.margin.left},${config.margin.top})`
      );

    // Process training data
    const dataByDate = new Map();
    trainingData.forEach(workout => {
      const date = new Date(workout.date).toDateString();
      const load = this.calculateTrainingLoad(workout);
      dataByDate.set(date, (dataByDate.get(date) || 0) + load);
    });

    // Create date range (last 365 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    const dateRange = d3.timeDays(startDate, endDate);

    // Color scale
    const maxLoad = Math.max(...dataByDate.values(), 1);
    const colorScale = d3
      .scaleSequential(d3[`interpolate${config.colorScale}`])
      .domain([0, maxLoad]);

    // Create cells
    const cells = g
      .selectAll('rect')
      .data(dateRange)
      .enter()
      .append('rect')
      .attr('width', config.cellSize)
      .attr('height', config.cellSize)
      .attr('x', d => d3.timeWeek.count(startDate, d) * config.cellSize)
      .attr('y', d => d.getDay() * config.cellSize)
      .attr('fill', d => {
        const load = dataByDate.get(d.toDateString()) || 0;
        return load > 0 ? colorScale(load) : '#eee';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .attr('ry', 2);

    // Add tooltips if enabled
    if (config.showTooltip) {
      cells
        .on('mouseover', (event, d) => {
          const load = dataByDate.get(d.toDateString()) || 0;
          this.showTooltip(
            event,
            `Date: ${d.toLocaleDateString()}\nTraining Load: ${load.toFixed(1)}`
          );
        })
        .on('mouseout', () => {
          this.hideTooltip();
        });
    }

    // Add month labels
    const months = g
      .selectAll('.month')
      .data(d3.timeMonths(startDate, endDate))
      .enter()
      .append('text')
      .attr('class', 'month')
      .attr('x', d => d3.timeWeek.count(startDate, d) * config.cellSize)
      .attr('y', -5)
      .attr('font-size', '10px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#666')
      .text(d => d3.timeFormat('%b')(d));

    // Add legend if enabled
    if (config.showLegend) {
      this.addHeatMapLegend(svg, config, colorScale, maxLoad);
    }

    this.d3Charts.set(containerId, { svg, config, colorScale });

    return { svg, colorScale };
  }

  /**
   * Create Interactive Zone Distribution Chart
   * Pie/donut charts for time in power zones
   */
  createZoneDistribution(containerId, workoutData, options = {}) {
    const container = d3.select(`#${containerId}`);
    if (container.empty()) {
      throw new Error(`Container not found: ${containerId}`);
    }

    const config = {
      width: options.width || 400,
      height: options.height || 400,
      innerRadius: options.innerRadius || 60,
      outerRadius: options.outerRadius || 180,
      showLabels: options.showLabels !== false,
      showPercentages: options.showPercentages !== false,
      interactive: options.interactive !== false,
      animationDuration: options.animationDuration || 750,
      ...options,
    };

    // Clear previous content
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', config.width)
      .attr('height', config.height)
      .attr('role', 'img')
      .attr('aria-label', 'Power zone distribution chart');

    const g = svg
      .append('g')
      .attr('transform', `translate(${config.width / 2},${config.height / 2})`);

    // Calculate zone distribution
    const zoneData = this.calculateZoneDistribution(workoutData);
    const totalTime = d3.sum(zoneData, d => d.time);

    // Create pie layout
    const pie = d3
      .pie()
      .value(d => d.time)
      .sort(null);

    const arc = d3
      .arc()
      .innerRadius(config.innerRadius)
      .outerRadius(config.outerRadius);

    const labelArc = d3
      .arc()
      .innerRadius(config.outerRadius + 10)
      .outerRadius(config.outerRadius + 10);

    // Color scale
    const colorScale = d3
      .scaleOrdinal()
      .domain(zoneData.map(d => d.zone))
      .range(Object.values(this.defaultColors));

    // Create arcs
    const arcs = g
      .selectAll('.arc')
      .data(pie(zoneData))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // Add paths with animation
    arcs
      .append('path')
      .attr('fill', d => colorScale(d.data.zone))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .transition()
      .duration(config.animationDuration)
      .attrTween('d', d => {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(interpolate(t));
        };
      });

    // Add labels if enabled
    if (config.showLabels) {
      arcs
        .append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-family', 'sans-serif')
        .attr('fill', '#333')
        .text(d => {
          const percentage = ((d.data.time / totalTime) * 100).toFixed(1);
          return config.showPercentages
            ? `${d.data.zone} (${percentage}%)`
            : d.data.zone;
        })
        .style('opacity', 0)
        .transition()
        .delay(config.animationDuration)
        .duration(300)
        .style('opacity', 1);
    }

    // Add interactivity if enabled
    if (config.interactive) {
      arcs
        .on('mouseover', (event, d) => {
          d3.select(event.currentTarget)
            .select('path')
            .transition()
            .duration(200)
            .attr('transform', 'scale(1.05)');

          const percentage = ((d.data.time / totalTime) * 100).toFixed(1);
          this.showTooltip(
            event,
            `Zone: ${d.data.zone}\nTime: ${this.formatDuration(d.data.time)}\nPercentage: ${percentage}%`
          );
        })
        .on('mouseout', event => {
          d3.select(event.currentTarget)
            .select('path')
            .transition()
            .duration(200)
            .attr('transform', 'scale(1)');

          this.hideTooltip();
        });
    }

    // Add center text (total time)
    if (config.innerRadius > 0) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif')
        .attr('fill', '#333')
        .attr('dy', '-0.5em')
        .text('Total Time');

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-family', 'sans-serif')
        .attr('fill', '#666')
        .attr('dy', '1em')
        .text(this.formatDuration(totalTime));
    }

    this.d3Charts.set(containerId, { svg, config, zoneData });

    return { svg, zoneData };
  }

  /**
   * Create Animated Workout Preview
   * Real-time animated preview of workout intensity
   */
  createAnimatedPreview(containerId, workoutData, options = {}) {
    const container = d3.select(`#${containerId}`);
    if (container.empty()) {
      throw new Error(`Container not found: ${containerId}`);
    }

    const config = {
      width: options.width || 600,
      height: options.height || 300,
      margin: options.margin || { top: 20, right: 20, bottom: 40, left: 60 },
      animationSpeed: options.animationSpeed || 1000, // ms per segment
      showControls: options.showControls !== false,
      autoPlay: options.autoPlay !== false,
      ...options,
    };

    // Clear previous content
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', config.width)
      .attr('height', config.height)
      .attr('role', 'img')
      .attr('aria-label', 'Animated workout preview');

    const chartWidth = config.width - config.margin.left - config.margin.right;
    const chartHeight =
      config.height - config.margin.top - config.margin.bottom;

    const g = svg
      .append('g')
      .attr(
        'transform',
        `translate(${config.margin.left},${config.margin.top})`
      );

    // Prepare data
    const segments = workoutData.segments || [];
    let cumulativeTime = 0;
    const timeData = segments.map((segment, index) => {
      const startTime = cumulativeTime;
      cumulativeTime += segment.duration || 60;
      return {
        ...segment,
        startTime,
        endTime: cumulativeTime,
        index,
      };
    });

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, cumulativeTime])
      .range([0, chartWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(segments, d => d.power || 0)])
      .range([chartHeight, 0]);

    // Create line generator
    const line = d3
      .line()
      .x(d => xScale(d.time))
      .y(d => yScale(d.power))
      .curve(d3.curveStepAfter);

    // Create static workout path (background)
    const staticPath = [];
    timeData.forEach(segment => {
      staticPath.push({ time: segment.startTime, power: segment.power || 0 });
      staticPath.push({ time: segment.endTime, power: segment.power || 0 });
    });

    g.append('path')
      .datum(staticPath)
      .attr('class', 'static-path')
      .attr('fill', 'none')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Create animated path
    const animatedPath = g
      .append('path')
      .attr('class', 'animated-path')
      .attr('fill', 'none')
      .attr('stroke', '#007bff')
      .attr('stroke-width', 3);

    // Create current position indicator
    const currentIndicator = g
      .append('circle')
      .attr('class', 'current-indicator')
      .attr('r', 6)
      .attr('fill', '#ff4444')
      .style('opacity', 0);

    // Add axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d => this.formatTime(d));

    const yAxis = d3.axisLeft(yScale);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis);

    g.append('g').attr('class', 'y-axis').call(yAxis);

    // Add axis labels
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 35)
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif')
      .text('Time');

    g.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -40)
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif')
      .text('Power (%FTP)');

    // Animation state
    const animationState = {
      isPlaying: false,
      currentTime: 0,
      intervalId: null,
    };

    // Animation function
    const animate = () => {
      if (!animationState.isPlaying) return;

      const currentData = [];
      let totalTime = 0;

      for (const segment of timeData) {
        if (totalTime >= animationState.currentTime) break;

        const segmentEnd = Math.min(
          segment.endTime,
          animationState.currentTime
        );
        currentData.push({
          time: segment.startTime,
          power: segment.power || 0,
        });
        if (segmentEnd > segment.startTime) {
          currentData.push({ time: segmentEnd, power: segment.power || 0 });
        }
        totalTime = segmentEnd;
      }

      // Update animated path
      animatedPath.datum(currentData).attr('d', line);

      // Update current indicator
      if (currentData.length > 0) {
        const lastPoint = currentData[currentData.length - 1];
        currentIndicator
          .attr('cx', xScale(lastPoint.time))
          .attr('cy', yScale(lastPoint.power))
          .style('opacity', 1);
      }

      // Update time
      animationState.currentTime += 1;
      if (animationState.currentTime > cumulativeTime) {
        animationState.currentTime = 0; // Loop animation
      }
    };

    // Control functions
    const startAnimation = () => {
      if (!animationState.isPlaying) {
        animationState.isPlaying = true;
        animationState.intervalId = setInterval(
          animate,
          config.animationSpeed / cumulativeTime
        );
      }
    };

    const stopAnimation = () => {
      animationState.isPlaying = false;
      if (animationState.intervalId) {
        clearInterval(animationState.intervalId);
        animationState.intervalId = null;
      }
    };

    const resetAnimation = () => {
      stopAnimation();
      animationState.currentTime = 0;
      animatedPath.attr('d', '');
      currentIndicator.style('opacity', 0);
    };

    // Add controls if enabled
    if (config.showControls) {
      const controls = container
        .append('div')
        .style('margin-top', '10px')
        .style('text-align', 'center');

      controls
        .append('button')
        .text('Play')
        .style('margin-right', '10px')
        .on('click', startAnimation);

      controls
        .append('button')
        .text('Pause')
        .style('margin-right', '10px')
        .on('click', stopAnimation);

      controls.append('button').text('Reset').on('click', resetAnimation);
    }

    // Auto-play if enabled
    if (config.autoPlay) {
      startAnimation();
    }

    // Store references
    this.d3Charts.set(containerId, {
      svg,
      config,
      animationState,
      controls: { startAnimation, stopAnimation, resetAnimation },
    });

    return {
      svg,
      controls: { startAnimation, stopAnimation, resetAnimation },
    };
  }

  /**
   * Create Power Duration Curve
   * Best efforts curve with trend analysis
   */
  createPowerDurationCurve(containerId, workoutHistory, options = {}) {
    const container = d3.select(`#${containerId}`);
    if (container.empty()) {
      throw new Error(`Container not found: ${containerId}`);
    }

    const config = {
      width: options.width || 600,
      height: options.height || 400,
      margin: options.margin || { top: 20, right: 20, bottom: 60, left: 80 },
      showTrend: options.showTrend !== false,
      showGoals: options.showGoals !== false,
      interactive: options.interactive !== false,
      durations: options.durations || [5, 15, 30, 60, 300, 600, 1200, 3600], // seconds
      ...options,
    };

    // Clear previous content
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', config.width)
      .attr('height', config.height)
      .attr('role', 'img')
      .attr('aria-label', 'Power duration curve chart');

    const chartWidth = config.width - config.margin.left - config.margin.right;
    const chartHeight =
      config.height - config.margin.top - config.margin.bottom;

    const g = svg
      .append('g')
      .attr(
        'transform',
        `translate(${config.margin.left},${config.margin.top})`
      );

    // Calculate power duration curve data
    const curveData = this.calculatePowerDurationCurve(
      workoutHistory,
      config.durations
    );

    // Scales
    const xScale = d3
      .scaleLog()
      .domain(d3.extent(curveData, d => d.duration))
      .range([0, chartWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(curveData, d => d.power) * 1.1])
      .range([chartHeight, 0]);

    // Create line generator
    const line = d3
      .line()
      .x(d => xScale(d.duration))
      .y(d => yScale(d.power))
      .curve(d3.curveMonotoneX);

    // Add trend line if enabled
    if (config.showTrend && curveData.length > 2) {
      const trendData = this.calculateTrendLine(curveData);
      const trendLine = d3
        .line()
        .x(d => xScale(d.duration))
        .y(d => yScale(d.power))
        .curve(d3.curveLinear);

      g.append('path')
        .datum(trendData)
        .attr('class', 'trend-line')
        .attr('fill', 'none')
        .attr('stroke', '#ff6b6b')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('d', trendLine);
    }

    // Add main curve
    g.append('path')
      .datum(curveData)
      .attr('class', 'power-curve')
      .attr('fill', 'none')
      .attr('stroke', '#007bff')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Add data points
    const points = g
      .selectAll('.data-point')
      .data(curveData)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.duration))
      .attr('cy', d => yScale(d.power))
      .attr('r', 4)
      .attr('fill', '#007bff')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add axes
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues([5, 15, 30, 60, 300, 600, 1200, 3600])
      .tickFormat(d => {
        if (d < 60) return `${d}s`;
        if (d < 3600) return `${Math.floor(d / 60)}m`;
        return `${Math.floor(d / 3600)}h`;
      });

    const yAxis = d3.axisLeft(yScale).tickFormat(d => `${d}W`);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis);

    g.append('g').attr('class', 'y-axis').call(yAxis);

    // Add axis labels
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 45)
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif')
      .text('Duration');

    g.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -50)
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif')
      .text('Power (Watts)');

    // Add goal lines if provided
    if (config.showGoals && options.goals) {
      options.goals.forEach((goal, index) => {
        g.append('line')
          .attr('class', `goal-line-${index}`)
          .attr('x1', 0)
          .attr('x2', chartWidth)
          .attr('y1', yScale(goal.power))
          .attr('y2', yScale(goal.power))
          .attr('stroke', goal.color || '#28a745')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,3');

        g.append('text')
          .attr('class', `goal-label-${index}`)
          .attr('x', chartWidth - 5)
          .attr('y', yScale(goal.power) - 5)
          .attr('text-anchor', 'end')
          .attr('font-size', '10px')
          .attr('font-family', 'sans-serif')
          .attr('fill', goal.color || '#28a745')
          .text(goal.label || `Goal: ${goal.power}W`);
      });
    }

    // Add interactivity if enabled
    if (config.interactive) {
      points
        .on('mouseover', (event, d) => {
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr('r', 6);

          this.showTooltip(
            event,
            `Duration: ${this.formatDuration(d.duration)}\n` +
              `Power: ${Math.round(d.power)}W\n` +
              `Date: ${d.date ? new Date(d.date).toLocaleDateString() : 'N/A'}`
          );
        })
        .on('mouseout', event => {
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr('r', 4);

          this.hideTooltip();
        });
    }

    // Add legend
    const legend = g
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${chartWidth - 120}, 20)`);

    legend
      .append('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', '#007bff')
      .attr('stroke-width', 3);

    legend
      .append('text')
      .attr('x', 25)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif')
      .text('Power Curve');

    if (config.showTrend && curveData.length > 2) {
      legend
        .append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 15)
        .attr('y2', 15)
        .attr('stroke', '#ff6b6b')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');

      legend
        .append('text')
        .attr('x', 25)
        .attr('y', 15)
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .attr('font-family', 'sans-serif')
        .text('Trend');
    }

    this.d3Charts.set(containerId, { svg, config, curveData });

    return { svg, curveData };
  }

  /**
   * Create Comparative Heat Maps
   * Compare multiple workouts with heat map overlays
   */
  createComparativeHeatMaps(containerId, workoutsData, options = {}) {
    const container = d3.select(`#${containerId}`);
    if (container.empty()) {
      throw new Error(`Container not found: ${containerId}`);
    }

    const config = {
      width: options.width || 800,
      height: options.height || 400,
      margin: options.margin || { top: 40, right: 100, bottom: 60, left: 60 },
      cellWidth: options.cellWidth || 8,
      cellHeight: options.cellHeight || 20,
      showLegend: options.showLegend !== false,
      showLabels: options.showLabels !== false,
      colorScale: options.colorScale || 'RdYlBu',
      ...options,
    };

    // Clear previous content
    container.selectAll('*').remove();

    const svg = container
      .append('svg')
      .attr('width', config.width)
      .attr('height', config.height)
      .attr('role', 'img')
      .attr('aria-label', 'Comparative workout heat maps');

    const chartWidth = config.width - config.margin.left - config.margin.right;
    const chartHeight =
      config.height - config.margin.top - config.margin.bottom;

    const g = svg
      .append('g')
      .attr(
        'transform',
        `translate(${config.margin.left},${config.margin.top})`
      );

    // Process workout data
    const processedData = this.processComparativeData(workoutsData);
    const maxDuration = Math.max(...processedData.map(w => w.segments.length));

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(d3.range(maxDuration))
      .range([0, chartWidth])
      .paddingInner(0.05);

    const yScale = d3
      .scaleBand()
      .domain(processedData.map(d => d.name))
      .range([0, chartHeight])
      .paddingInner(0.1);

    const maxPower = d3.max(
      processedData.flatMap(w => w.segments.map(s => s.power || 0))
    );
    const colorScale = d3
      .scaleSequential(d3[`interpolate${config.colorScale}`])
      .domain([0, maxPower]);

    // Create heat map cells
    processedData.forEach((workout, workoutIndex) => {
      const workoutGroup = g
        .append('g')
        .attr('class', `workout-${workoutIndex}`);

      const cells = workoutGroup
        .selectAll('rect')
        .data(workout.segments)
        .enter()
        .append('rect')
        .attr('x', (d, i) => xScale(i))
        .attr('y', yScale(workout.name))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(d.power || 0))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('rx', 2)
        .attr('ry', 2);

      // Add interactivity
      cells
        .on('mouseover', (event, d) => {
          d3.select(event.currentTarget)
            .attr('stroke-width', 2)
            .attr('stroke', '#333');

          this.showTooltip(
            event,
            `Workout: ${workout.name}\n` +
              `Segment: ${d.index + 1}\n` +
              `Power: ${Math.round(d.power || 0)}W\n` +
              `Duration: ${this.formatDuration(d.duration || 60)}`
          );
        })
        .on('mouseout', event => {
          d3.select(event.currentTarget)
            .attr('stroke-width', 1)
            .attr('stroke', '#fff');

          this.hideTooltip();
        });
    });

    // Add workout labels if enabled
    if (config.showLabels) {
      g.selectAll('.workout-label')
        .data(processedData)
        .enter()
        .append('text')
        .attr('class', 'workout-label')
        .attr('x', -10)
        .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', '12px')
        .attr('font-family', 'sans-serif')
        .attr('fill', '#333')
        .text(d => d.name);
    }

    // Add time axis
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(xScale.domain().filter((d, i) => i % 5 === 0))
      .tickFormat(d => {
        const minutes = Math.floor((d * 60) / 60); // Assuming 1 minute segments
        return `${minutes}m`;
      });

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis);

    // Add axis label
    g.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 45)
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif')
      .text('Time (minutes)');

    // Add legend if enabled
    if (config.showLegend) {
      this.addComparativeHeatMapLegend(svg, config, colorScale, maxPower);
    }

    // Add title
    svg
      .append('text')
      .attr('class', 'chart-title')
      .attr('text-anchor', 'middle')
      .attr('x', config.width / 2)
      .attr('y', 20)
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#333')
      .text('Workout Comparison Heat Map');

    this.d3Charts.set(containerId, { svg, config, processedData });

    return { svg, processedData };
  }

  // Utility methods
  calculateTrainingLoad(workout) {
    if (!workout.segments) return 0;

    return workout.segments.reduce((total, segment) => {
      const power = segment.power || 0;
      const duration = segment.duration || 60;
      return total + (power * duration) / 3600; // Normalized training load
    }, 0);
  }

  calculateZoneDistribution(workoutData) {
    const zones = [
      { zone: 'Recovery', min: 0, max: 55, time: 0 },
      { zone: 'Endurance', min: 55, max: 75, time: 0 },
      { zone: 'Tempo', min: 75, max: 90, time: 0 },
      { zone: 'Threshold', min: 90, max: 105, time: 0 },
      { zone: 'VO2 Max', min: 105, max: 120, time: 0 },
      { zone: 'Neuromuscular', min: 120, max: 200, time: 0 },
    ];

    if (!workoutData.segments) return zones;

    workoutData.segments.forEach(segment => {
      const power = segment.power || 0;
      const duration = segment.duration || 60;

      const zone = zones.find(z => power >= z.min && power < z.max);
      if (zone) {
        zone.time += duration;
      }
    });

    return zones.filter(zone => zone.time > 0);
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Additional utility methods for new chart types
  calculatePowerDurationCurve(workoutHistory, durations) {
    const curveData = [];

    durations.forEach(duration => {
      let bestPower = 0;
      let bestDate = null;

      workoutHistory.forEach(workout => {
        if (!workout.segments) return;

        // Calculate best power for this duration across all workouts
        const power = this.findBestEffort(workout, duration);
        if (power > bestPower) {
          bestPower = power;
          bestDate = workout.date;
        }
      });

      if (bestPower > 0) {
        curveData.push({
          duration,
          power: bestPower,
          date: bestDate,
        });
      }
    });

    return curveData;
  }

  findBestEffort(workout, targetDuration) {
    if (!workout.segments) return 0;

    let bestPower = 0;
    let currentDuration = 0;
    let currentPowerSum = 0;
    let windowStart = 0;

    // Use sliding window approach to find best average power for target duration
    for (let i = 0; i < workout.segments.length; i++) {
      const segment = workout.segments[i];
      const segmentDuration = segment.duration || 60;
      const segmentPower = segment.power || 0;

      currentDuration += segmentDuration;
      currentPowerSum += segmentPower * segmentDuration;

      // Remove segments from the start of window if we exceed target duration
      while (currentDuration > targetDuration && windowStart < i) {
        const startSegment = workout.segments[windowStart];
        const startDuration = startSegment.duration || 60;
        const startPower = startSegment.power || 0;

        currentDuration -= startDuration;
        currentPowerSum -= startPower * startDuration;
        windowStart++;
      }

      // Check if current window matches target duration
      if (Math.abs(currentDuration - targetDuration) < 30) {
        // 30 second tolerance
        const avgPower = currentPowerSum / currentDuration;
        if (avgPower > bestPower) {
          bestPower = avgPower;
        }
      }
    }

    return bestPower;
  }

  calculateTrendLine(data) {
    if (data.length < 2) return data;

    // Simple linear regression for trend line
    const n = data.length;
    const xValues = data.map(d => Math.log(d.duration));
    const yValues = data.map(d => d.power);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
    const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map(d => ({
      duration: d.duration,
      power: Math.max(0, slope * Math.log(d.duration) + intercept),
    }));
  }

  processComparativeData(workoutsData) {
    return workoutsData.map(workout => {
      const segments = workout.segments || [];
      return {
        name:
          workout.name || workout.title || `Workout ${workout.id || 'Unknown'}`,
        date: workout.date,
        segments: segments.map((segment, index) => ({
          ...segment,
          index,
        })),
      };
    });
  }

  addComparativeHeatMapLegend(svg, config, colorScale, maxValue) {
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = config.width - legendWidth - 20;
    const legendY = config.margin.top + 10;

    const legendScale = d3
      .scaleLinear()
      .domain([0, maxValue])
      .range([0, legendWidth]);

    const legendAxis = d3.axisTop(legendScale).ticks(5).tickSize(3);

    // Create gradient
    const defs = svg.select('defs').empty()
      ? svg.append('defs')
      : svg.select('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'comparative-legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      gradient
        .append('stop')
        .attr('offset', `${(i / numStops) * 100}%`)
        .attr('stop-color', colorScale((maxValue * i) / numStops));
    }

    // Legend group
    const legend = svg
      .append('g')
      .attr('class', 'comparative-legend')
      .attr('transform', `translate(${legendX},${legendY})`);

    // Legend rectangle
    legend
      .append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#comparative-legend-gradient)')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1);

    // Legend axis
    legend.append('g').attr('transform', `translate(0,0)`).call(legendAxis);

    // Legend title
    legend
      .append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#666')
      .text('Power (Watts)');
  }

  addHeatMapLegend(svg, config, colorScale, maxValue) {
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = config.width - legendWidth - config.margin.right;
    const legendY = config.height - legendHeight - 10;

    const legendScale = d3
      .scaleLinear()
      .domain([0, maxValue])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale).ticks(5).tickSize(3);

    // Create gradient
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      gradient
        .append('stop')
        .attr('offset', `${(i / numStops) * 100}%`)
        .attr('stop-color', colorScale((maxValue * i) / numStops));
    }

    // Legend group
    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX},${legendY})`);

    // Legend rectangle
    legend
      .append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#legend-gradient)')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 1);

    // Legend axis
    legend
      .append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(legendAxis);

    // Legend title
    legend
      .append('text')
      .attr('x', legendWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#666')
      .text('Training Load');
  }

  addResizeHandler(containerId, config) {
    const resizeHandler = () => {
      const threeJsRef = this.threeJsScenes.get(containerId);
      if (threeJsRef) {
        const { container } = threeJsRef;
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;

        threeJsRef.camera.aspect = newWidth / newHeight;
        threeJsRef.camera.updateProjectionMatrix();
        threeJsRef.renderer.setSize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', resizeHandler);
    return resizeHandler;
  }

  showTooltip(event, content) {
    // Remove existing tooltip
    d3.select('.chart-tooltip').remove();

    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('font-family', 'sans-serif')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    tooltip
      .html(content.replace(/\n/g, '<br>'))
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`)
      .transition()
      .duration(200)
      .style('opacity', 1);
  }

  hideTooltip() {
    d3.select('.chart-tooltip')
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();
  }

  /**
   * Export chart as PNG
   */
  async exportChartAsPNG(containerId, filename = 'chart.png', options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    const config = {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      ...options,
    };

    try {
      const canvas = await html2canvas(container, config);
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('PNG export failed:', error);
      throw new Error(`Failed to export chart as PNG: ${error.message}`);
    }
  }

  /**
   * Export chart as SVG
   */
  exportChartAsSVG(containerId, filename = 'chart.svg') {
    const d3Chart = this.d3Charts.get(containerId);
    if (!d3Chart || !d3Chart.svg) {
      throw new Error(`SVG chart not found: ${containerId}`);
    }

    try {
      const svgElement = d3Chart.svg.node();
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      const link = document.createElement('a');
      link.download = filename;
      link.href = svgUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(svgUrl);
      return svgData;
    } catch (error) {
      console.error('SVG export failed:', error);
      throw new Error(`Failed to export chart as SVG: ${error.message}`);
    }
  }

  /**
   * Export chart as PDF
   */
  async exportChartAsPDF(containerId, filename = 'chart.pdf', options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container not found: ${containerId}`);
    }

    const config = {
      format: 'a4',
      orientation: 'landscape',
      margin: 20,
      ...options,
    };

    try {
      // First convert to canvas
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: config.orientation,
        unit: 'mm',
        format: config.format,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdf.internal.pageSize.getWidth() - 2 * config.margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(
        imgData,
        'PNG',
        config.margin,
        config.margin,
        imgWidth,
        imgHeight
      );

      // Add title if provided
      if (options.title) {
        pdf.setFontSize(16);
        pdf.text(options.title, config.margin, config.margin - 5);
      }

      pdf.save(filename);

      return pdf;
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error(`Failed to export chart as PDF: ${error.message}`);
    }
  }

  /**
   * Export chart data as JSON
   */
  exportChartData(containerId, filename = 'chart-data.json') {
    const d3Chart = this.d3Charts.get(containerId);
    if (!d3Chart) {
      throw new Error(`Chart not found: ${containerId}`);
    }

    try {
      const data = {
        type: 'advanced-chart',
        containerId,
        config: d3Chart.config,
        data:
          d3Chart.curveData || d3Chart.zoneData || d3Chart.processedData || {},
        exportDate: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(dataUrl);
      return data;
    } catch (error) {
      console.error('Data export failed:', error);
      throw new Error(`Failed to export chart data: ${error.message}`);
    }
  }

  /**
   * Batch export multiple formats
   */
  async exportChartMultiple(
    containerId,
    baseName = 'chart',
    formats = ['png', 'svg', 'json']
  ) {
    const results = {};

    for (const format of formats) {
      try {
        switch (format.toLowerCase()) {
          case 'png':
            results.png = await this.exportChartAsPNG(
              containerId,
              `${baseName}.png`
            );
            break;
          case 'svg':
            results.svg = this.exportChartAsSVG(containerId, `${baseName}.svg`);
            break;
          case 'pdf':
            results.pdf = await this.exportChartAsPDF(
              containerId,
              `${baseName}.pdf`
            );
            break;
          case 'json':
            results.json = this.exportChartData(
              containerId,
              `${baseName}.json`
            );
            break;
          default:
            console.warn(`Unsupported export format: ${format}`);
        }
      } catch (error) {
        console.error(`Failed to export ${format}:`, error);
        results[format] = { error: error.message };
      }
    }

    return results;
  }

  // Cleanup methods
  destroyChart(containerId) {
    // Stop animations
    const frameId = this.animationFrames.get(containerId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(containerId);
    }

    // Clean up D3 charts
    const d3Chart = this.d3Charts.get(containerId);
    if (d3Chart) {
      if (d3Chart.animationState?.intervalId) {
        clearInterval(d3Chart.animationState.intervalId);
      }
      this.d3Charts.delete(containerId);
    }

    // Clean up Three.js scenes
    const threeJsRef = this.threeJsScenes.get(containerId);
    if (threeJsRef) {
      threeJsRef.renderer.dispose();
      threeJsRef.scene.clear();
      if (threeJsRef.container.contains(threeJsRef.renderer.domElement)) {
        threeJsRef.container.removeChild(threeJsRef.renderer.domElement);
      }
      this.threeJsScenes.delete(containerId);
    }

    // Clear container
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }
  }

  destroyAll() {
    // Clean up all charts
    for (const containerId of this.charts.keys()) {
      this.destroyChart(containerId);
    }

    this.charts.clear();
    this.d3Charts.clear();
    this.threeJsScenes.clear();
    this.animationFrames.clear();
  }
}

// Export singleton instance
export const advancedCharts = new AdvancedCharts();

// Convenience functions
export const create3DPowerSurface = (containerId, workoutData, options) =>
  advancedCharts.create3DPowerSurface(containerId, workoutData, options);

export const createHeatMapCalendar = (containerId, trainingData, options) =>
  advancedCharts.createHeatMapCalendar(containerId, trainingData, options);

export const createZoneDistribution = (containerId, workoutData, options) =>
  advancedCharts.createZoneDistribution(containerId, workoutData, options);

export const createAnimatedPreview = (containerId, workoutData, options) =>
  advancedCharts.createAnimatedPreview(containerId, workoutData, options);

export const createPowerDurationCurve = (
  containerId,
  workoutHistory,
  options
) =>
  advancedCharts.createPowerDurationCurve(containerId, workoutHistory, options);

export const createComparativeHeatMaps = (containerId, workoutsData, options) =>
  advancedCharts.createComparativeHeatMaps(containerId, workoutsData, options);

// Export functions
export const exportChartAsPNG = (containerId, filename, options) =>
  advancedCharts.exportChartAsPNG(containerId, filename, options);

export const exportChartAsSVG = (containerId, filename) =>
  advancedCharts.exportChartAsSVG(containerId, filename);

export const exportChartAsPDF = (containerId, filename, options) =>
  advancedCharts.exportChartAsPDF(containerId, filename, options);

export const exportChartData = (containerId, filename) =>
  advancedCharts.exportChartData(containerId, filename);

export const exportChartMultiple = (containerId, baseName, formats) =>
  advancedCharts.exportChartMultiple(containerId, baseName, formats);
