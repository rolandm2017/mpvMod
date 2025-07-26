
import subprocess

import subprocess
import cv2
import numpy as np

# TODO: < 20 ms response time on screenshots. < 50 ms hard cap

### Get the screenshot's alleged time from the file name

"""According to this benchmarking script, the screenshot was precisely what was asked for."""
screenshot = "screenshot-poc - 1601.8666666666666.jpg"
time = 1601.8666666666666


### Make FFmpeg get the precise frame using that time

# result = subprocess.run([
#     'ffmpeg', '-i', 'input.mp4', '-ss', '00:01:30', 
#     '-vframes', '1', 'output.png'
# ], capture_output=True, text=True)

# ffmpeg -i input.mp4 -ss 75.5 -vframes 1 output.png

path_to_video = r"C:\Users\roly\Videos\How to Learn Japanese with Netflix + Anki [CfvDKgNUSi8].mp4"

print("line 28")
result = subprocess.run(["ffmpeg", "-y", "-i", path_to_video, "-ss", str(time), "-vframes", "1", "correspondingframe.jpg"], capture_output=True)

print("line 31")
# Calculate similarity (MSE, SSIM, etc.)
screenshot_img = cv2.imread(screenshot)
frame_img = cv2.imread("correspondingframe.jpg")

diff = cv2.absdiff(screenshot_img, frame_img)
score = np.sum(diff)

### Compare

def find_matching_frame(video_path, screenshot_path, start_time, search_range=10):
    print("in find_matching_frame")
    best_match = None
    best_score = float('inf')
    
    # Load reference screenshot
    reference = cv2.imread(screenshot_path)
    
    # Search around the timestamp
    for offset in range(-search_range, search_range + 1):
        timestamp = start_time + offset
        
        # Extract frame with ffmpeg
        subprocess.run([
            'ffmpeg', '-ss', str(timestamp), '-i', video_path,
            '-vframes', '1', '-y', 'temp_frame.png'
        ], capture_output=True)
        
        # Compare frames
        frame = cv2.imread('temp_frame.png')
        if frame is not None:
            # Calculate similarity (MSE, SSIM, etc.)
            diff = cv2.absdiff(reference, frame)
            score = np.sum(diff)
            
            if score < best_score:
                best_score = score
                best_match = timestamp
    
    return best_match

"""
Script output:

in find_matching_frame
BEST MATCH:  1601.8666666666666

HENCE the screenshot was exactly what was asked for.

(Unless this is a false positive)
"""

best = find_matching_frame(path_to_video, screenshot, time - 10, 10)
print("BEST MATCH: ",  best)

### If not the same, get the difference in frame count, convert to ms

