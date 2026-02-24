#!/usr/bin/env python3
"""
Verification Script for SafeGate Backend Integration

This script verifies that all components of the SafeGate backend are properly
set up and ready for development or deployment.
"""

import os
import sys
from pathlib import Path

class Checker:
    def __init__(self):
        self.backend_path = Path(__file__).parent
        self.passed = 0
        self.failed = 0

    def check_file(self, path: str, name: str) -> bool:
        """Check if a file exists"""
        file_path = self.backend_path / path
        if file_path.exists():
            print(f"✓ {name}")
            self.passed += 1
            return True
        else:
            print(f"✗ {name} - Missing: {path}")
            self.failed += 1
            return False

    def check_directory(self, path: str, name: str) -> bool:
        """Check if a directory exists"""
        dir_path = self.backend_path / path
        if dir_path.is_dir():
            print(f"✓ {name}")
            self.passed += 1
            return True
        else:
            print(f"✗ {name} - Missing: {path}")
            self.failed += 1
            return False

    def check_imports(self) -> bool:
        """Check if required packages are installed"""
        print("\nChecking Python packages...")
        required_packages = [
            "fastapi",
            "uvicorn",
            "sqlalchemy",
            "pydantic",
            "psycopg2",
        ]
        
        all_ok = True
        for package in required_packages:
            try:
                __import__(package)
                print(f"✓ {package}")
                self.passed += 1
            except ImportError:
                print(f"✗ {package} - Not installed")
                self.failed += 1
                all_ok = False
        
        return all_ok

    def run(self):
        """Run all checks"""
        print("="*60)
        print("SafeGate Backend Integrity Check")
        print("="*60 + "\n")

        # Check project structure
        print("Checking project structure...")
        self.check_file("main.py", "Main application")
        self.check_file("config.py", "Configuration")
        self.check_file("database.py", "Database setup")
        self.check_file("schemas.py", "Pydantic schemas")
        self.check_file("requirements.txt", "Dependencies")
        self.check_file(".env", "Environment configuration")
        self.check_file(".env.example", "Environment template")
        
        print()
        
        # Check directories
        print("Checking directories...")
        self.check_directory("models", "Models package")
        self.check_directory("routers", "Routers package")
        self.check_directory("services", "Services package")
        
        print()
        
        # Check key files
        print("Checking key component files...")
        self.check_file("models/__init__.py", "ORM models")
        self.check_file("routers/__init__.py", "Router exports")
        self.check_file("routers/health.py", "Health check router")
        self.check_file("routers/students.py", "Student router")
        self.check_file("routers/attendance.py", "Attendance router")
        self.check_file("routers/behavior.py", "Behavior router")
        self.check_file("routers/risk.py", "Risk assessment router")
        self.check_file("services/__init__.py", "Business logic services")
        
        print()
        
        # Check startup scripts
        print("Checking startup scripts...")
        self.check_file("run.bat", "Windows startup script")
        self.check_file("run.sh", "Unix startup script")
        
        print()
        
        # Check documentation
        print("Checking documentation...")
        self.check_file("README.md", "Backend README")
        
        print()
        
        # Check Python packages
        if self.check_imports():
            print("\nAll required packages are installed!")
        else:
            print("\nSome packages are missing. Run: pip install -r requirements.txt")

        print("\n" + "="*60)
        print(f"Results: {self.passed} passed, {self.failed} failed")
        print("="*60)

        if self.failed == 0:
            print("\n✓ All checks passed! Backend is ready.")
            return 0
        else:
            print(f"\n✗ {self.failed} check(s) failed. Please review above.")
            return 1


if __name__ == "__main__":
    checker = Checker()
    sys.exit(checker.run())
