import time
import threading
from pathlib import Path
import signal
import sys

import traceback

import os
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import mpv

from clipboard import copy_file_to_clipboard
from ffmpeg_util import make_audio_mp3, seconds_to_time_str


test_video = r"C:\Users\roly\Videos\How to Learn Japanese with Netflix + Anki [CfvDKgNUSi8].mp4"

"""
Steps to use:

- Run the script
- press C, then N a little later, to clip an audio clip
- find it in /audio
"""

class MPVAudioCapture:
    def __init__(self, start_hotkey, end_hotkey, mp3_name='mp3-poc.jpg'):
        self.mp3_name = mp3_name
        self.start_hotkey = start_hotkey.lower()
        self.end_hotkey = end_hotkey.lower()
        self.running = True

        self.start_of_recording = None
        
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

            @self.player.on_key_press(self.start_hotkey)
            def on_start_recording_hotkey():
                self.start_recording()

            @self.player.on_key_press(self.end_hotkey)
            def on_end_recording_hotkey():
                self.end_recording()
        except Exception as e:
            print(f"❌ Failed to initialize MPV: {e}")
            sys.exit(1)

        self.player.register_key_binding('q', self.quit_player)
        
        print(f"🔥 Hotkey registered: {self.start_hotkey.upper()}, {self.end_hotkey.upper()}")
        print("📋 Press 'Q' to quit")

    def start_recording(self, *args):
        """Timestamp the start of recording mp3 so it can be fwded to ffmpeg args"""
        try:
            # Get current playback time like your working script
            timestamp = self.player.time_pos
            if timestamp is not None:
                print(f"🔴 Started mp3 recording at {timestamp:.2f}s")
            else:
                print("🔴 Timestamp MIA!")

            self.start_of_recording =  timestamp
                
        except Exception as e:
            traceback.print_exc()
            print(f"✗ mp3 recording failed: {e}")

    def end_recording(self, *args):
        try:
            # Get current playback time like your working script
            end_timestamp = self.player.time_pos
            if end_timestamp is not None:
                print(f"🔴 Ending mp3 recording at {end_timestamp:.2f}s")
            else:
                print("🔴 Timestamp MIA!")

            # end_timestamp = f"{end_timestamp:.2f}"

            # make a timestamped mp3 name. (the player's timestamp)
            file_name = self.mp3_name + " - " + str(self.start_of_recording) + " - " + str(end_timestamp) + ".mp3"
            print("EXPECTING: ", file_name)
            mp3_with_timestamp = Path.cwd() / "audio" / file_name
            
            # Take mp3 using MPV command
            # FIXME: Replace with ffmpeg callout
            make_audio_mp3(test_video, self.start_of_recording, end_timestamp, mp3_with_timestamp)
            
            # Wait for file to be saved
            time.sleep(0.5)  # FIXME: what if ffmpeg takes 1.2 sec?
            
            if mp3_with_timestamp.exists():
                print(f"✓ mp3 saved: {mp3_with_timestamp}")
                copy_file_to_clipboard(mp3_with_timestamp)
            else:
                print("✗ mp3 file was not created")
                
        except Exception as e:
            traceback.print_exc()
            print(f"✗ mp3 recording failed: {e}")

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
        
        print("MPV MP3 Capture Tool")
        print("=" * 40)
        print(f"📷 Press {self.start_hotkey.upper()} to take mp3")
        print(f"📷 Press {self.end_hotkey.upper()} to conclude mp3")
        print("🚪 Press 'Q' to quit or Ctrl+C to exit")
        
        # Load video file - this is key to making the window appear
        if video_file and os.path.exists(video_file):
            print(f"🎬 Loading: {video_file}")
            self.player.play(video_file)
        else:
            # Provide a helpful message if no video is specified
            print("⚠️  No video file specified!")
            print("💡 Usage:")
            print("   python mpv_mp3.py 'path/to/video.mp4'")
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
    START_RECORD_HOTKEY = "c"
    END_RECORD_HOTKEY = "n"


    MP3_FILE_NAME = f'mp3-poc'
    
    # Check if video file provided as argument
    video_file = None
    if len(sys.argv) > 1:
        video_file = sys.argv[1]
        if not os.path.exists(video_file):
            print(f"❌ Video file not found: {video_file}")
            return
    else:
        # Suggest using your test video
        if os.path.exists(test_video):
            print(f"💡 No video specified. Using test video: {test_video}")
            video_file = test_video
    
    # Create and run the capture tool
    capture_tool = MPVAudioCapture(
        start_hotkey=START_RECORD_HOTKEY,
        end_hotkey=END_RECORD_HOTKEY,
        mp3_name=MP3_FILE_NAME
    )
    
    capture_tool.run(video_file)


if __name__ == "__main__":
    main()