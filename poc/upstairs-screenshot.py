"""
Proves that MPV can send a screenshot of current timestamp.
"""

#!/usr/bin/env python3
"""
MPV Screenshot Script with Global Hotkey
Captures screenshots from MPV when F10 is pressed (configurable)
"""

import os
import sys
import time
import threading
from pathlib import Path

import traceback
import struct

import win32clipboard
import win32con
import os

from python_mpv_jsonipc import MPV

from .clipboard import create_dropfile_structure, copy_file_to_clipboard


class MPVScreenshotCapture:
    def __init__(self, hotkey='f10', screenshot_name='screenshot-poc.jpg'):
        self.hotkey = hotkey
        self.screenshot_path = Path.cwd() / screenshot_name
        self.mpv = None
        self.connected = False
        self.hotkey_hook = None  # Add this line
        
    def connect_to_mpv(self, socket_path='/tmp/mpv-socket'):
        """Connect to MPV via IPC socket"""
        try:
            self.mpv = MPV(start_mpv=False, ipc_socket=socket_path)
            # Test connection
            self.mpv.command('get_property', 'pause')
            self.connected = True
            print(f"✓ Connected to MPV via socket: {socket_path}")
            return True
        except Exception as e:
            print(f"✗ Failed to connect to MPV: {e}")
            return False
    
    def take_screenshot(self):
        """Capture screenshot from current MPV frame"""
        if not self.connected or not self.mpv:
            print("✗ Not connected to MPV")
            return False
            
        try:
            # Get current playback position for reference
            try:
                current_time = self.mpv.command('get_property', 'time-pos')
                print(f"📸 Taking screenshot at {current_time:.2f}s")
            except:
                print("📸 Taking screenshot...")
            
            # Take screenshot
            result = self.mpv.command('screenshot-to-file', str(self.screenshot_path))
            
            if self.screenshot_path.exists():
                print(f"✓ Screenshot saved: {self.screenshot_path}")
                copy_file_to_clipboard(self.screenshot_path)
                return True
            else:
                print("✗ Screenshot file not created")
                return False
                
        except Exception as e:
            print(f"✗ Screenshot failed: {e}")
            return False
    
    def setup_hotkey(self):
        """Set up global hotkey listener"""
        print(f"🔥 Hotkey registered: {self.hotkey.upper()}")
        print("Press the hotkey while MPV is playing to capture screenshots")
        print("Press Ctrl+C to exit")
        
        # keyboard.add_hotkey(self.hotkey, self.take_screenshot)
    
    def run(self):
        """Main execution loop"""
        print("MPV Screenshot Capture Tool")
        print("=" * 40)
        
        # Try to connect to MPV
        if not self.connect_to_mpv():
            print("\n💡 To use this script:")
            print("1. Start MPV with IPC enabled:")
            print("   mpv --input-ipc-server=/tmp/mpv-socket your-video.mp4")
            print("2. Run this script in another terminal")
            return
        
        # Set up hotkey
        self.setup_hotkey()
        
        try:
            # Keep the script running
            while True:
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\n👋 Shutting down...")
            exit()
        finally:
            self.cleanup()
            # if self.mpv:
            #     try:
            #         self.mpv.close()
            #     except:
            #         pass
            exit()
        


def main():
    # Configuration
    HOTKEY = 'f10'  # Change this to your preferred hotkey
    SCREENSHOT_NAME = 'screenshot-poc.jpg'
    
    # Create and run the capture tool
    capture_tool = MPVScreenshotCapture(
        hotkey=HOTKEY,
        screenshot_name=SCREENSHOT_NAME
    )
    
    capture_tool.run()

if __name__ == "__main__":
    main()