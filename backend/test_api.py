#!/usr/bin/env python3
"""
SafeGate Backend - Development Testing Script

This script helps verify the backend is working correctly by running
basic API calls and displaying results.

Usage:
    python test_api.py
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any

BACKEND_URL = os.getenv("BACKEND_URL", "https://safegate-pg3g.onrender.com").rstrip("/")
BASE_URL = f"{BACKEND_URL}/api"
HEALTH_URL = BACKEND_URL

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(message: str):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message: str):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_info(message: str):
    print(f"{Colors.BLUE}ℹ {message}{Colors.END}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

def test_health_check() -> bool:
    """Test if the backend is healthy"""
    print_info("Testing health check...")
    try:
        response = requests.get(f"{HEALTH_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success(f"Backend is healthy: {data.get('status')}")
            return True
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to backend at {HEALTH_URL}")
        return False
    except Exception as e:
        print_error(f"Health check error: {e}")
        return False

def test_create_student() -> Dict[str, Any]:
    """Test creating a student"""
    print_info("Testing student creation...")
    payload = {
        "student_id": f"TEST_{datetime.now().timestamp()}",
        "first_name": "Test",
        "last_name": "Student",
        "email": f"test_{datetime.now().timestamp()}@example.com",
        "class_level": "10A"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/students", json=payload, timeout=5)
        if response.status_code == 201:
            data = response.json()
            print_success(f"Student created: {data.get('first_name')} {data.get('last_name')} (ID: {data.get('id')})")
            return data
        else:
            print_error(f"Failed to create student: {response.status_code}")
            print(response.text)
            return {}
    except Exception as e:
        print_error(f"Student creation error: {e}")
        return {}

def test_get_students() -> list:
    """Test getting all students"""
    print_info("Testing get students...")
    try:
        response = requests.get(f"{BASE_URL}/students?limit=5", timeout=5)
        if response.status_code == 200:
            data = response.json()
            count = len(data)
            print_success(f"Retrieved {count} students")
            return data
        else:
            print_error(f"Failed to get students: {response.status_code}")
            return []
    except Exception as e:
        print_error(f"Get students error: {e}")
        return []

def test_attendance(student_id: int) -> Dict[str, Any]:
    """Test recording attendance"""
    print_info("Testing attendance recording...")
    payload = {
        "student_id": student_id,
        "date": datetime.now().isoformat(),
        "status": "present",
        "time_in": datetime.now().isoformat()
    }
    
    try:
        response = requests.post(f"{BASE_URL}/attendance", json=payload, timeout=5)
        if response.status_code == 201:
            data = response.json()
            print_success(f"Attendance recorded for student {student_id}")
            return data
        else:
            print_error(f"Failed to record attendance: {response.status_code}")
            print(response.text)
            return {}
    except Exception as e:
        print_error(f"Attendance recording error: {e}")
        return {}

def test_behavior_event(student_id: int) -> Dict[str, Any]:
    """Test logging a behavior event"""
    print_info("Testing behavior event logging...")
    payload = {
        "student_id": student_id,
        "event_type": "negative",
        "description": "Test behavior event",
        "severity": 5,
        "reported_by": "Test Script"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/behavior", json=payload, timeout=5)
        if response.status_code == 201:
            data = response.json()
            print_success(f"Behavior event logged for student {student_id}")
            return data
        else:
            print_error(f"Failed to log behavior event: {response.status_code}")
            print(response.text)
            return {}
    except Exception as e:
        print_error(f"Behavior event logging error: {e}")
        return {}

def test_risk_calculation(student_id: int) -> Dict[str, Any]:
    """Test risk score calculation"""
    print_info("Testing risk score calculation...")
    try:
        response = requests.get(f"{BASE_URL}/risk/calculate/{student_id}?days_lookback=30", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success(
                f"Risk score calculated - Level: {data.get('risk_level')}, "
                f"Score: {data.get('overall_score')}"
            )
            return data
        else:
            print_error(f"Failed to calculate risk: {response.status_code}")
            return {}
    except Exception as e:
        print_error(f"Risk calculation error: {e}")
        return {}

def test_dashboard(student_id: int) -> Dict[str, Any]:
    """Test getting student dashboard"""
    print_info("Testing student dashboard...")
    try:
        response = requests.get(f"{BASE_URL}/students/view/{student_id}/dashboard", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success("Dashboard retrieved successfully")
            return data
        else:
            print_error(f"Failed to get dashboard: {response.status_code}")
            return {}
    except Exception as e:
        print_error(f"Dashboard error: {e}")
        return {}

def test_api_docs() -> bool:
    """Test if API documentation is available"""
    print_info("Testing API documentation...")
    try:
        response = requests.get(f"{HEALTH_URL}/api/docs", timeout=5)
        if response.status_code == 200:
            print_success("API documentation available at /api/docs")
            return True
        else:
            print_warning("API documentation not available")
            return False
    except Exception as e:
        print_error(f"API docs check error: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("SafeGate Backend API Test Suite")
    print("="*60 + "\n")
    
    # Test health check
    if not test_health_check():
        print_error("Backend is not running. Please start it with: python main.py")
        return
    
    print()
    
    # Test API documentation
    test_api_docs()
    
    print()
    
    # Test student creation
    student = test_create_student()
    if not student:
        print_error("Cannot proceed without a student")
        return
    
    student_id = student.get('id')
    print()
    
    # Test other operations with created student
    test_get_students()
    print()
    
    test_attendance(student_id)
    print()
    
    test_behavior_event(student_id)
    print()
    
    test_dashboard(student_id)
    print()
    
    test_risk_calculation(student_id)
    
    print()
    print("="*60)
    print_success("All tests completed!")
    print("="*60 + "\n")
    print("Next steps:")
    print(f"1. Check API documentation: {BACKEND_URL}/api/docs")
    print("2. Start frontend: npm run dev")
    print("3. Test API cluster integration from frontend")

if __name__ == "__main__":
    main()
