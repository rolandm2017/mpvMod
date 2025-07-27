import subprocess
from pathlib import Path

#
# subprocess.run([
#     "ffmpeg", "-i", "input.mp4", "-ss", str(t1), "-to", str(t2), 
#     "-vn", "-acodec", "mp3", "output.mp3", "-y"
# ], capture_output=True)
#
####
#
# ffmpeg -i input.mp4 -ss 120.5 -to 180.0 -vn -acodec mp3 output.mp3 -y
#
#

#
# -ss BEFORE -i = Fast seeking (input seeking)
# -ss AFTER -i = Slow seeking (output seeking)
# It's not about -i vs -ss! 
# It's about WHERE you put -ss relative to -i.
#

def seconds_to_time_str(seconds):
   minutes = int(seconds // 60)
   secs = int(seconds % 60)
   return f"{minutes}m{secs:02d}s"

path_to_video = r"C:\Users\roly\Videos\How to Learn Japanese with Netflix + Anki [CfvDKgNUSi8].mp4"

t1 = 8
t2 = 16

subprocess.run([
   "ffmpeg", "-ss", str(t1), path_to_video,  "-to", str(t2), 
   "-vn", "-acodec", "mp3", "snippet.mp3", "-y"
], capture_output=True)


def make_audio_mp3(video_path: str, t1, t2, dest_file_path: Path):
   cmd = [
        "ffmpeg", "-ss", str(t1), "-i", video_path, "-to", str(t2), 
        "-vn", "-acodec", "mp3", str(dest_file_path), "-y"
   ]
   print("Running ffmpeg: ")
   print(" ".join(cmd))
   result = subprocess.run(cmd, capture_output=True, text=True)
    
   if result.returncode != 0:
      print(f"❌ FFmpeg failed with return code {result.returncode}")
      print(f"Error output: {result.stderr}")
   else:
      print("✅ FFmpeg completed successfully")