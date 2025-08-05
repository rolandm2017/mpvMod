import mpv
import os
from urllib.parse import urlparse

class MediaPathTracker(mpv.MPV):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.current_video_path = None
        self.subtitle_info = {}
        
    def on_file_loaded(self):
        """Called when all file and track information is available."""
        # Get video file path
        self.current_video_path = self._get_absolute_video_path()
        
        # Get comprehensive subtitle information
        self.subtitle_info = self._analyze_all_subtitles()
        
        self._print_media_summary()
    
    def _get_absolute_video_path(self):
        """Get absolute path of currently playing video."""
        path = self.path
        if not path or not isinstance(path, str):
            return None
            
        # Check if already absolute
        if os.path.isabs(path):
            return path
            
        # Combine with working directory
        working_dir = self.working_directory or os.getcwd()
        if isinstance(working_dir, str):
            joined_path = os.path.join(working_dir, path)
            return os.path.abspath(joined_path)
        else:
            raise ValueError("Did not get str from self.working_directory or os.getcwd")
    
    def _analyze_all_subtitles(self):
        """Comprehensive subtitle analysis covering all loading methods."""
        track_list_raw = self.track_list
    
        # Ensure we have a proper list of dictionaries
        if not isinstance(track_list_raw, list):
            track_list = []
        else:
            track_list = track_list_raw
        
        current_sub = self._get_property('current-tracks/sub')
        
        result = {
            'current_subtitle': None,
            'external_files': [],
            'embedded_tracks': [],
            'total_count': 0,
            'by_source': {
                'sub_file_flag': [],
                'auto_detected': [],
                'embedded': [],
                'runtime_added': []
            }
        }
        
        video_basename = ''
        if self.current_video_path:
            video_basename = os.path.splitext(os.path.basename(self.current_video_path))[0]
        
        for track in track_list:
            if track.get('type') != 'sub':
                continue
                
            track_info = {
                'id': track.get('id'),
                'lang': track.get('lang'),
                'title': track.get('title', ''),
                'codec': track.get('codec'),
                'external': track.get('external', False),
                'filename': track.get('external-filename'),
                'selected': track.get('selected', False)
            }
            
            # Determine if this is the current subtitle
            track_matches_currently_selected_subtitle = current_sub and isinstance(current_sub, dict) and current_sub.get('id') == track.get('id')
            if (track.get('selected') or track_matches_currently_selected_subtitle):
                result['current_subtitle'] = track_info
            
            if track.get('external'):
                # External subtitle file
                result['external_files'].append(track_info)
                
                # Analyze how it was likely loaded
                filename = track.get('external-filename', '')
                if filename:
                    sub_basename = os.path.splitext(os.path.basename(filename))[0]
                    
                    # Heuristic for detection method
                    if video_basename and sub_basename.startswith(video_basename):
                        result['by_source']['auto_detected'].append(track_info)
                    else:
                        result['by_source']['sub_file_flag'].append(track_info)
            else:
                # Embedded subtitle
                result['embedded_tracks'].append(track_info)
                result['by_source']['embedded'].append(track_info)
        
        result['total_count'] = len(result['external_files']) + len(result['embedded_tracks'])
        return result
    
    def _print_media_summary(self):
        """Print comprehensive media and subtitle information."""
        print(f"\n=== MEDIA ANALYSIS ===")
        print(f"Video: {self.current_video_path}")
        
        if self.subtitle_info['current_subtitle']:
            current = self.subtitle_info['current_subtitle']
            if current['external']:
                print(f"Active subtitle: {current['filename']} (external)")
            else:
                lang_info = f" - {current['lang']}" if current['lang'] else ""
                print(f"Active subtitle: Embedded track #{current['id']}{lang_info}")
        else:
            print("Active subtitle: None")
        
        print(f"\nSubtitle Summary:")
        print(f"  Total tracks: {self.subtitle_info['total_count']}")
        print(f"  External files: {len(self.subtitle_info['external_files'])}")
        print(f"  Embedded tracks: {len(self.subtitle_info['embedded_tracks'])}")
        
        # Detailed breakdown
        by_source = self.subtitle_info['by_source']
        if by_source['sub_file_flag']:
            print(f"  Loaded via --sub-file: {len(by_source['sub_file_flag'])}")
        if by_source['auto_detected']:
            print(f"  Auto-detected: {len(by_source['auto_detected'])}")
        if by_source['embedded']:
            print(f"  Embedded in container: {len(by_source['embedded'])}")
    
    def get_current_subtitle_path(self):
        """Get path of currently active subtitle (external only)."""
        current = self.subtitle_info.get('current_subtitle')
        if current and current['external']:
            return current['filename']
        return None
    
    def has_embedded_subtitles(self):
        """Check if current file has embedded subtitle tracks."""
        return len(self.subtitle_info['embedded_tracks']) > 0
    
    def has_external_subtitles(self):
        """Check if external subtitle files are loaded."""
        return len(self.subtitle_info['external_files']) > 0

# Usage example
if __name__ == "__main__":
    player = MediaPathTracker()
    
    # Example: Load file with automatic subtitle detection
    player.loadfile("movie.mkv")
    player.wait_for_playback()