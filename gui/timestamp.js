const MPV = require("node-mpv");

// Create a player instance
const mpvPlayer = new MPV({
  audio_only: false,
  auto_restart: true,
});

// Path to your video/audio file
const filePath = "./sample-video.mp4"; // Replace with your actual file path

async function main() {
//   await mpvPlayer.start(); // Start MPV process
  await mpvPlayer.load(filePath);

  // Poll the current playback time every 500ms
  setInterval(async () => {
    try {
      const time = await mpvPlayer.getTimePosition();
      console.log(`Current timestamp: ${time.toFixed(2)}s`);
    } catch (err) {
      console.error("Error getting timestamp:", err);
    }
  }, 500);
}

main();
