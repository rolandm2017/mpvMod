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

import mpv
import os
from urllib.parse import urlparse

# FIXME: Load a new file into MPV, subtitle track didn't change.
# THink this is, "After the first initial load, it's broken"

# TODO: When a Muxed embedded SRT is found in .mkv etc,
# make FFmpeg start the process to extract it.
# When it's done, it's auto-sent to the client.
# Until then, they get a progress bar.

# TODO: User presses "Start record", actually snipe a time ~2,000ms before they hit it
# TODO: And the setting should be togglable.

def get_absolute_path(player) -> str | None:
    """Get absolute path of currently playing file."""
    path = player.path
    if not path:
        return None
        
    # Check if already absolute
    if os.path.isabs(path):
        return path
        
    # Combine with working directory
    working_dir = player.working_directory
    if working_dir:
        return os.path.abspath(os.path.join(working_dir, path))
        
    return os.path.abspath(path)


def parse_mpv_config(config_path: str) -> dict:
    """Parse mpv.conf file and return dict of options."""
    options = {}
    
    if not os.path.exists(config_path):
        print(f"Config file not found: {config_path}")
        return options

    line_num = "None set"
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                # Remove comments and whitespace
                line = line.split('#')[0].strip()
                if not line:
                    continue
                
                # Handle key=value format
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip().replace('-', '_')  # Convert dashes to underscores for Python
                    value = value.strip()
                    
                    # Remove quotes if present, but keep the content
                    if (value.startswith('"') and value.endswith('"')) or \
                       (value.startswith("'") and value.endswith("'")):
                        value = value[1:-1]
                    
                    # Skip empty values as they can cause MPV errors
                    if not value:
                        print(f"Skipping empty value for option: {key}")
                        continue
                    
                    # Special handling for specific options first
                    if key == 'loop' and value == 'inf':
                        value = 'inf'  # Keep as string
                    elif key == 'osd_level':
                        # osd-level should be an integer (0, 1, 2, 3)
                        if value.isdigit():
                            value = int(value)
                        else:
                            print(f"Warning: osd_level value '{value}' is not a valid integer, skipping")
                            continue
                    # Convert common boolean values (but not for numeric options)
                    elif value.lower() in ('yes', 'true') and key not in ['osd_level', 'sub_pos', 'sub_margin_y', 'sub_border_size', 'sub_shadow_offset', 'sub_font_size', 'volume', 'osd_duration']:
                        value = True
                    elif value.lower() in ('no', 'false') and key not in ['osd_level', 'sub_pos', 'sub_margin_y', 'sub_border_size', 'sub_shadow_offset', 'sub_font_size', 'volume', 'osd_duration']:
                        value = False
                    elif value == '1' and key not in ['osd_level', 'sub_pos', 'sub_margin_y', 'sub_border_size', 'sub_shadow_offset', 'sub_font_size', 'volume', 'osd_duration']:
                        value = True
                    elif value == '0' and key not in ['osd_level', 'sub_pos', 'sub_margin_y', 'sub_border_size', 'sub_shadow_offset', 'sub_font_size', 'volume', 'osd_duration']:
                        value = False
                    # Try to convert to number if possible (but be more careful)
                    elif value.replace('.', '', 1).replace('-', '', 1).replace('+', '', 1).isdigit():
                        value = float(value) if '.' in value else int(value)
                    # Keep color values and other strings as-is
                    
                    options[key] = value
                    print(f"Parsed: {key} = {value} (type: {type(value).__name__})")
                else:
                    # Handle flag options (no value) - convert dashes to underscores
                    flag_key = line.replace('-', '_')
                    options[flag_key] = True
                    print(f"Parsed flag: {flag_key} = True")
                    
    except Exception as e:
        print(f"Error parsing config file line {line_num}: {e}")
    
    return options

