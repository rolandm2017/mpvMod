import time
import threading
from pathlib import Path
import signal
import sys

import traceback

import os
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import mpv
from clipboard import create_dropfile_structure, copy_file_to_clipboard


class MPVScreenshotCapture:
    def __init__(self, hotkey='k', screenshot_name='screenshot-poc.jpg'):
        # self.screenshot_path = Path.cwd() / screenshot_name
        self.screenshot_name = screenshot_name
        self.hotkey = hotkey.lower()
        self.running = True
        
        print("🔧 Initializing MPV...")
        
        # Simple MPV initialization like your working script
        try:
            self.player = mpv.MPV(
                osc=True,  # Enable on-screen controller (progress bar, controls)
                sub_auto='all',  # Auto-load subtitles
                input_default_bindings=True,  # Enable default key bindings
                input_vo_keyboard=True  # Enable keyboard input
            )
            print("✅ MPV initialized successfully")

            @self.player.on_key_press(self.hotkey)
            def on_screenshot_hotkey():
                self.take_screenshot()
        except Exception as e:
            print(f"❌ Failed to initialize MPV: {e}")
            sys.exit(1)

        # Bind hotkeys
        # self.player.register_key_binding(self.hotkey, self.take_screenshot, key_down_function=True)
       
        self.player.register_key_binding('q', self.quit_player)
        
        print(f"🔥 Hotkey registered: {self.hotkey.upper()}")
        print("📋 Press 'Q' to quit")

    def take_screenshot(self, *args):
        """Take screenshot of current frame"""
        try:
            # Get current playback time like your working script
            timestamp = self.player.time_pos
            if timestamp is not None:
                print(f"📸 Taking screenshot at {timestamp:.2f}s")
            else:
                print("📸 Taking screenshot...")

            # make a timestamped screenshot name. (the player's timestamp)
            file_name = self.screenshot_name + " - " + str(timestamp) + ".jpg"
            print("EXPECTING: ", file_name)
            screenshot_with_timestamp = Path.cwd() / "screenshots" / file_name
            
            # Take screenshot using MPV command
            self.player.command('screenshot-to-file', str(screenshot_with_timestamp))
            
            # Wait for file to be saved
            time.sleep(0.5)
            
            if screenshot_with_timestamp.exists():
                print(f"✓ Screenshot saved: {screenshot_with_timestamp}")
                copy_file_to_clipboard(screenshot_with_timestamp)
            else:
                print("✗ Screenshot file was not created")
                
        except Exception as e:
            traceback.print_exc()
            print(f"✗ Screenshot failed: {e}")

    def quit_player(self, *args):
        """Quit the player"""
        print("\n👋 Quitting...")
        self.running = False
        self.player.terminate()

    def signal_handler(self, signum, frame):
        """Handle Ctrl+C gracefully"""
        print(f"\n📡 Received signal {signum}, shutting down...")
        self.running = False
        if hasattr(self, 'player'):
            self.player.terminate()
        sys.exit(0)

    def run(self, video_file=None):
        """Main execution loop"""
        # Setup signal handlers for Ctrl+C
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        print("MPV Screenshot Capture Tool")
        print("=" * 40)
        print(f"📷 Press {self.hotkey.upper()} to take screenshot")
        print("🚪 Press 'Q' to quit or Ctrl+C to exit")
        
        # Load video file - this is key to making the window appear
        if video_file and os.path.exists(video_file):
            print(f"🎬 Loading: {video_file}")
            self.player.play(video_file)
        else:
            # Provide a helpful message if no video is specified
            print("⚠️  No video file specified!")
            print("💡 Usage:")
            print("   python mpv_screenshot.py 'path/to/video.mp4'")
            print("   or drag and drop a video file onto this script")
            
            # Try to show an empty window anyway
            try:
                # This might work to show a window without video
                self.player.command('show-text', 'No video loaded - drag and drop a file', 5000)
            except:
                pass
        
        try:
            # Use the same approach as your working script
            self.player.wait_for_playback()
                
        except KeyboardInterrupt:
            print("\n⌨️  Keyboard interrupt received, exiting...")
        except Exception as e:
            print(f"❌ Error during playback: {e}")
        finally:
            self.running = False
            if hasattr(self, 'player') and self.player:
                try:
                    self.player.terminate()
                except:
                    pass


def main():
    # Configuration
    HOTKEY = 'k'  # Change this to your preferred hotkey

    SCREENSHOT_NAME = f'screenshot-poc'
    
    # Check if video file provided as argument
    video_file = None
    if len(sys.argv) > 1:
        video_file = sys.argv[1]
        if not os.path.exists(video_file):
            print(f"❌ Video file not found: {video_file}")
            return
    else:
        # Suggest using your test video
        test_video = r"C:\Users\roly\Videos\How to Learn Japanese with Netflix + Anki [CfvDKgNUSi8].mp4"
        if os.path.exists(test_video):
            print(f"💡 No video specified. Using test video: {test_video}")
            video_file = test_video
    
    # Create and run the capture tool
    capture_tool = MPVScreenshotCapture(
        hotkey=HOTKEY,
        screenshot_name=SCREENSHOT_NAME
    )
    
    capture_tool.run(video_file)


if __name__ == "__main__":
    main()