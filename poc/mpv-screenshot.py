import time
import threading
from pathlib import Path

import os
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import mpv

import win32clipboard
import win32con
import struct 


# Assume these functions exist from your codebase:
# create_dropfile_structure(absolute_path)
# copy_file_to_clipboard(file_path)


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

class MPVScreenshotWithTimestamp:
    def __init__(self, hotkey='f10', screenshot_name='screenshot-poc.jpg'):
        self.screenshot_path = Path.cwd() / screenshot_name
        self.player = mpv.MPV(input_default_bindings=True, input_vo_keyboard=True)
        self.hotkey = hotkey.lower()

        # Bind hotkey to screenshot method
        self.player.register_key_binding(self.hotkey, self.take_screenshot)
        print(f"Hotkey registered: {self.hotkey.upper()}")

    def take_screenshot(self, _):
        # Get current playback time, fallback if none
        time_pos = self.player.time_pos or 0.0
        print(f"📸 Taking screenshot at {time_pos:.2f}s")

        # Take screenshot: mpv command "screenshot-to-file" saves current frame
        # Here we save it with fixed name; you can create dynamic names with timestamp if you want
        self.player.command('screenshot-to-file', str(self.screenshot_path))

        # Wait a moment for file to be saved
        time.sleep(0.5)
        if self.screenshot_path.exists():
            print(f"✓ Screenshot saved: {self.screenshot_path}")
            # Copy the file to clipboard using your method
            copy_file_to_clipboard(self.screenshot_path)
        else:
            print("✗ Screenshot file was not created")

    def run(self):
        print("MPV Screenshot Tool Running...")
        print("Press", self.hotkey.upper(), "to take screenshot.")
        try:
            # Enter the mpv main loop (blocking)
            self.player.wait_for_playback()
        except KeyboardInterrupt:
            print("\nExiting...")
            self.player.terminate()

def main():
    tool = MPVScreenshotWithTimestamp(hotkey='f10', screenshot_name='screenshot-poc.jpg')
    tool.run()

if __name__ == '__main__':
    main()
