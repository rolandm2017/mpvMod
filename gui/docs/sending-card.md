per source field, the user is greeted with a dropdown containing all possible fields from the note type. the user selects the right field. so it's:

source field #1, "mp3" -> sentence_audio. User rejects for instance, "word_audio," which is wrong

source field #2, "Example Sentence" -> "Example Sentence". In this case, it's an exact match

source field #3, "Native translation" -> "Definitions 1"

I need to store that mapping into my db. that's done, easy task. BUT then! I need to be able to insert it backwards, oh I see the solution. I take the same mapping I've saved in the db, and make the values become the properties, and the properties become the values.

This is what's there now:

fieldMappings: {
targetWord: 'Word',
exampleSentence: 'Example Sentence',
nativeTranslation: 'Definitions 1',
sentenceAudio: 'sentence_audio',
screenshot: 'image'
}

That's cool, it tells me what my source pipelines (the properties) will end up as, that is, they're the values on the right side.

So to send it to Anki, the first property of the payload is "Word" and the value is the content of "targetWord". The second payload entry is "Example Sentence" for the property, with the value of exampleSentence as the value.

nativeTranslation: 'Definitions 1', becomes: "Definitions 1": nativeTranslation
