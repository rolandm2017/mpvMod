import os
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import asyncio
import websockets
import json
import time
import sys
import signal
import threading
import subprocess
from pathlib import Path
from typing import Optional
import mpv

class MPVWebSocketServer:
    def __init__(self, poll_interval=0.208):
        self.poll_interval = poll_interval
        self.running = False
        self.monitor_thread = None
        self.player_active = True
        self.last_pause_state = None
        self.last_time_pos = None
        self.clients = set()
        self.server = None
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        
        # hotkey registry
        self.screenshot_hotkey = None
        self.audio_recording_hotkey = None
        
        # For audio clipping
        self.clip_start_time = None
        self.current_file_path = None 
        self.original_file_path = None  
        self.recording_audio = False
        
        # Create MPV instance
        self.player = mpv.MPV(
            idle=True,
            osc=True,
            mute=True,
            sub_auto='all',
            input_default_bindings=True,
            input_vo_keyboard=True,
            autofit='50%',
            geometry='+0+0',
        )
        
        self.setup_event_handlers()
        signal.signal(signal.SIGINT, self.signal_handler)
        
    def add_hotkey_behaviors(self):
        print(f"Registering hotkeys: screenshot='{self.screenshot_hotkey}', audio='{self.audio_recording_hotkey}'")
    
        @self.player.on_key_press(self.screenshot_hotkey)
        def on_screenshot_hotkey(*args):
            print(f"Screenshot hotkey fired with event: ", args)
            self.take_screenshot_from_mpv()
            
        @self.player.on_key_press(self.audio_recording_hotkey)
        def on_mp3_recording_hotkey(*args):
            print(f"Audio hotkey fired with event: ", args)
            self.toggle_audio_recording_from_mpv()
        
    def setup_event_handlers(self):
        """Set up MPV event handlers and property observers"""
        
        @self.player.event_callback('start-file')
        def on_start_file(event):
            # Store current file path for clipping
            try:
                self.current_file_path = self.player.filename
                print(self.current_file_path, "Stored for clipping")
            except:
                self.current_file_path = None
            
            message = f"🟢 Started playing: {self.get_filename()}"
            self.broadcast_message("event", message)
            
        @self.player.event_callback('end-file')
        def on_end_file(event):
            reason = getattr(event, 'reason', 'unknown')
            message = f"🔴 Playback ended: {reason}"
            self.broadcast_message("event", message)
            
        @self.player.event_callback('seek')
        def on_seek(event):
            pos = self.get_time_pos()
            if pos is not None:
                message = f"⏩ Seeked to {self.format_time(pos)}"
                self.broadcast_message("event", message)
        
        @self.player.property_observer('pause')
        def on_pause_observer(_name, value):
            if self.last_pause_state != value:
                if value:
                    self.broadcast_message("event", "⏸️  Paused")
                else:
                    self.broadcast_message("event", "▶️  Resuming")
                self.last_pause_state = value
        
        @self.player.event_callback('shutdown')
        def on_shutdown(event):
            self.broadcast_message("event", "🚪 MPV player window closed")
            self.player_active = False
            self.stop_monitoring()
    
    def get_time_pos(self) -> Optional[float]:
        """Get current time position"""
        try:
            if not self.player_active:
                return None
            time_pos = self.player.time_pos
            # Ensure we return a float or None
            if isinstance(time_pos, (int, float)):
                return float(time_pos)
            return None
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
        # TODO: User loads new file, it's stored in memory so can be used later for screenshot, snip mp3
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

    
    def take_screenshot_from_mpv(self, *args):
        # FIXME: MPV Hotkey fires Take Screenshot 2x, 2 sccreenshots are observed in Main
        print(" 🌙 screenshot from MPV hotkey")
        print(args)
        screenshot_path = self.take_screenshot()

        response = {
            "command": "take_screenshot",
            "success": screenshot_path is not None,
            "file_path": screenshot_path
        }
        self.broadcast_message("command_response", 
            f"📸 Screenshot saved: {Path(screenshot_path).name}" if screenshot_path else "❌ Screenshot failed",
            response
        )
        
    def toggle_audio_recording_from_mpv(self, *args):
        print("Toggling audio record, allegedly")
        if self.recording_audio:
            self.end_audio_clip()
            self.recording_audio = False
        else:
            self.start_audio_clip()
            self.recording_audio = True
        
    
    def take_screenshot(self):
        """Take a screenshot of current frame"""
        try:
            if not self.player_active or not self.current_file_path:
                return None
            
            # Create screenshots directory if it doesn't exist
            screenshots_dir = Path("screenshots")
            screenshots_dir.mkdir(exist_ok=True)
            
            # Generate filename with timestamp
            timestamp = int(time.time())
            current_time = self.get_time_pos()
            time_str = self.format_time(current_time).replace(":", "-") if current_time else "unknown"
            
            screenshot_path = screenshots_dir / f"screenshot_{timestamp}_{time_str}.png"
            
            # Use MPV's screenshot command
            self.player.screenshot_to_file(str(screenshot_path))
            
            return str(screenshot_path)
            
        except Exception as e:
            self.broadcast_message("error", f"❌ Screenshot failed: {e}")
            return None
        
 
    
    def start_audio_clip(self):
        """Mark the start time for audio clipping"""
        if not self.player_active:
            return False
        
        self.clip_start_time = self.get_time_pos()
        if self.clip_start_time is not None:
            self.broadcast_message("info", f"🎵 Audio clip start marked at {self.format_time(self.clip_start_time)}")
            return True
        return False
    
    def end_audio_clip(self):
        """End audio clipping and create MP3"""
        if not self.player_active or not self.current_file_path or self.clip_start_time is None:
            return None
        
        clip_end_time = self.get_time_pos()
        
        # Type check and validate both times are numeric
        no_end_time = clip_end_time is None
        end_time_not_numeric = not isinstance(clip_end_time, (int, float))
        start_time_not_numeric = not isinstance(self.clip_start_time, (int, float))
        negative_time_range = clip_end_time <= self.clip_start_time if isinstance(clip_end_time, (int, float)) and isinstance(self.clip_start_time, (int, float)) else False
        
        if (no_end_time or 
            end_time_not_numeric or 
            start_time_not_numeric or
            negative_time_range):
            self.broadcast_message("error", "❌ Invalid clip end time")
            return None
        
        try:
            # Create clips directory if it doesn't exist
            clips_dir = Path("clips")
            clips_dir.mkdir(exist_ok=True)
            
            # Generate filename
            timestamp = int(time.time())
            start_str = self.format_time(self.clip_start_time).replace(":", "-")
            end_str = self.format_time(clip_end_time).replace(":", "-")
            
            clip_path = clips_dir / f"clip_{timestamp}_{start_str}_to_{end_str}.mp3"
            
            # Use ffmpeg to extract audio clip
            duration = clip_end_time - self.clip_start_time
            
    
            command = [
                "ffmpeg",
                "-i", self.original_file_path, 
                "-ss", str(self.clip_start_time),
                "-t", str(duration),
                "-vn",  # No video
                "-acodec", "mp3",
                "-ab", "192k",  # Audio bitrate
                "-y",  # Overwrite output file
                str(clip_path)
            ]
            
            self.broadcast_message("info", f"🎵 Creating audio clip: {clip_path.name}")
            
            # Run ffmpeg in a separate thread to avoid blocking
            def run_ffmpeg():
                try:
                    
                    result = subprocess.run(command, capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        self.broadcast_message("command_response", f"✅ Audio clip created", {
                            "command": "end_audio_clip",
                            "success": True,
                            "file_path": str(clip_path)
                        })
                    else:
                        self.broadcast_message("command_response", f"❌ FFmpeg error: {result.stderr}", {
                            "command": "end_audio_clip",
                            "success": False,
                            "error": result.stderr
                        })
                except subprocess.TimeoutExpired:
                    self.broadcast_message("command_response", "❌ FFmpeg timeout", {
                        "command": "end_audio_clip",
                        "success": False,
                        "error": "Timeout"
                    })
                except Exception as e:
                    self.broadcast_message("command_response", f"❌ FFmpeg failed: {e}", {
                        "command": "end_audio_clip",
                        "success": False,
                        "error": str(e)
                    })
                    
            print(f"Input file exists: {Path(self.current_file_path).exists()}")
            print(f"Input file path: {self.current_file_path}")
            print(f"Command: {' '.join(command)}")
            
            threading.Thread(target=run_ffmpeg, daemon=True).start()
            
            # Reset clip start time
            self.clip_start_time = None
            return str(clip_path)
            
        except Exception as e:
            self.broadcast_message("error", f"❌ Audio clip failed: {e}")
            return None
    
    async def handle_command(self, command_data):
        """Handle incoming commands from WebSocket clients"""
        try:
            command = command_data.get("command")
            
            if command == "take_screenshot":
                print("screnehot from Main hotkey ✨")
                screenshot_path = self.take_screenshot()
                response = {
                    "command": "take_screenshot",
                    "success": screenshot_path is not None,
                    "file_path": screenshot_path
                }
                self.broadcast_message("command_response", 
                    f"📸 Screenshot saved: {Path(screenshot_path).name}" if screenshot_path else "❌ Screenshot failed",
                    response
                )
                
            elif command == "start_audio_clip":
                success = self.start_audio_clip()
                response = {
                    "command": "start_audio_clip", 
                    "success": success
                }
                if not success:
                    self.broadcast_message("command_response", "❌ Failed to start audio clip", response)
                
            elif command == "end_audio_clip":
                # The end_audio_clip method handles its own response via the ffmpeg thread
                self.end_audio_clip()
            
            elif command == "register_hotkeys":
                # TODO: if no hotkey registered, ask once every few sec, for five min
                hotkeys = command_data.get("hotkeys")
                self.screenshot_hotkey = hotkeys["screenshot"]
                self.audio_recording_hotkey = hotkeys["audioClip"]
                self.add_hotkey_behaviors()
                
                
            elif command == "get_status":
                status = {
                    "command": "get_status",
                    "player_active": self.player_active,
                    "filename": self.get_filename(),
                    "time_pos": self.get_time_pos(),
                    "duration": self.get_duration(),
                    "paused": self.is_paused(),
                    "clip_start_time": self.clip_start_time
                }
                self.broadcast_message("command_response", "📊 Status update", status)
                
            else:
                self.broadcast_message("command_response", f"❌ Unknown command: {command}", {
                    "command": command,
                    "success": False,
                    "error": "Unknown command"
                })
                
        except Exception as e:
            self.broadcast_message("error", f"❌ Command error: {e}")
    
    def broadcast_message(self, msg_type, content, extra_data=None):
        """Broadcast message to all connected WebSocket clients"""
        if not self.clients:
            print(content)
            return
            
        message = {
            "type": msg_type,
            "content": content,
            "timestamp": time.time()
        }
        
        if extra_data:
            message.update(extra_data)
        
        print(content)
        
        if self.clients and self.loop:
            asyncio.run_coroutine_threadsafe(
                self._async_broadcast(message), 
                self.loop
            )
    
    async def _async_broadcast(self, message):
        """Async method to broadcast to WebSocket clients"""
        if not self.clients:
            return
            
        disconnected_clients = set()
        json_message = json.dumps(message)
        
        for client in self.clients.copy():
            try:
                await client.send(json_message)
            except Exception as e:
                disconnected_clients.add(client)
        
        for client in disconnected_clients:
            self.clients.discard(client)
            print(f"Removed disconnected WebSocket client. Remaining: {len(self.clients)}")
    
    def monitor_time(self):
        """Monitor time position and broadcast updates"""
        self.broadcast_message("info", f"🕐 Starting time monitoring (every {int(self.poll_interval * 1000)}ms)...")
        
        while self.running and self.player_active:
            try:
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
                        content = f"⏱️  {formatted_time} / {formatted_duration} ({progress:.1f}%)"
                        
                        extra_data = {
                            "time_pos": round(time_pos, 3),  
                            "progress": round(progress, 3),
                            "formatted_time": formatted_time,
                            "formatted_duration": formatted_duration
                        }
                        self.broadcast_message("time_update", content, extra_data)
                    else:
                        self.broadcast_message("time_update", f"⏱️  {formatted_time}", {
                            "time_pos": time_pos,
                            "formatted_time": formatted_time
                        })
                else:
                    try:
                        if not self.player_active:
                            break
                        idle = self.player.idle_active
                        if idle:
                            self.broadcast_message("status", "💤 Player idle (no media loaded)")
                        else:
                            self.broadcast_message("status", "⚠️  No time position available")
                    except:
                        if self.player_active:
                            self.broadcast_message("error", "⚠️  Player not ready")
                        else:
                            break
                
                time.sleep(self.poll_interval)
                
            except Exception as e:
                if self.player_active:
                    self.broadcast_message("error", f"⚠️  Monitor error: {e}")
                break
        
        self.broadcast_message("info", "🔄 Time monitoring stopped")
    
    def load_file(self, filepath):
        """Load and play a file"""
        try:
            if not self.player_active:
                self.broadcast_message("error", "❌ Player is not active")
                return False
            # Store the original absolute path
            self.original_file_path = str(Path(filepath).resolve())
            self.current_file_path = self.original_file_path
            self.broadcast_message("info", f"📁 Loading: {Path(filepath).name}")
            self.player.play(filepath)
            return True
        except Exception as e:
            self.broadcast_message("error", f"❌ Failed to load file: {e}")
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
            self.broadcast_message("info", "⏹️  Stopping monitoring...")
            self.running = False
            if self.monitor_thread and self.monitor_thread.is_alive():
                self.monitor_thread.join(timeout=2)
    
    async def register_client(self, websocket):
        """Register a new WebSocket client"""
        self.clients.add(websocket)
        print(f"WebSocket client connected. Total clients: {len(self.clients)}")
        
        welcome = {
            "type": "welcome",
            "content": "Connected to MPV WebSocket Server",
            "timestamp": time.time(),
            "player_active": self.player_active,
            "filename": self.get_filename() if self.player_active else None,
            "available_commands": ["take_screenshot", "start_audio_clip", "end_audio_clip", "get_status"]
        }
        await websocket.send(json.dumps(welcome))
    
    async def unregister_client(self, websocket):
        """Remove a WebSocket client"""
        self.clients.discard(websocket)
        print(f"WebSocket client disconnected. Total clients: {len(self.clients)}")
    
    async def handle_client(self, websocket):
        """Handle WebSocket client connections - now bidirectional!"""
        await self.register_client(websocket)
        try:
            async for message in websocket:
                try:
                    command_data = json.loads(message)
                    print(f"📨 Received command: {command_data}")
                    await self.handle_command(command_data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "content": "Invalid JSON format",
                        "timestamp": time.time()
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "error", 
                        "content": f"Command processing error: {e}",
                        "timestamp": time.time()
                    }))
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister_client(websocket)
    
    async def start_websocket_server(self, host="localhost", port=9001):
        """Start the WebSocket server"""
        self.server = await websockets.serve(self.handle_client, host, port)
        print(f"🌐 WebSocket server started on ws://{host}:{port}")
        return self.server
    
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
            if hasattr(self.player, 'quit'):
                self.player.quit()
            elif hasattr(self.player, 'terminate'):
                self.player.terminate()
        except:
            pass

