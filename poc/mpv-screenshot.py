import time
import threading
from pathlib import Path
import signal
import sys

import os
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import mpv
class MPVScreenshotWithTimestamp:
    def __init__(self, hotkey='f10', screenshot_name='screenshot-poc.jpg'):
        self.screenshot_path = Path.cwd() / screenshot_name
        self.player = mpv.MPV(input_default_bindings=True, input_vo_keyboard=True)
        self.hotkey = hotkey.lower()
        self.running = True

        # Bind hotkey to screenshot method
        self.player.register_key_binding(self.hotkey, self.take_screenshot)
        # Bind 'q' key to quit
        self.player.register_key_binding('q', self.quit_player)
        print(f"Hotkey registered: {self.hotkey.upper()}")
        print("Press 'Q' to quit")

    def take_screenshot(self, _):
        # Get current playback time, fallback if none
        time_pos = self.player.time_pos or 0.0
        print(f"📸 Taking screenshot at {time_pos:.2f}s")

        # Take screenshot: mpv command "screenshot-to-file" saves current frame
        self.player.command('screenshot-to-file', str(self.screenshot_path))

        # Wait a moment for file to be saved
        time.sleep(0.5)
        if self.screenshot_path.exists():
            print(f"✓ Screenshot saved: {self.screenshot_path}")
            # Copy the file to clipboard using your method
            copy_file_to_clipboard(self.screenshot_path)
        else:
            print("✗ Screenshot file was not created")

    def quit_player(self, _):
        print("\nQuitting...")
        self.running = False
        self.player.terminate()

    def signal_handler(self, signum, frame):
        print(f"\nReceived signal {signum}, shutting down...")
        self.running = False
        if hasattr(self, 'player'):
            self.player.terminate()
        sys.exit(0)

    def run(self):
        # Setup signal handlers for Ctrl+C
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        print("MPV Screenshot Tool Running...")
        print(f"Press {self.hotkey.upper()} to take screenshot.")
        print("Press 'Q' to quit or Ctrl+C to exit.")
        
        try:
            # Method 2: Run MPV in a separate thread to allow interruption
            def mpv_thread():
                try:
                    self.player.wait_for_playback()
                except:
                    pass
            
            thread = threading.Thread(target=mpv_thread, daemon=True)
            thread.start()
            
            # Main loop that can be interrupted
            while self.running and thread.is_alive():
                time.sleep(0.1)
                
        except KeyboardInterrupt:
            print("\nKeyboard interrupt received, exiting...")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            self.running = False
            if hasattr(self, 'player'):
                try:
                    self.player.terminate()
                except:
                    pass

def main():
    tool = MPVScreenshotWithTimestamp(hotkey='f10', screenshot_name='screenshot-poc.jpg')
    tool.run()

if __name__ == '__main__':
    main()