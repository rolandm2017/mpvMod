import os
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import asyncio
import websockets
import json
import time
import sys
import signal
import threading
from pathlib import Path
from typing import Optional
import mpv

# FIXME: the MPV, and harvesting time, should be a layer behind the WS Server

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
        self.loop: Optional[asyncio.AbstractEventLoop] = None  # Will store the event loop reference
        
        # Create MPV instance
        self.player = mpv.MPV(
            idle=True,
            osc=True,
            sub_auto='all',
            input_default_bindings=True,
            input_vo_keyboard=True
        )
        
        self.setup_event_handlers()
        signal.signal(signal.SIGINT, self.signal_handler)
        
    def setup_event_handlers(self):
        """Set up MPV event handlers and property observers"""
        
        @self.player.event_callback('start-file')
        def on_start_file(event):
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
    
    def broadcast_message(self, msg_type, content, extra_data=None):
        """Broadcast message to all connected WebSocket clients"""
        if not self.clients:
            # If no WebSocket clients, print to console like original
            print(content)
            return
            
        message = {
            "type": msg_type,
            "content": content,
            "timestamp": time.time()
        }
        
        if extra_data:
            message.update(extra_data)
        
        # Print to console as well
        print(content)
        
        # Schedule the async broadcast from the thread
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
        
        for client in self.clients.copy():  # Use copy to avoid modification during iteration
            try:
                await client.send(json_message)
            except Exception as e:
                disconnected_clients.add(client)
        
        # Remove disconnected clients
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
                        
                        # Send structured data for WebSocket clients
                        extra_data = {
                            "time_pos": time_pos,
                            "duration": duration,
                            "progress": progress,
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
        
        # Send welcome message with current status
        welcome = {
            "type": "welcome",
            "content": "Connected to MPV WebSocket Server",
            "timestamp": time.time(),
            "player_active": self.player_active,
            "filename": self.get_filename() if self.player_active else None
        }
        await websocket.send(json.dumps(welcome))
    
    async def unregister_client(self, websocket):
        """Remove a WebSocket client"""
        self.clients.discard(websocket)
        print(f"WebSocket client disconnected. Total clients: {len(self.clients)}")
    
    async def handle_client(self, websocket):
        """Handle WebSocket client connections - one-way streaming only"""
        await self.register_client(websocket)
        try:
            # Keep connection alive, but don't process any incoming messages
            await websocket.wait_closed()
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister_client(websocket)
    
    async def start_websocket_server(self, host="localhost", port=8765):
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
        print("Example: python server.py video.mp4 localhost 8765")
        sys.exit(1)
    
    filepath = sys.argv[1]
    host = sys.argv[2] if len(sys.argv) > 2 else "localhost"
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 8765
    
    # Create the MPV WebSocket server
    server = MPVWebSocketServer(poll_interval=0.208)
    
    # Start monitoring
    server.start_monitoring()
    
    # Load the video file
    if not server.load_file(filepath):
        print("❌ Failed to load video file")
        sys.exit(1)
    
    print("✅ Video loaded successfully")
    print(f"\n🎮 WebSocket Server Info:")
    print(f"   URL: ws://{host}:{port}")
    print(f"   Video: {Path(filepath).name}")
    print(f"\n💡 Usage:")
    print(f"   - Connect to ws://{host}:{port} to receive live MPV data stream")
    print(f"   - One-way communication: Server → Client only")
    print(f"   - Postman: Use WebSocket request to ws://{host}:{port}")
    print(f"   - Control MPV directly via the player window")
    print(f"   - Ctrl+C: Quit")
    
    try:
        # Store the event loop for thread-safe broadcasting
        server.loop = asyncio.get_running_loop()
        
        # Start WebSocket server
        ws_server = await server.start_websocket_server(host, port)
        
        # Keep running until player closes or Ctrl+C
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
    # Install required packages: pip install websockets python-mpv
    asyncio.run(main())