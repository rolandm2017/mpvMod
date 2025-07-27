import os
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import mpv
import time
import sys
import signal
import threading
from pathlib import Path

class MPVTimeMonitor:
    def __init__(self, poll_interval=0.208):
        self.poll_interval = poll_interval
        self.running = False
        self.monitor_thread = None
        self.player_active = True
        
        # Create MPV instance
        self.player = mpv.MPV(
            # Enable IPC for external connections if needed
            input_ipc_server=r'\\.\pipe\mpvsocket' if sys.platform == 'win32' else '/tmp/mpvsocket',
            # Keep player open when no media
            idle=True,
            # Optional: start in audio-only mode
            # no_video=True,
            osc=True,  # Enable on-screen controller (progress bar, controls)
            sub_auto='all',  # Auto-load subtitles
            input_default_bindings=True,  # Enable default key bindings
            input_vo_keyboard=True  # Enable keyboard input
        )
        
        # Set up event handlers
        self.setup_event_handlers()
        
        # Set up graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        
    def setup_event_handlers(self):
        """Set up MPV event handlers"""
        
        @self.player.event_callback('start-file')
        def on_start_file(event):
            print(f"🟢 Started playing: {self.get_filename()}")
            
        @self.player.event_callback('end-file')
        def on_end_file(event):
            # MpvEvent objects have attributes, not dictionary-style access
            reason = getattr(event, 'reason', 'unknown')
            print(f"🔴 Playback ended: {reason}")
            
        @self.player.event_callback('seek')
        def on_seek(event):
            pos = self.get_time_pos()
            if pos:
                print(f"⏩ Seeked to {self.format_time(pos)}")
        
        @self.player.property_observer('pause')
        def on_pause_observer(_name, value):
            if value:
                print("⏸️  Paused")
            else:
                print("▶️  Resuming")
        
        @self.player.event_callback('shutdown')
        def on_shutdown(event):
            print("🚪 MPV player window closed")
            self.player_active = False
            self.stop_monitoring()
    
    def get_time_pos(self):
        """Get current time position"""
        try:
            if not self.player_active:
                return None
            return self.player.time_pos
        except:
            return None
    
    def get_duration(self):
        """Get media duration"""
        try:
            if not self.player_active:
                return None
            return self.player.duration
        except:
            return None
    
    def get_filename(self):
        """Get current filename"""
        try:
            if not self.player_active:
                return "Player closed"
            filename = self.player.filename
            if filename and isinstance(filename, str):
                return Path(filename).name
            return "Unknown"
        except:
            return "Unknown"
    
    def is_paused(self):
        """Check if player is currently paused"""
        try:
            if not self.player_active:
                return True
            return self.player.pause
        except:
            return True
    

    
    def format_time(self, seconds):
        """Format seconds as MM:SS.S"""
        if seconds is None:
            return "00:00.0"
        
        minutes = int(seconds // 60)
        secs = seconds % 60
        return f"{minutes}:{secs:04.1f}"
    
    def monitor_time(self):
        """Monitor time position in a separate thread"""
        print(f"🕐 Starting time monitoring (every {int(self.poll_interval * 1000)}ms)...")
        
        while self.running and self.player_active:
            try:
                # Skip logging if paused
                if self.is_paused():
                    time.sleep(self.poll_interval)
                    continue
                
                time_pos = self.get_time_pos()
                
                if time_pos is not None:
                    duration = self.get_duration()
                    formatted_time = self.format_time(time_pos)
                    
                    if duration and isinstance(duration, (int, float)) and isinstance(time_pos, (int, float)):
                        progress = (time_pos / duration) * 100
                        formatted_duration = self.format_time(duration)
                        print(f"⏱️  {formatted_time} / {formatted_duration} ({progress:.1f}%)")
                    else:
                        print(f"⏱️  {formatted_time}")
                else:
                    # Check if player is idle or has media loaded
                    try:
                        if not self.player_active:
                            break
                        idle = self.player.idle_active
                        if idle:
                            print("💤 Player idle (no media loaded)")
                        else:
                            print("⚠️  No time position available")
                    except:
                        if self.player_active:
                            print("⚠️  Player not ready")
                        else:
                            break
                
                time.sleep(self.poll_interval)
                
            except Exception as e:
                if self.player_active:
                    print(f"⚠️  Monitor error: {e}")
                break
        
        print("🔄 Time monitoring stopped")
    
    def load_file(self, filepath):
        """Load and play a file"""
        try:
            if not self.player_active:
                print("❌ Player is not active")
                return False
            print(f"📁 Loading: {Path(filepath).name}")
            self.player.play(filepath)
            return True
        except Exception as e:
            print(f"❌ Failed to load file: {e}")
            return False
    
    def start_monitoring(self):
        """Start the time monitoring thread"""
        if not self.running:
            self.running = True
            self.monitor_thread = threading.Thread(target=self.monitor_time, daemon=True)
            self.monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop the time monitoring thread"""
        if self.running:
            print("⏹️  Stopping monitoring...")
            self.running = False
            if self.monitor_thread and self.monitor_thread.is_alive():
                self.monitor_thread.join(timeout=2)
    
    def signal_handler(self, sig, frame):
        """Handle Ctrl+C gracefully"""
        print("\n🛑 Shutting down...")
        self.cleanup()
        sys.exit(0)
    
    def cleanup(self):
        """Clean up resources"""
        self.player_active = False
        self.stop_monitoring()
        
        try:
            # Try to terminate the player gracefully
            if hasattr(self.player, 'quit'):
                self.player.quit()
            elif hasattr(self.player, 'terminate'):
                self.player.terminate()
        except Exception as e:
            # Player might already be closed, ignore errors
            pass
    
    def is_player_active(self):
        """Check if player is still active"""
        return self.player_active
    
    # Playback controls
    def play(self):
        """Resume playback"""
        if self.player_active:
            self.player.pause = False
    
    def pause(self):
        """Pause playback"""
        if self.player_active:
            self.player.pause = True
    
    def toggle_pause(self):
        """Toggle pause state"""
        if self.player_active:
            self.player.pause = not self.player.pause
    
    def seek(self, seconds):
        """Seek to position (absolute)"""
        try:
            if self.player_active:
                self.player.seek(seconds, reference='absolute')
        except Exception as e:
            print(f"❌ Seek failed: {e}")
    
    def set_volume(self, volume):
        """Set volume (0-100)"""
        try:
            if self.player_active:
                self.player.volume = max(0, min(100, volume))
                print(f"🔊 Volume: {self.player.volume}%")
        except Exception as e:
            print(f"❌ Volume change failed: {e}")


def main():
    # Example usage
    monitor = MPVTimeMonitor(poll_interval=0.208)  # 208ms intervals
    
    # Start monitoring
    monitor.start_monitoring()
    
    # Load a file if provided as command line argument
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
        if monitor.load_file(filepath):
            print("✅ File loaded successfully")
        else:
            print("❌ Failed to load file")
    else:
        print("💡 No file provided. You can:")
        print("   - Load a file: python mpv_monitor.py 'path/to/video.mp4'")
        print("   - Or load files manually in the MPV window")
        print("   - Or connect external applications to the IPC socket")
    
    print("\n🎮 Controls:")
    print("   Ctrl+C: Quit")
    print("   Close MPV window: Automatically stops monitoring")
    print("   Use MPV window for playback controls")
    print(f"   IPC socket available at: {r'\\.\pipe\mpvsocket' if sys.platform == 'win32' else '/tmp/mpvsocket'}")
    
    try:
        # Keep main thread alive, but check if player is still active
        while monitor.is_player_active():
            time.sleep(1)
        
        print("\n✅ MPV player closed - exiting gracefully")
        
    except KeyboardInterrupt:
        pass
    finally:
        monitor.cleanup()


if __name__ == "__main__":
    main()