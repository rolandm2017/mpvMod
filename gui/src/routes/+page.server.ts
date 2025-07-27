import fs from 'fs'
import path from 'path'
import type { PageServerLoad } from './$types'

type SubtitleSegment = {
    index: number
    timecode: string
    text: string
}

export const load: PageServerLoad = async () => {
    const SRT_FILE_PATH = path.resolve('sample.srt')
    let segments: SubtitleSegment[] = []

    if (fs.existsSync(SRT_FILE_PATH)) {
        const content = fs.readFileSync(SRT_FILE_PATH, 'utf-8')
        const blocks = content.trim().split(/\n\s*\n/)

        segments = blocks
            .map((block) => {
                const lines = block.trim().split('\n')
                if (lines.length >= 3) {
                    return {
                        index: parseInt(lines[0]),
                        timecode: lines[1],
                        text: lines
                            .slice(2)
                            .join('\n')
                            .replace(/<[^>]*>/g, ''),
                    }
                }
            })
            .filter((seg): seg is SubtitleSegment => Boolean(seg))
    }

    return { segments }
}