async def main():
    if len(sys.argv) < 2:
        print("Usage: python server.py <video_file_path> [host] [port]")
        print("Example: python server.py video.mp4")
        print("Example: python server.py video.mp4 localhost 9001")
        sys.exit(1)
    
    filepath = sys.argv[1]
    host = sys.argv[2] if len(sys.argv) > 2 else "localhost"
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 9001
    
    server = MPVWebSocketServer(poll_interval=0.208)
    server.start_monitoring()
    
    if not server.load_file(filepath):
        print("❌ Failed to load video file")
        sys.exit(1)
    
    print("✅ Video loaded successfully")
    print(f"\n🎮 WebSocket Server Info:")
    print(f"   URL: ws://{host}:{port}")
    print(f"   Video: {Path(filepath).name}")
    print(f"\n💡 Available Commands:")
    print(f"   - take_screenshot: Capture current frame")
    print(f"   - start_audio_clip: Mark start time for audio clip")  
    print(f"   - end_audio_clip: Create MP3 from marked start to current time")
    print(f"   - get_status: Get current player status")
    print(f"\n📨 Send commands as JSON: {{'command': 'take_screenshot'}}")
    print(f"   Control MPV directly via the player window")
    print(f"   Ctrl+C: Quit")
    
    try:
        server.loop = asyncio.get_running_loop()
        ws_server = await server.start_websocket_server(host, port)
        
        while server.player_active:
            await asyncio.sleep(1)
        
        print("\n✅ MPV player closed - shutting down server")
        
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user")
    finally:
        server.cleanup()
        if server.server:
            server.server.close()
            await server.server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())