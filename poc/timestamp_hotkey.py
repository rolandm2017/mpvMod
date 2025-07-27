"""
File previously "perplexity.py" in the original repo
"""


import os
os.environ["PATH"] = r"C:\Users\roly\mpv-dev-x86_64" + os.pathsep + os.environ["PATH"]

import mpv

MPV_PATH = r"C:\mpv-x86_64\mpv.exe"  # <= replace with your actual mpv.exe path
# MPV_PATH = r"C:\Users\rlm\Downloads\mpv-x86_64-20250720-git-440f35a\mpv.exe"  # <= replace with your actual mpv.exe path
VIDEO_PATH = r"C:\Users\roly\Videos\How to Learn Japanese with Netflix + Anki [CfvDKgNUSi8].mp4"  # <= replace with your video

"""
Steps to use:

Run the script! Press the hotkey to harvest time
"""

player = mpv.MPV()

@player.on_key_press('k')
def on_j():
    timestamp = player.time_pos  # time_pos gives the current timestamp in seconds
    # Format timestamp as HH:MM:SS or as you wish
    # Send/use the timestamp as needed
    print(f'K pressed at {timestamp:.2f}s')

player.play(VIDEO_PATH)

player.wait_for_playback()