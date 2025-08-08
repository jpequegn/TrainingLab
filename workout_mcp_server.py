#!/usr/bin/env python3
"""
Specialized Workout Creation MCP Server
Provides advanced workout creation, parsing, and optimization with domain expertise.
"""

import re
import os
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from fastmcp import FastMCP

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkoutType(Enum):
    ENDURANCE = "endurance"
    THRESHOLD = "threshold"
    VO2MAX = "vo2max"
    ANAEROBIC = "anaerobic"
    RECOVERY = "recovery"
    MIXED = "mixed"
    INTERVALS = "intervals"
    PROGRESSIVE = "progressive"
    CUSTOM = "custom"

class PowerZone(Enum):
    RECOVERY = (1, 0.55, "Active Recovery")
    ENDURANCE = (2, 0.75, "Endurance") 
    TEMPO = (3, 0.90, "Tempo")
    THRESHOLD = (4, 1.05, "Lactate Threshold")
    VO2MAX = (5, 1.20, "VO2 Max")
    ANAEROBIC = (6, 1.50, "Anaerobic Capacity")
    NEUROMUSCULAR = (7, 2.50, "Neuromuscular Power")

@dataclass
class WorkoutSegment:
    """Enhanced workout segment with power progression support"""
    duration: int  # seconds
    power_start: float  # percentage of FTP
    power_end: Optional[float] = None  # for progressive segments
    cadence: Optional[int] = None
    segment_type: str = "SteadyState"
    name: Optional[str] = None
    
    @property
    def power_avg(self) -> float:
        if self.power_end is not None:
            return (self.power_start + self.power_end) / 2
        return self.power_start

@dataclass
class ComplexInterval:
    """Complex interval structure with nested segments"""
    repetitions: int
    segments: List[WorkoutSegment]
    recovery_duration: int = 0
    recovery_power: float = 0.5

@dataclass
class WorkoutData:
    """Complete workout structure"""
    name: str
    description: str
    author: str = "Workout Creator MCP"
    sport_type: str = "bike"
    total_duration: int = 0
    segments: List[WorkoutSegment] = None
    complex_intervals: List[ComplexInterval] = None
    tss: float = 0.0
    workout_type: WorkoutType = WorkoutType.CUSTOM
    
    def __post_init__(self):
        if self.segments is None:
            self.segments = []
        if self.complex_intervals is None:
            self.complex_intervals = []

