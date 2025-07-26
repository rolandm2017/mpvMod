import win32clipboard
import win32con
import struct 

import os


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