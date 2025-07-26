
import subprocess

import subprocess
import cv2
import numpy as np

# TODO: < 20 ms response time on screenshots. < 50 ms hard cap

### Get the screenshot's alleged time from the file name


screenshot = "screenshot-poc - 1601.8666666666666.jpg"
time = 1601.8666666666666


### Make FFmpeg get the precise frame using that time

# result = subprocess.run([
#     'ffmpeg', '-i', 'input.mp4', '-ss', '00:01:30', 
#     '-vframes', '1', 'output.png'
# ], capture_output=True, text=True)

# ffmpeg -i input.mp4 -ss 75.5 -vframes 1 output.png

result = subprocess.run(["ffmpeg", "-i", "the_video.mp4", "-ss", time, "-vframes", "1", "correspondingframe.jpg"])

# Calculate similarity (MSE, SSIM, etc.)
diff = cv2.absdiff(screenshot, result)
score = np.sum(diff)

### Compare

def find_matching_frame(video_path, screenshot_path, start_time, search_range=10):
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

path_to_video = r"C:\Users\roly\Videos\How to Learn Japanese with Netflix + Anki [CfvDKgNUSi8].mp4"

best = find_matching_frame(path_to_video, screenshot, time - 10)
print(best)

### If not the same, get the difference in frame count, convert to ms

