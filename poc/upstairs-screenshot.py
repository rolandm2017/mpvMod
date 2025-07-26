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


def create_dropfile_structure(absolute_path):
    # Create DROPFILES structure
       # DROPFILES structure: https://docs.microsoft.com/en-us/windows/win32/api/shlobj_core/ns-shlobj_core-dropfiles
       
       # File paths need to be null-terminated and the list double-null-terminated
       file_list = absolute_path + '\0\0'  # Single file + double null terminator
       file_list_bytes = file_list.encode('utf-16le')
       
       # DROPFILES header (20 bytes)
       # Offset to file list, point coordinates (not used), and flags
       dropfiles_header = struct.pack('LLLLL', 
           20,  # offset to file list (size of this header)
           0,   # x coordinate (not used)
           0,   # y coordinate (not used) 
           0,   # fNC (not used)
           1    # fWide (1 = Unicode filenames)
       )
       
       # Combine header and file list
       return dropfiles_header + file_list_bytes

def copy_file_to_clipboard(file_path):
   """
   Copy a file to Windows clipboard so it can be pasted in Explorer
   """
   if not os.path.exists(file_path):
       print(f"File not found: {file_path}")
       return False
   
   # Convert to absolute path and ensure it uses backslashes
   abs_path = os.path.abspath(file_path).replace('/', '\\')
   
   try:       
       # Combine header and file list
       clipboard_payload = create_dropfile_structure(abs_path)
       
       # Open clipboard
       win32clipboard.OpenClipboard()
       
       # Clear clipboard
       win32clipboard.EmptyClipboard()
       
       # Set the clipboard data
       win32clipboard.SetClipboardData(win32con.CF_HDROP, clipboard_payload)
       
       print(f"✓ File copied to clipboard: {abs_path}")
       return True
       
   except Exception as e:
       import traceback
       traceback.print_exc()
       print(f"✗ Error copying file to clipboard: {e}")
       return False
       
   finally:
       # Always close clipboard
       try:
           win32clipboard.CloseClipboard()
       except:
           pass


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