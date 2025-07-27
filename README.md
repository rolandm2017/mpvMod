# MKV Mod - A tool for language learners

Note that if I say "MPV Player," just assume I mean "MPV Player and VLC." The tool, however, is built to work with MPV Player.

## What problem does this solve?

When making Anki cards  with MPV Player or VLC Media Player, making a card can take up to forty seconds. I wanted to get it down to under eight.

On top of taking too long, making a flashcard requires about 10x as many keypresses, mouse movements, mouse clicks as I'd like it to. Suppose it takes sixty total actions, a guesstimate that's probably pretty close. That's sixty opportunities for me to misclick, to fumble a keystroke, to accidentally close the UI, to become even further distracted by something else.

Creating an image for the flashcard requires maneuvering my mouse into approximately the top left of the MPV Player window, pressing and holding the mouse button, dragging down to the bottom right, and then pressing a hotkey. Worse, you have to turn subtitles off before you start, or they're in the image. That's bad. My opinion is that pressing the screenshot hotkey should start a workflow where the screenshot region is auto-fit to the viewport of the MPV Player window. I know this is possible because ShareX does it for OCR. 

Creating an audio clip, the ShareX tool has a delay of between 400 ms and 1,500 ms. It's far too long and thus requires precise and careful planning and timing to yield the desired MP3 file. I don't want to snip one mp3 file, find that it's too flawd, retry, retry a third time, and finally settle with a still-imperfect clip on the fourth try.

To grab the sentence(s) I want to use from the subtitles, I have to keep a separate Firefox window running with a "Copy clipboard contents to the document" plugin going. I have to keep "auto copy subtitle to clipboard" turned on in MPV, which means verifying that it's on over and over every time I open a new video. It should be that subtitles display in a panel, just as LanguageReactor shows for YouTube and Netflix. Further, the act of clicking, dragging, and releasing over highlighted text should activate an option to auto-copy the selection into a flashcard. Or into a screen where you can edit what you selected.

## What is the solution?

My opinion is that making a flashcard should require:

1. Pressing a hotkey to start recording audio. It's fast, instantly responsive. Pressing the hotkey again ends the recording. The audio "just appears" in the flashcard.

As a supplement, adjusting the start and end of the audio clip by 0.5 sec should be a button away.

I also think that there should be a way to edit audio clips in a minimalist GUI, but that's another project.

2. Screenshots are one hotkey, automatically taken from MPV, full screen without subtitles in the way. Goes into the card immediately, no action required.

3. Selecting a sentence or sentences for the example sentence might require only as little as click, drag, release. Might be too little though. So click, drag, release, hotkey.

4. Same story with the individual word or phrase.