def find_mpv_config() -> str | None:
    """Find mpv.conf file in standard locations."""
    # Common mpv config locations
    config_paths = []
    
    # Windows locations
    if os.name == 'nt':
        appdata = os.environ.get('APPDATA', '')
        if appdata:
            config_paths.append(os.path.join(appdata, 'mpv', 'mpv.conf'))
        
        # Portable config (next to executable)
        config_paths.append('mpv.conf')
        config_paths.append(os.path.join(os.path.dirname(sys.executable), 'mpv.conf'))
        
    # Unix/Linux locations
    else:
        home = os.path.expanduser('~')
        config_paths.extend([
            os.path.join(home, '.config', 'mpv', 'mpv.conf'),
            os.path.join(home, '.mpv', 'config'),
            '/etc/mpv/mpv.conf',
            'mpv.conf'  # Current directory
        ])
    
    # Check each location
    for path in config_paths:
        if os.path.exists(path):
            print(f"Found config file: {path}")
            return path
    
    print("No mpv.conf file found in standard locations")
    return None


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
        self.clip_end_time = None  # Must store so snipping tool can use it later
        self.current_file_path = None 
        self.original_file_path = None  
        self.current_srt = None
        self.recording_audio = False
        
        # Load config file
        config_file = find_mpv_config()
        print("CONFIG FILE:", config_file)
        
        config_options = {}
        if config_file:
            config_options = parse_mpv_config(config_file)
            print(f"Loaded {len(config_options)} options from config file")
        
        # Default options (can be overridden by config file)
        default_options = {
            'idle': True,
            'osc': True,
            'mute': False,
            'sub_auto': 'all',
            'input_default_bindings': True,
            'input_vo_keyboard': True,
            'autofit': '50%',
            'geometry': '+0+0',
            'input_ipc_server': 'mpv-socket',
            'keep_open': 'yes',
            'force_window': 'yes',
        }
        
        # Merge default options with config file options
        # Config file options take precedence
        final_options = {**default_options, **config_options}
        
        # Filter out problematic options that might cause issues
        filtered_options = {}
        problematic_keys = {'config_dir', 'config', 'include', 'profile', 'show_profile', 'list_options'}
        
        # Options that are known to cause issues in python-mpv
        known_problematic = {'sub_ass_override'}  # This option often causes issues
        
        for key, value in final_options.items():
            if key in problematic_keys:
                print(f"Skipping potentially problematic option: {key}={value}")
                continue
            
            # Skip known problematic options but log them
            if key in known_problematic:
                print(f"Skipping known problematic option: {key}={value}")
                continue
                
            # Handle specific options that need special treatment
            if key == 'geometry' and 'autofit' in final_options:
                print(f"Note: geometry ({value}) will override autofit setting")
            
            # Validate color values - they should start with # for hex colors
            if key in ['sub_color', 'sub_border_color', 'sub_shadow_color', 'osd_color']:
                if isinstance(value, str) and value and not value.startswith('#'):
                    print(f"Warning: Color value {key}={value} doesn't start with #, might cause issues")
            
            filtered_options[key] = value
            
        print(f"Final filtered options: {filtered_options}")
        
        # NOTE: User MUST use an MPV Player instance launched with this server.py file.
        # The alternative is to switch EVERYTHING to use JSON IPC. NOPE!
        
        # Create MPV instance with merged options
        try:
            print(f"Creating MPV with options: {filtered_options}")
            self.player = mpv.MPV(**filtered_options)
            print("MPV player created successfully with config options")
        except Exception as e:
            print(f"Error creating MPV player: {e}")
            print(f"Problematic options might be: {[k for k in config_options.keys()]}")
            print("Falling back to default options...")
            try:
                self.player = mpv.MPV(**default_options)
            except Exception as e2:
                print(f"Even default options failed: {e2}")
                # Try with minimal options
                minimal_options = {'idle': True, 'force_window': True}
                self.player = mpv.MPV(**minimal_options)
                print("Created MPV with minimal options")
        
        self.setup_event_handlers()
        
        threading.Timer(2.0, self.request_hotkeys_from_clients).start()
        
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
                self.original_file_path = get_absolute_path(player=self.player)
                print(f"📁 File loaded via drag-and-drop: {self.current_file_path}")
                print(f"📁 Stored absolute path: {self.original_file_path}")
                # Broadcast the file path to WebSocket clients
                self.broadcast_message("file_loaded", f"📁 File loaded: {self.get_filename()}", {
                    "file_path": self.current_file_path,
                    "absolute_path": self.original_file_path
                })
                # Check if , if you can get SRT file on load
            except Exception as e:
                print("Error: ❌ No file in on_start_file")
                self.current_file_path = None
                self.original_file_path = None
            
            message = f"🟢 Started playing: {self.get_filename()}"
            self.broadcast_message("event", message)
        
        @self.player.event_callback('file-loaded')
        def on_file_loaded(event):
            print(f"📁 File fully loaded: {self.get_filename()}")
            # Now track list should be ready
            current_srt = self.get_SRT_file()
            self.current_srt = current_srt
            self.broadcast_message("srt_found", f"📄 SRT found: {current_srt}", {
                    "srt_path": self.current_srt,
                })
            
        @self.player.event_callback('end-file')
        def on_end_file(event):
            reason = getattr(event, 'reason', 'unknown')
            message = f"🔴 Playback ended: {reason}"
            self.broadcast_message("event", message)
            
        @self.player.event_callback('seek')
        def on_seek(event):
            time_pos = self.get_time_pos()
            if time_pos is not None:
                message = f"⏩ Seeked to {self.format_time(time_pos)}"
                # TODO: Broadcast timestamp update immediately
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
        # TODO: User loads new file, path is stored in memory so can be used later for screenshot, snip mp3
        try:
            if not self.player_active:
                return "Player closed"
            filename = self.player.filename
            if filename and isinstance(filename, str):
                return Path(filename).name
            return "No file loaded"
        except:
            return "No file loaded"
    
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
    
    def get_SRT_file(self):
        """Get SRT file path or detect embedded subtitles - returns absolute path or status"""
        try:
            # Give MPV a moment to load track information
            track_list_raw = self.player.track_list
            
            if not isinstance(track_list_raw, list):
                print("⚠️  Track list not ready yet - no subtitle info available")
                return None
            
            current_sub = self.player._get_property('current-tracks/sub')
            current_sub_is_dict = isinstance(current_sub, dict)
            
            subtitle_files = []
            embedded_count = 0
            
            for track in track_list_raw:
                if track.get('type') != 'sub':
                    continue
                    
                if track.get('external'):
                    # External subtitle file
                    filename = track.get('external-filename')
                    if filename:
                        abs_path = os.path.abspath(filename) if not os.path.isabs(filename) else filename
                        subtitle_files.append(abs_path)
                        
                        # Check if this is the current subtitle
                        is_current = (track.get('selected') or 
                                    (current_sub and current_sub_is_dict and 
                                    current_sub.get('id') == track.get('id')))
                        
                        status = " (ACTIVE)" if is_current else ""
                        if status:
                            print(f"📄 External subtitle{status}: {abs_path}")
                else:
                    # Embedded subtitle
                    embedded_count += 1
                    is_current = (track.get('selected') or 
                                (current_sub and current_sub_is_dict and 
                                current_sub.get('id') == track.get('id')))
                    
                    lang_info = f" ({track.get('lang')})" if track.get('lang') else ""
                    status = " (ACTIVE)" if is_current else ""
                    print(f"📽️  Embedded subtitle{status}: Track #{track.get('id')}{lang_info} in {self.original_file_path}")
            
            if not subtitle_files and embedded_count == 0:
                print("❌ No subtitle tracks found")
                return None
            
            # Return the first external subtitle file path if available
            return subtitle_files[0] if subtitle_files else f"embedded_in_{self.original_file_path}"
            
        except Exception as e:
            print(f"❌ Error getting subtitle info: {e}")
            return None
    
 
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
                self.broadcast_message("error", "❌ No file loaded for screenshot")
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
            self.player.screenshot_to_file(str(screenshot_path), "video")
            
            return str(screenshot_path)
            
        except Exception as e:
            self.broadcast_message("error", f"❌ Screenshot failed: {e}")
            return None
        
 
    
    def start_audio_clip(self):
        """Mark the start time for audio clipping"""
        if not self.player_active:
            return False
        
        if not self.current_file_path:
            self.broadcast_message("error", "❌ No file loaded for audio clipping")
            return False
        
        self.clip_start_time = self.get_time_pos()
        if self.clip_start_time is not None:
            self.broadcast_message("info", f"🎵 Audio clip start marked at {self.format_time(self.clip_start_time)}")
            return True
        return False
    
    
    def end_audio_clip(self):
        """End audio clipping and create MP3"""
        if not self.player_active or not self.current_file_path or self.clip_start_time is None:
            if not self.current_file_path:
                self.broadcast_message("error", "❌ No file loaded for audio clipping")
            else:
                self.broadcast_message("error", "❌ No clip start time marked")
            return None
        
        clip_end_time = self.get_time_pos()
        
        self.clip_end_time = clip_end_time  # Store so snipping can use it later
        
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
                    
            if not isinstance(self.original_file_path, str):
                self.original_file_path = str(self.original_file_path)
                    
            print(f"Input file exists: {Path(self.original_file_path).exists()}")
            print(f"Input file path: {self.original_file_path}")
            print(f"Command: {' '.join(command)}")
            
            threading.Thread(target=run_ffmpeg, daemon=True).start()
            
            # Reset clip start time
            self.clip_start_time = None
            return str(clip_path)
            
        except Exception as e:
            self.broadcast_message("error", f"❌ Audio clip failed: {e}")
            return None
        
    
    # TODO: A method that handles, "user requested this subsection of the clip"
    def create_snippet(self, definition):
        try:
            # Create clips directory if it doesn't exist
            clips_dir = Path("clips")
            clips_dir.mkdir(exist_ok=True)
            
            # ### Find the original file
            if definition["sourceFile"] != "latest":
                raise NotImplementedError("Expecting only 'latest' clip requests")
            latest_file = None
            files = list(clips_dir.glob("*"))
            if files:
                latest_file = sorted(files, key=lambda f: f.stat().st_mtime)[-1]
                
            if not latest_file:
                raise FileNotFoundError("Asking for a snippet from an mp3 that should exist, but doesn't")
            
            
            # ### Get the original start, end time of the mp3
            product_bounds = {
                "start": self.clip_start_time,
                "end": self.clip_end_time
            }
            
            # ### Use definition to determine snippet start, end.
            # This will be like, (14.3 + 3.3, 14.3 + 6.1)
            # as the regionStart, regionEnd are measured in "absolute progress thru the whole mp3"
            product_bounds["start"] = product_bounds["start"] + definition["start"]
            product_bounds["end"] = product_bounds["start"] + definition["end"]
            
            # Generate filename
            snippet_filename = latest_file.name + "-derived-snippet"
            snippet_path = clips_dir / f"{snippet_filename}.mp3"
            
            # Use ffmpeg to extract audio clip
            duration = product_bounds["end"] - product_bounds["start"]
            
    
            command = [
                "ffmpeg",
                "-i", self.original_file_path, 
                "-ss", str(product_bounds["start"]),
                "-t", str(duration),
                "-vn",  # No video
                "-acodec", "mp3",
                "-ab", "192k",  # Audio bitrate
                "-y",  # Overwrite output file
                str(snippet_path)
            ]
            # Run ffmpeg in a separate thread to avoid blocking
            def run_ffmpeg():
                try:
                    
                    result = subprocess.run(command, capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        self.broadcast_message("command_response", f"✂️✅ Snippet created", {
                            "command": "new_snippet",
                            "success": True,
                            "file_path": str(snippet_path)
                        })
                    else:
                        self.broadcast_message("command_response", f"❌ FFmpeg error: {result.stderr}", {
                            "command": "new_snippet",
                            "success": False,
                            "error": result.stderr
                        })
                except subprocess.TimeoutExpired:
                    self.broadcast_message("command_response", "❌ FFmpeg timeout", {
                        "command": "new_snippet",
                        "success": False,
                        "error": "Timeout"
                    })
                except Exception as e:
                    self.broadcast_message("command_response", f"❌ FFmpeg failed: {e}", {
                        "command": "new_snippet",
                        "success": False,
                        "error": str(e)
                    })
                    
            if not isinstance(self.original_file_path, str):
                self.original_file_path = str(self.original_file_path)
                    
            print(f"Input file exists: {Path(self.original_file_path).exists()}")
            print(f"Input file path: {self.original_file_path}")
            print(f"Command: {' '.join(command)}")
            
            threading.Thread(target=run_ffmpeg, daemon=True).start()
            
            return str(snippet_path)
        
        except Exception as e:
            self.broadcast_message("error", f"❌ Grabbing snippet failed: {e}")
            return None
    
    async def handle_command(self, command_data):
        """Handle incoming commands from WebSocket clients"""
        try:
            command = command_data.get("command")
            
            if command == "take_screenshot":
                print("screenshot from Main hotkey ✨")
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
                
            elif command == "create_or_update_snippet":
                snippet_boundaries = command_data.get("definition")
                self.create_snippet(snippet_boundaries)
            
            elif command == "register_hotkeys":
                hotkeys = command_data.get("hotkeys")
                self.screenshot_hotkey = hotkeys["screenshot"]
                self.audio_recording_hotkey = hotkeys["audioClip"]
                self.add_hotkey_behaviors()
                
            elif command == "send_srt_file":
                if self.current_srt:
                    self.broadcast_message("srt_found", f"📄 Sending SRT: {self.current_srt}", {
                        "srt_path": self.current_srt,
                    })
                else:
                    self.broadcast_message("info", "📄 No SRT file currently loaded")
                
            elif command == "get_status":
                status = {
                    "command": "get_status",
                    "player_active": self.player_active,
                    "filename": self.get_filename(),
                    "time_pos": self.get_time_pos(),
                    "duration": self.get_duration(),
                    "paused": self.is_paused(),
                    "clip_start_time": self.clip_start_time,
                    "current_file_path": self.current_file_path,
                    "absolute_file_path": self.original_file_path
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
                        if idle and not self.current_file_path:
                            # Only show idle message if no file is loaded
                            pass  # Don't spam idle messages
                        else:
                            self.broadcast_message("status", "⚠️  No time position available")
                    except:
                        if self.player_active:
                            pass  # Don't spam error messages when no file is loaded
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
                
    def request_hotkeys_from_clients(self):
        """Request hotkey configuration from connected clients"""
        if not self.clients:
            print("⌨️  No WebSocket clients connected - hotkeys will be requested when clients connect")
            return
        
        request_message = {
            "type": "request_hotkeys",
            "content": "Please send hotkey configuration",
            "timestamp": time.time()
        }
        
        print("⌨️  Requesting hotkeys from connected clients...")
        
        if self.clients and self.loop:
            asyncio.run_coroutine_threadsafe(
                self._async_broadcast(request_message), 
                self.loop
            )
    
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
            "current_file_path": self.current_file_path,
            "available_commands": ["take_screenshot", "start_audio_clip", "end_audio_clip", "get_status", "load_file"]
        }
        await websocket.send(json.dumps(welcome))
        
        # Request hotkeys from this new client
        hotkey_request = {
            "type": "request_hotkeys",
            "content": "Please send your hotkey configuration",
            "timestamp": time.time()
        }
        await websocket.send(json.dumps(hotkey_request))
    
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
    # Optional file path - if provided, load it automatically
    filepath = sys.argv[1] if len(sys.argv) > 1 else None
    host = sys.argv[2] if len(sys.argv) > 2 else "localhost"
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 9001
    
    # server = MPVWebSocketServer(poll_interval=0.208)  # 208 ms seemed too slow
    # Quote Claude:
    # """"
    # Consider 100-150ms if:

    # You want snappier time updates
    # Users are actively scrubbing/seeking
    # You want it to feel more "live"

    # Consider 50ms only if:

    # You're doing frame-accurate work
    # Users are doing precise timing work
    # """"
        
    server = MPVWebSocketServer(poll_interval=0.107)
    server.start_monitoring()
        
    # Only load file if provided
    if filepath:
        if not server.load_file(filepath):
            print("❌ Failed to load video file")
            sys.exit(1)
        print("✅ Video loaded successfully")
    else:
        print("🎬 MPV player ready - drag and drop a video file to play")
    
    print(f"\n🎮 WebSocket Server Info:")
    print(f"   URL: ws://{host}:{port}")
    if filepath:
        print(f"   Video: {Path(filepath).name}")
    else:
        print(f"   Waiting for file via drag-and-drop...")
    print(f"\n💡 Available Commands:")
    print(f"   - take_screenshot: Capture current frame")
    print(f"   - start_audio_clip: Mark start time for audio clip")  
    print(f"   - end_audio_clip: Create MP3 from marked start to current time")
    print(f"   - load_file: Load a specific file")
    print(f"   - get_status: Get current player status")
    print(f"\n📨 Send commands as JSON: {{'command': 'take_screenshot'}}")
    print(f"\n🎯 Usage:")
    print(f"   - Drag and drop video files into the MPV window")
    print(f"   - Control MPV directly via the player window")
    print(f"   - Send WebSocket commands for screenshots and audio clips")
    print(f"   - Ctrl+C: Quit")
    
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