class WorkoutMCPServer:
    """Specialized MCP Server for workout creation and optimization"""
    
    def __init__(self):
        self.app = FastMCP("Workout Creator")
        self.ftp = 250  # Default FTP
        self.weight = 75  # Default weight in kg
        self._setup_tools()
    
    def _setup_tools(self):
        """Register all workout creation tools"""
        
        @self.app.tool("parse_workout_description")
        def parse_workout_description(description: str) -> Dict[str, Any]:
            """
            Parse natural language workout description into structured data
            
            Args:
                description: Natural language workout description
                
            Returns:
                Structured workout data with segments and metadata
            """
            try:
                return self.parse_workout_description(description)
            except Exception as e:
                logger.error(f"Error parsing workout: {e}")
                return {"error": str(e)}
        
        @self.app.tool("create_interval_workout")
        def create_interval_workout(
            intervals: int,
            work_duration: str,
            work_power: float,
            rest_duration: str,
            rest_power: float = 0.5,
            warmup_duration: str = "10min",
            cooldown_duration: str = "10min"
        ) -> Dict[str, Any]:
            """
            Create structured interval workout
            
            Args:
                intervals: Number of intervals
                work_duration: Work period duration (e.g., "5min", "300s")
                work_power: Work power as percentage of FTP (e.g., 1.05 for 105%)
                rest_duration: Rest period duration
                rest_power: Rest power as percentage of FTP
                warmup_duration: Warmup duration
                cooldown_duration: Cooldown duration
                
            Returns:
                Complete workout structure
            """
            try:
                work_seconds = self._parse_duration(work_duration)
                rest_seconds = self._parse_duration(rest_duration)
                warmup_seconds = self._parse_duration(warmup_duration)
                cooldown_seconds = self._parse_duration(cooldown_duration)
                
                segments = []
                
                # Warmup
                segments.append(WorkoutSegment(
                    duration=warmup_seconds,
                    power_start=0.5,
                    power_end=0.75,
                    segment_type="Warmup",
                    name="Warmup"
                ))
                
                # Intervals
                for i in range(intervals):
                    # Work interval
                    segments.append(WorkoutSegment(
                        duration=work_seconds,
                        power_start=work_power,
                        segment_type="SteadyState",
                        name=f"Interval {i+1}"
                    ))
                    
                    # Recovery (except after last interval)
                    if i < intervals - 1:
                        segments.append(WorkoutSegment(
                            duration=rest_seconds,
                            power_start=rest_power,
                            segment_type="SteadyState",
                            name=f"Recovery {i+1}"
                        ))
                
                # Cooldown
                segments.append(WorkoutSegment(
                    duration=cooldown_seconds,
                    power_start=0.6,
                    power_end=0.4,
                    segment_type="Cooldown",
                    name="Cooldown"
                ))
                
                workout = WorkoutData(
                    name=f"{intervals}x{work_duration} @ {int(work_power*100)}%",
                    description=f"{intervals} intervals of {work_duration} at {int(work_power*100)}% FTP",
                    segments=segments,
                    workout_type=WorkoutType.INTERVALS
                )
                
                return self._finalize_workout(workout)
                
            except Exception as e:
                logger.error(f"Error creating interval workout: {e}")
                return {"error": str(e)}
        
        @self.app.tool("create_complex_interval_workout")
        def create_complex_interval_workout(
            pattern: str,
            repetitions: int,
            recovery_duration: str,
            remainder_duration: str = None,
            remainder_power: float = 0.65
        ) -> Dict[str, Any]:
            """
            Create complex interval workout with nested power structures
            
            Args:
                pattern: Complex interval pattern (e.g., "first 2' @ 105% then 12' at 100%")
                repetitions: Number of repetitions of the complex interval
                recovery_duration: Recovery time between repetitions
                remainder_duration: Additional training time after intervals
                remainder_power: Power for remainder time as % FTP
                
            Returns:
                Complete workout structure with complex intervals
            """
            try:
                # Parse the complex pattern
                segments = self._parse_complex_pattern(pattern)
                recovery_seconds = self._parse_duration(recovery_duration)
                
                complex_interval = ComplexInterval(
                    repetitions=repetitions,
                    segments=segments,
                    recovery_duration=recovery_seconds,
                    recovery_power=0.5
                )
                
                workout = WorkoutData(
                    name=f"{repetitions} x {pattern}",
                    description=f"{repetitions} repetitions of complex interval: {pattern}",
                    complex_intervals=[complex_interval],
                    workout_type=WorkoutType.MIXED
                )
                
                # Add remainder if specified
                if remainder_duration:
                    remainder_seconds = self._parse_duration(remainder_duration)
                    remainder_segment = WorkoutSegment(
                        duration=remainder_seconds,
                        power_start=remainder_power,
                        segment_type="SteadyState",
                        name="Remainder Training"
                    )
                    workout.segments.append(remainder_segment)
                
                return self._finalize_workout(workout)
                
            except Exception as e:
                logger.error(f"Error creating complex interval workout: {e}")
                return {"error": str(e)}
        
        @self.app.tool("calculate_tss")
        def calculate_tss(segments: List[Dict[str, Any]], ftp: int = 250) -> float:
            """
            Calculate Training Stress Score for workout segments
            
            Args:
                segments: List of workout segments with duration and power
                ftp: Functional Threshold Power
                
            Returns:
                Calculated TSS value
            """
            try:
                return self._calculate_tss([self._dict_to_segment(s) for s in segments], ftp)
            except Exception as e:
                logger.error(f"Error calculating TSS: {e}")
                return 0.0
        
        @self.app.tool("optimize_workout")
        def optimize_workout(
            workout_data: Dict[str, Any],
            target_duration: int = None,
            target_tss: float = None,
            max_power: float = 1.2
        ) -> Dict[str, Any]:
            """
            Optimize workout for target duration or TSS
            
            Args:
                workout_data: Current workout structure
                target_duration: Target duration in seconds
                target_tss: Target TSS value
                max_power: Maximum power as % FTP
                
            Returns:
                Optimized workout structure
            """
            try:
                # Implementation would go here for workout optimization
                # For now, return the original workout with calculated values
                segments = [self._dict_to_segment(s) for s in workout_data.get("segments", [])]
                
                workout = WorkoutData(
                    name=workout_data.get("name", "Optimized Workout"),
                    description=workout_data.get("description", ""),
                    segments=segments
                )
                
                return self._finalize_workout(workout)
                
            except Exception as e:
                logger.error(f"Error optimizing workout: {e}")
                return {"error": str(e)}
        
        @self.app.tool("get_power_zones")
        def get_power_zones(ftp: int = 250) -> Dict[str, Dict[str, Any]]:
            """
            Get power zone definitions based on FTP
            
            Args:
                ftp: Functional Threshold Power
                
            Returns:
                Power zones with ranges and descriptions
            """
            zones = {}
            for zone in PowerZone:
                zone_num, percentage, description = zone.value
                zones[f"zone_{zone_num}"] = {
                    "name": description,
                    "percentage": percentage,
                    "power_range": {
                        "min": int(ftp * (percentage - 0.05)) if zone_num > 1 else 0,
                        "max": int(ftp * (percentage + 0.05))
                    }
                }
            return zones
        
        @self.app.tool("validate_workout")
        def validate_workout(workout_data: Dict[str, Any]) -> Dict[str, Any]:
            """
            Validate workout structure and provide recommendations
            
            Args:
                workout_data: Workout structure to validate
                
            Returns:
                Validation results with errors and warnings
            """
            try:
                validation = {
                    "valid": True,
                    "errors": [],
                    "warnings": [],
                    "recommendations": []
                }
                
                # Check required fields
                required_fields = ["name", "segments"]
                for field in required_fields:
                    if field not in workout_data:
                        validation["errors"].append(f"Missing required field: {field}")
                        validation["valid"] = False
                
                # Check segments
                segments = workout_data.get("segments", [])
                if not segments:
                    validation["errors"].append("Workout must have at least one segment")
                    validation["valid"] = False
                
                total_duration = 0
                for i, segment in enumerate(segments):
                    if "duration" not in segment:
                        validation["errors"].append(f"Segment {i} missing duration")
                        validation["valid"] = False
                    
                    if "power_start" not in segment:
                        validation["errors"].append(f"Segment {i} missing power_start")
                        validation["valid"] = False
                    
                    total_duration += segment.get("duration", 0)
                
                # Workout duration recommendations
                if total_duration < 1800:  # 30 minutes
                    validation["warnings"].append("Workout is quite short (< 30 minutes)")
                elif total_duration > 14400:  # 4 hours
                    validation["warnings"].append("Workout is very long (> 4 hours)")
                
                # Power recommendations
                max_power = max((s.get("power_start", 0) for s in segments), default=0)
                if max_power > 2.0:
                    validation["warnings"].append("Very high power values detected (> 200% FTP)")
                
                return validation
                
            except Exception as e:
                logger.error(f"Error validating workout: {e}")
                return {"valid": False, "errors": [str(e)]}
    
    def parse_workout_description(self, description: str) -> Dict[str, Any]:
        """Parse natural language workout description"""
        description = description.lower().strip()
        
        # Extract duration
        total_duration = self._extract_total_duration(description)
        
        # Check for complex intervals
        if self._is_complex_interval(description):
            return self._parse_complex_workout(description)
        
        # Check for simple intervals
        if self._is_simple_intervals(description):
            return self._parse_simple_intervals(description)
        
        # Default to endurance workout
        return self._create_endurance_workout(description, total_duration)
    
    def _detect_workout_type(self, description: str) -> WorkoutType:
        """Detect workout type from description"""
        keywords = {
            WorkoutType.INTERVALS: ["interval", "repeat", "x", "times"],
            WorkoutType.THRESHOLD: ["threshold", "ftp", "tempo"],
            WorkoutType.VO2MAX: ["vo2", "vo2max", "v02", "anaerobic"],
            WorkoutType.ENDURANCE: ["endurance", "easy", "zone 2", "aerobic"],
            WorkoutType.RECOVERY: ["recovery", "easy spin", "active recovery"],
            WorkoutType.PROGRESSIVE: ["progressive", "build", "ramp"]
        }
        
        for workout_type, words in keywords.items():
            if any(word in description for word in words):
                return workout_type
        
        return WorkoutType.CUSTOM
    
    def _extract_total_duration(self, description: str) -> int:
        """Extract total workout duration"""
        # Look for explicit duration patterns
        duration_patterns = [
            r'(\d+)\s*hours?\s*(\d+)?\s*min',
            r'(\d+)\s*h\s*(\d+)?\s*m',
            r'(\d+)\s*minutes?',
            r'(\d+)\s*min',
            r'(\d+)\s*hours?',
            r'(\d+)\s*h'
        ]
        
        for pattern in duration_patterns:
            match = re.search(pattern, description)
            if match:
                if 'hour' in pattern or 'h' in pattern:
                    hours = int(match.group(1))
                    minutes = int(match.group(2)) if match.group(2) else 0
                    return (hours * 3600) + (minutes * 60)
                else:
                    return int(match.group(1)) * 60
        
        # Default duration based on workout type
        return 3600  # 1 hour default
    
    def _is_complex_interval(self, description: str) -> bool:
        """Check if description contains complex interval pattern"""
        complex_patterns = [
            r'\d+\s*x\s*\d+[\'\"]\s*\(\d+[\'\"]\)\s*as',
            r'first\s+\d+[\'\"]\s*@\s*\d+%.*then',
            r'\d+\s*repetitions.*as.*@.*then'
        ]
        
        return any(re.search(pattern, description) for pattern in complex_patterns)
    
    def _is_simple_intervals(self, description: str) -> bool:
        """Check if description contains simple interval pattern"""
        interval_patterns = [
            r'\d+\s*x\s*\d+',
            r'\d+\s*times',
            r'\d+\s*intervals',
            r'\d+\s*repeats'
        ]
        
        return any(re.search(pattern, description) for pattern in interval_patterns)
    
    def _parse_complex_workout(self, description: str) -> Dict[str, Any]:
        """Parse complex interval workout"""
        # Example: "2 x 14' (4') as first 2' @ 105% then 12' at 100% @ FTP"
        
        # Extract repetitions and recovery
        reps_match = re.search(r'(\d+)\s*x\s*(\d+)[\'\"]\s*\((\d+)[\'\"]\)', description)
        if not reps_match:
            raise ValueError("Could not parse complex interval structure")
        
        repetitions = int(reps_match.group(1))
        total_interval_duration = int(reps_match.group(2)) * 60  # Convert to seconds
        recovery_duration = int(reps_match.group(3)) * 60
        
        # Parse the complex pattern
        pattern = description.split(" as ")[1] if " as " in description else ""
        segments = self._parse_complex_pattern(pattern)
        
        # Ensure segments fit within total duration
        segment_total = sum(s.duration for s in segments)
        if segment_total != total_interval_duration:
            # Scale segments to fit
            scale_factor = total_interval_duration / segment_total
            for segment in segments:
                segment.duration = int(segment.duration * scale_factor)
        
        complex_interval = ComplexInterval(
            repetitions=repetitions,
            segments=segments,
            recovery_duration=recovery_duration
        )
        
        workout = WorkoutData(
            name=f"{repetitions} x {reps_match.group(2)}' Complex Intervals",
            description=description,
            complex_intervals=[complex_interval],
            workout_type=WorkoutType.INTERVALS
        )
        
        return self._finalize_workout(workout)
    
    def _parse_complex_pattern(self, pattern: str) -> List[WorkoutSegment]:
        """Parse complex power pattern within an interval"""
        segments = []
        
        # Pattern: "first 2' @ 105% then 12' at 100%"
        parts = re.split(r'\s+then\s+', pattern)
        
        for part in parts:
            # Extract duration and power
            duration_match = re.search(r'(\d+)[\'\"m]', part)
            power_match = re.search(r'(\d+)%', part)
            
            if duration_match and power_match:
                duration = int(duration_match.group(1)) * 60  # Convert to seconds
                power = float(power_match.group(1)) / 100  # Convert to decimal
                
                segments.append(WorkoutSegment(
                    duration=duration,
                    power_start=power,
                    segment_type="SteadyState"
                ))
        
        return segments
    
    def _parse_simple_intervals(self, description: str) -> Dict[str, Any]:
        """Parse simple interval workout"""
        # Extract number of intervals
        intervals_match = re.search(r'(\d+)\s*[x×]\s*(\d+)', description)
        if not intervals_match:
            intervals_match = re.search(r'(\d+)\s*intervals?', description)
            if intervals_match:
                intervals = int(intervals_match.group(1))
                work_duration = "5min"  # Default
            else:
                raise ValueError("Could not parse interval structure")
        else:
            intervals = int(intervals_match.group(1))
            work_duration = f"{intervals_match.group(2)}min"
        
        # Extract power
        power_match = re.search(r'(\d+)%', description)
        work_power = float(power_match.group(1)) / 100 if power_match else 1.0
        
        # Use the interval creation tool
        return self.create_interval_workout(
            intervals=intervals,
            work_duration=work_duration,
            work_power=work_power,
            rest_duration="2min"  # Default recovery
        )
    
    def _create_endurance_workout(self, description: str, duration: int) -> Dict[str, Any]:
        """Create endurance workout"""
        # Extract power if specified
        power_match = re.search(r'(\d+)%', description)
        power = float(power_match.group(1)) / 100 if power_match else 0.65
        
        # Create simple endurance workout
        segments = [
            WorkoutSegment(
                duration=600,  # 10 min warmup
                power_start=0.5,
                power_end=power,
                segment_type="Warmup",
                name="Warmup"
            ),
            WorkoutSegment(
                duration=duration - 1200,  # Main section
                power_start=power,
                segment_type="SteadyState",
                name="Endurance"
            ),
            WorkoutSegment(
                duration=600,  # 10 min cooldown
                power_start=power,
                power_end=0.4,
                segment_type="Cooldown",
                name="Cooldown"
            )
        ]
        
        workout = WorkoutData(
            name="Endurance Workout",
            description=description,
            segments=segments,
            workout_type=WorkoutType.ENDURANCE
        )
        
        return self._finalize_workout(workout)
    
    def _parse_duration(self, duration_str: str) -> int:
        """Parse duration string to seconds"""
        duration_str = duration_str.lower().strip()
        
        # Handle various formats
        if 'h' in duration_str and 'm' in duration_str:
            # Format: "1h30m"
            match = re.search(r'(\d+)h(\d+)m', duration_str)
            if match:
                return int(match.group(1)) * 3600 + int(match.group(2)) * 60
        
        if 'hour' in duration_str:
            match = re.search(r'(\d+)', duration_str)
            return int(match.group(1)) * 3600 if match else 3600
        
        if 'min' in duration_str or "'" in duration_str:
            match = re.search(r'(\d+)', duration_str)
            return int(match.group(1)) * 60 if match else 1800
        
        if 's' in duration_str or 'sec' in duration_str:
            match = re.search(r'(\d+)', duration_str)
            return int(match.group(1)) if match else 300
        
        # Try to parse as number (assume minutes)
        try:
            return int(float(duration_str)) * 60
        except ValueError:
            return 1800  # Default 30 minutes
    
    def _calculate_tss(self, segments: List[WorkoutSegment], ftp: int = 250) -> float:
        """Calculate Training Stress Score"""
        total_tss = 0.0
        
        for segment in segments:
            duration_hours = segment.duration / 3600
            intensity_factor = segment.power_avg
            normalized_power = ftp * intensity_factor
            
            # TSS = (duration_hours * normalized_power^4) / (FTP^4 * 3600) * 100
            tss = (duration_hours * (normalized_power ** 4)) / ((ftp ** 4) * 3600) * 100
            total_tss += tss
        
        return round(total_tss, 1)
    
    def _finalize_workout(self, workout: WorkoutData) -> Dict[str, Any]:
        """Finalize workout with calculated values"""
        # Calculate total duration
        total_duration = 0
        all_segments = []
        
        # Add warmup if not present
        if not workout.segments or workout.segments[0].segment_type != "Warmup":
            warmup = WorkoutSegment(
                duration=600,
                power_start=0.5,
                power_end=0.6,
                segment_type="Warmup",
                name="Warmup"
            )
            all_segments.append(warmup)
        
        # Process complex intervals
        for interval in workout.complex_intervals:
            for rep in range(interval.repetitions):
                # Add interval segments
                for segment in interval.segments:
                    all_segments.append(segment)
                
                # Add recovery between repetitions (except after last)
                if rep < interval.repetitions - 1:
                    recovery = WorkoutSegment(
                        duration=interval.recovery_duration,
                        power_start=interval.recovery_power,
                        segment_type="SteadyState",
                        name=f"Recovery {rep + 1}"
                    )
                    all_segments.append(recovery)
        
        # Add regular segments
        all_segments.extend(workout.segments)
        
        # Add cooldown if not present
        if not all_segments or all_segments[-1].segment_type != "Cooldown":
            cooldown = WorkoutSegment(
                duration=600,
                power_start=0.6,
                power_end=0.4,
                segment_type="Cooldown",
                name="Cooldown"
            )
            all_segments.append(cooldown)
        
        # Calculate total duration and TSS
        total_duration = sum(s.duration for s in all_segments)
        tss = self._calculate_tss(all_segments, self.ftp)
        
        # Convert segments to dictionary format
        segments_dict = []
        for segment in all_segments:
            seg_dict = {
                "duration": segment.duration,
                "power_start": segment.power_start,
                "segment_type": segment.segment_type,
                "name": segment.name or "Segment"
            }
            if segment.power_end is not None:
                seg_dict["power_end"] = segment.power_end
            if segment.cadence is not None:
                seg_dict["cadence"] = segment.cadence
            
            segments_dict.append(seg_dict)
        
        return {
            "name": workout.name,
            "description": workout.description,
            "author": workout.author,
            "sportType": workout.sport_type,
            "totalDuration": total_duration,
            "segments": segments_dict,
            "tss": tss,
            "workoutType": workout.workout_type.value
        }
    
    def _dict_to_segment(self, seg_dict: Dict[str, Any]) -> WorkoutSegment:
        """Convert dictionary to WorkoutSegment"""
        return WorkoutSegment(
            duration=seg_dict["duration"],
            power_start=seg_dict["power_start"],
            power_end=seg_dict.get("power_end"),
            cadence=seg_dict.get("cadence"),
            segment_type=seg_dict.get("segment_type", "SteadyState"),
            name=seg_dict.get("name")
        )
    
    def run(self):
        """Run the MCP server"""
        logger.info(f"🏃‍♂️ Starting Workout Creator MCP Server")
        self.app.run()

def main():
    """Main entry point"""
    server = WorkoutMCPServer()
    server.run()

if __name__ == "__main__":
    main()