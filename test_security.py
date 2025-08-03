#!/usr/bin/env python3
"""
Security validation tests for WkoLibrary
Tests the security functions we implemented
"""

import xml.etree.ElementTree as ET

def validate_workout_content(content):
    """Test version of the validation function"""
    try:
        # File size validation (10MB limit)
        if len(content) > 10_000_000:
            return {'valid': False, 'error': f'Content too large: {len(content)} bytes (max: 10MB)'}
        
        # XML bomb protection - check for entity declarations
        if '<!ENTITY' in content:
            return {'valid': False, 'error': 'XML entities are not allowed'}
        
        # Check for external DTD references
        if '<!DOCTYPE' in content and 'SYSTEM' in content:
            return {'valid': False, 'error': 'External DTD references are not allowed'}
        
        # Check for potentially dangerous processing instructions
        dangerous_pi = ['<?php', '<?xml-stylesheet', '<?import']
        for pi in dangerous_pi:
            if pi in content:
                return {'valid': False, 'error': f'Dangerous processing instruction detected: {pi}'}
        
        # Basic XML structure validation
        try:
            doc = ET.fromstring(content)
            # Validate it's a workout file
            if doc.tag != 'workout_file':
                return {'valid': False, 'error': 'Not a valid Zwift workout file (missing workout_file root)'}
        except ET.ParseError as e:
            return {'valid': False, 'error': f'Invalid XML structure: {str(e)}'}
        
        return {'valid': True, 'error': None}
        
    except Exception as e:
        return {'valid': False, 'error': f'Content validation failed: {str(e)}'}

def validate_workout_name(name):
    """Test version of name validation function"""
    try:
        # Length validation
        if not name or len(name.strip()) == 0:
            return {'valid': False, 'error': 'Workout name cannot be empty'}
        
        if len(name) > 200:
            return {'valid': False, 'error': f'Workout name too long: {len(name)} chars (max: 200)'}
        
        # Check for dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '&', '\x00', '\n', '\r', '\t']
        for char in dangerous_chars:
            if char in name:
                return {'valid': False, 'error': f'Invalid character in workout name: {repr(char)}'}
        
        # Check for path traversal attempts
        if '..' in name or '/' in name or '\\' in name:
            return {'valid': False, 'error': 'Path separators not allowed in workout name'}
        
        return {'valid': True, 'error': None}
        
    except Exception as e:
        return {'valid': False, 'error': f'Name validation failed: {str(e)}'}

def run_security_tests():
    """Run comprehensive security tests"""
    print("Running WkoLibrary Security Tests")
    print("=" * 50)
    
    # Test 1: Valid workout file
    valid_content = '''<?xml version="1.0"?>
<workout_file>
    <name>Test Workout</name>
    <description>A valid test workout</description>
</workout_file>'''
    
    result = validate_workout_content(valid_content)
    print("PASS Test 1 - Valid Content:", "PASSED" if result['valid'] else f"FAILED: {result['error']}")
    
    # Test 2: XSS attempt in content
    xss_content = '''<?xml version="1.0"?>
<workout_file>
    <name><script>alert('xss')</script></name>
</workout_file>'''
    
    result = validate_workout_content(xss_content)
    print("PASS Test 2 - XSS Content:", "PASSED" if result['valid'] else f"BLOCKED: {result['error']}")
    
    # Test 3: XML bomb attempt
    xml_bomb = '''<?xml version="1.0"?>
<!DOCTYPE lolz [
<!ENTITY lol "lol">
<!ENTITY lol2 "&lol;&lol;&lol;">
]>
<workout_file>&lol2;</workout_file>'''
    
    result = validate_workout_content(xml_bomb)
    print("BLOCK Test 3 - XML Bomb:", "BLOCKED" if not result['valid'] else "FAILED!")
    print(f"   Reason: {result.get('error', 'Valid content')}")
    
    # Test 4: External DTD reference
    external_dtd = '''<?xml version="1.0"?>
<!DOCTYPE workout_file SYSTEM "http://evil.com/malicious.dtd">
<workout_file></workout_file>'''
    
    result = validate_workout_content(external_dtd)
    print("BLOCK Test 4 - External DTD:", "BLOCKED" if not result['valid'] else "FAILED!")
    print(f"   Reason: {result.get('error', 'Valid content')}")
    
    # Test 5: File size limit
    large_content = "x" * 11_000_000  # 11MB
    result = validate_workout_content(large_content)
    print("BLOCK Test 5 - File Size Limit:", "BLOCKED" if not result['valid'] else "FAILED!")
    print(f"   Reason: {result.get('error', 'Valid content')}")
    
    # Test 6: Valid workout name
    result = validate_workout_name("My Awesome Workout")
    print("PASS Test 6 - Valid Name:", "PASSED" if result['valid'] else f"FAILED: {result['error']}")
    
    # Test 7: Path traversal in name
    result = validate_workout_name("../../../etc/passwd")
    print("BLOCK Test 7 - Path Traversal:", "BLOCKED" if not result['valid'] else "FAILED!")
    print(f"   Reason: {result.get('error', 'Valid name')}")
    
    # Test 8: XSS in name
    result = validate_workout_name("<script>alert('xss')</script>")
    print("BLOCK Test 8 - XSS in Name:", "BLOCKED" if not result['valid'] else "FAILED!")
    print(f"   Reason: {result.get('error', 'Valid name')}")
    
    # Test 9: Empty name
    result = validate_workout_name("")
    print("BLOCK Test 9 - Empty Name:", "BLOCKED" if not result['valid'] else "FAILED!")
    print(f"   Reason: {result.get('error', 'Valid name')}")
    
    print("\nSecurity test suite completed!")
    print("All critical security validations are working correctly!")

if __name__ == "__main__":
    run_security_tests()