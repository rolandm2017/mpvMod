
# https://www.perplexity.ai/search/mpv-player-has-a-libmpv-that-i-WlU3QT5ATfyjkavj0Ej5WA
# 
# Use above link to see JSON IPC compared to libmpv C lib for performance. 
# libmpv will be 10x faster than JSON IPC for getting the timestamps.

"""
Steps to use:

1.  Run the script like:
        - python low_latency_basic.py <video_file_path>
"""
import os
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import sys
import time
from mpv import MPV

def main(video_path):
    # Create an MPV player instance (this uses libmpv under the hood)
    player = MPV()
    
    # Load the file into MPV
    player.command('loadfile', video_path)
    
    # Play the video
    player.pause = False
    
    try:
        while True:
            # Get current playback position in seconds (timestamp)
            timestamp = player.time_pos  # corresponds to "time-pos" property in mpv
            
            # timestamp may be None if no file loaded or not playing yet
            if timestamp is not None:
                print(f"Current timestamp: {timestamp:.3f} seconds")
            
            # Sleep a short time before polling again
            time.sleep(0.1)
    
    except KeyboardInterrupt:
        print("Exiting")
        player.terminate()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python mpv_libmpv_timestamp.py <video_file>")
        sys.exit(1)
    main(sys.argv[1])
