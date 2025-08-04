import time
import threading
from pathlib import Path
import signal
import sys
import traceback
import os

# Add MPV to PATH (adjust path as needed)
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import mpv

"""
MPV Hotkey Pusher Script

This script runs MPV and programmatically "pushes" hotkeys:
- F7: Take screenshot
- F8: Get current timestamp

The script will automatically trigger these actions at intervals or on command.
"""

class MPVHotkeyPusher:
    def __init__(self, screenshot_interval=10, timestamp_interval=5):
        self.screenshot_interval = screenshot_interval  # seconds between screenshots
        self.timestamp_interval = timestamp_interval    # seconds between timestamp logs
        self.running = True
        self.screenshot_dir = Path.cwd() / "screenshots"
        self.screenshot_dir.mkdir(exist_ok=True)
        
        print("🔧 Initializing MPV...")
        
        try:
            self.player = mpv.MPV(
                osc=True,  # Enable on-screen controller
                sub_auto='all',  # Auto-load subtitles
                input_default_bindings=True,  # Enable default key bindings
                input_vo_keyboard=True  # Enable keyboard input
            )
            print("✅ MPV initialized successfully")
            
            # Register manual hotkeys for testing
            self.player.register_key_binding('f7', self.push_screenshot_hotkey)
            self.player.register_key_binding('f8', self.push_timestamp_hotkey)
            self.player.register_key_binding('q', self.quit_player)
            
        except Exception as e:
            print(f"❌ Failed to initialize MPV: {e}")
            sys.exit(1)
        
        print("🔥 Hotkeys registered:")
        print("   F7: Take screenshot")
        print("   F8: Get timestamp")
        print("   Q: Quit")

    def push_screenshot_hotkey(self, *args):
        """Simulate pressing F7 - take screenshot"""
        try:
            timestamp = self.player.time_pos
            if timestamp is not None:
                print(f"📸 [F7 PUSHED] Taking screenshot at {timestamp:.2f}s")
                
                # Create timestamped filename
                file_name = f"screenshot-{timestamp:.2f}s.jpg"
                screenshot_path = self.screenshot_dir / file_name
                
                # Use MPV's screenshot command
                self.player.command('screenshot-to-file', str(screenshot_path))
                
                # Wait for file creation
                time.sleep(0.5)
                
                if screenshot_path.exists():
                    print(f"✓ Screenshot saved: {screenshot_path}")
                else:
                    print("✗ Screenshot file was not created")
            else:
                print("📸 [F7 PUSHED] Taking screenshot (no timestamp available)")
                self.player.command('screenshot')
                
        except Exception as e:
            traceback.print_exc()
            print(f"✗ Screenshot failed: {e}")

    def push_timestamp_hotkey(self, *args):
        """Simulate pressing F8 - get current timestamp"""
        try:
            timestamp = self.player.time_pos
            duration = self.player.duration
            
            if timestamp is not None and isinstance(timestamp, (int, float)):
                if duration is not None and isinstance(duration, (int, float)) and duration > 0:
                    progress = (timestamp / duration) * 100
                    print(f"🕐 [F8 PUSHED] Current time: {timestamp:.2f}s / {duration:.2f}s ({progress:.1f}%)")
                else:
                    print(f"🕐 [F8 PUSHED] Current time: {timestamp:.2f}s")
            else:
                print("🕐 [F8 PUSHED] Timestamp not available")
                
        except Exception as e:
            traceback.print_exc()
            print(f"✗ Timestamp retrieval failed: {e}")

    def auto_screenshot_loop(self):
        """Automatically push F7 at intervals"""
        while self.running:
            try:
                time.sleep(self.screenshot_interval)
                if self.running and hasattr(self, 'player'):
                    print(f"🤖 Auto-pushing F7 (screenshot) after {self.screenshot_interval}s")
                    self.push_screenshot_hotkey()
            except KeyboardInterrupt:
                print("\n⌨️  Screenshot thread interrupted")
                break

    def auto_timestamp_loop(self):
        """Automatically push F8 at intervals"""
        while self.running:
            try:
                time.sleep(self.timestamp_interval)
                if self.running and hasattr(self, 'player'):
                    print(f"🤖 Auto-pushing F8 (timestamp) after {self.timestamp_interval}s")
                    self.push_timestamp_hotkey()
            except KeyboardInterrupt:
                print("\n⌨️  Timestamp thread interrupted")
                break

    def quit_player(self, *args):
        """Quit the player"""
        print("\n👋 Quitting...")
        self.running = False
        if hasattr(self, 'player'):
            self.player.terminate()

    def signal_handler(self, signum, frame):
        """Handle Ctrl+C gracefully"""
        print(f"\n📡 Received signal {signum}, shutting down...")
        self.running = False
        if hasattr(self, 'player'):
            self.player.terminate()
        sys.exit(0)

    def run(self, video_file=None, auto_mode=False):
        """Main execution loop"""
        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        print("MPV Hotkey Pusher Tool")
        print("=" * 40)
        print("🔥 Manual controls:")
        print("   F7: Take screenshot")
        print("   F8: Get timestamp")
        print("   Q: Quit")
        
        if auto_mode:
            print("🤖 Auto mode enabled:")
            print(f"   Screenshots every {self.screenshot_interval}s")
            print(f"   Timestamps every {self.timestamp_interval}s")
        
        # Load video file
        if video_file and os.path.exists(video_file):
            print(f"🎬 Loading: {video_file}")
            self.player.play(video_file)
        else:
            print("⚠️  No video file specified!")
            print("💡 Usage:")
            print("   python mpv_hotkey_pusher.py 'path/to/video.mp4'")
            
            # Try default test video
            test_video = r"C:\Users\roly\Videos\How to Learn Japanese with Netflix + Anki [CfvDKgNUSi8].mp4"
            if os.path.exists(test_video):
                print(f"💡 Using test video: {test_video}")
                video_file = test_video
                self.player.play(video_file)
        
        # Start auto-push threads if enabled
        if auto_mode:
            screenshot_thread = threading.Thread(target=self.auto_screenshot_loop, daemon=True)
            timestamp_thread = threading.Thread(target=self.auto_timestamp_loop, daemon=True)
            
            screenshot_thread.start()
            timestamp_thread.start()
            
            print("🚀 Auto-push threads started!")
        
        try:
            # Wait for playback
            self.player.wait_for_playback()
            
        except KeyboardInterrupt:
            print("\n⌨️  Ctrl+C detected - shutting down gracefully...")
            self.running = False
        except Exception as e:
            print(f"❌ Error during playback: {e}")
        finally:
            print("🛑 Cleaning up...")
            self.running = False
            if hasattr(self, 'player') and self.player:
                try:
                    self.player.terminate()
                    print("✅ MPV terminated")
                except:
                    print("⚠️  MPV cleanup failed")
                    pass


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='MPV Hotkey Pusher')
    parser.add_argument('video', nargs='?', help='Video file to play')
    parser.add_argument('--auto', action='store_true', help='Enable auto-push mode')
    parser.add_argument('--screenshot-interval', type=int, default=10, 
                       help='Seconds between auto screenshots (default: 10)')
    parser.add_argument('--timestamp-interval', type=int, default=5,
                       help='Seconds between auto timestamps (default: 5)')
    
    args = parser.parse_args()
    
    # Create and run the hotkey pusher
    pusher = MPVHotkeyPusher(
        screenshot_interval=args.screenshot_interval,
        timestamp_interval=args.timestamp_interval
    )
    
    pusher.run(video_file=args.video, auto_mode=args.auto)


if __name__ == "__main__":
    main()