import type { ParsedSegmentObj } from '../src/routes/+page.server';

export interface MockData {
    subtitleTimestamps: number[];
    segments: ParsedSegmentObj[];
    timePositionsToTimecodes: Map<number, string>;
    subtitleCuePointsInSec: number[];
    timecodes: string[];
}

export const mockSubtitleData: MockData = {
    segments: [
        {
            index: 1,
            timecode: '00:00:04,874 --> 00:00:23,372',
            text: 'Un jour je serai le meilleur dresser Je peux battre sans répit Je ferai tout pour être vainqueur Et gagner les dépits Je parcourerai la terre entière Vraiment avec espoir',
            startTimeSeconds: 4.874,
        },
        {
            index: 2,
            timecode: '00:00:24,685 --> 00:00:30,712',
            text: 'Le Pokémon est leur mystère, le secret de leur pouvoir.',
            startTimeSeconds: 24.685,
        },
        {
            index: 3,
            timecode: '00:00:30,732 --> 00:00:39,002',
            text: "Pokémon, attrapez-les, c'est notre histoire, ensemble pour la victoire.",
            startTimeSeconds: 30.732,
        },
        {
            index: 4,
            timecode: '00:00:39,022 --> 00:00:43,848',
            text: "Pokémon, bien ne nous arrêtera, notre amie d'étrie on fera.",
            startTimeSeconds: 39.022,
        },
        {
            index: 5,
            timecode: '00:00:43,868 --> 00:00:52,819',
            text: "Pokémon, attrapez-les, même en notre âge, un voyage d'apprentissage, ça demande de tuer.",
            startTimeSeconds: 43.868,
        },
        {
            index: 6,
            timecode: '00:00:54,554 --> 00:00:59,039',
            text: 'Pokémon !',
            startTimeSeconds: 54.554,
        },
        {
            index: 7,
            timecode: '00:00:59,059 --> 00:00:59,884',
            text: 'Attrapez-les tous !',
            startTimeSeconds: 59.059,
        },
        {
            index: 8,
            timecode: '00:00:59,904 --> 00:01:00,769',
            text: 'Attrapez-les tous !',
            startTimeSeconds: 59.904,
        },
        {
            index: 9,
            timecode: '00:01:00,789 --> 00:01:00,970',
            text: 'Pokémon !',
            startTimeSeconds: 60.789,
        },
        {
            index: 10,
            timecode: '00:01:23,090 --> 00:01:32,339',
            text: 'Et Nidorino commence le combat par un coup de corde, mais Hectoplasma dévite et riposte avec son souvoir et dignotique.',
            startTimeSeconds: 83.09,
        },
        {
            index: 11,
            timecode: '00:01:32,359 --> 00:01:35,602',
            text: 'Je reste la fin du combat pour Nidorino.',
            startTimeSeconds: 92.359,
        },
        {
            index: 12,
            timecode: '00:01:36,142 --> 00:01:37,223',
            text: 'Oh, attendez !',
            startTimeSeconds: 96.142,
        },
        {
            index: 13,
            timecode: '00:01:37,243 --> 00:01:39,906',
            text: 'Le traisseur de Nidorino vient de le rappeler.',
            startTimeSeconds: 97.243,
        },
        {
            index: 14,
            timecode: '00:01:40,046 --> 00:01:45,571',
            text: 'Quelle Pokémon va-t-il utiliser maintenant ?',
            startTimeSeconds: 100.046,
        },
        {
            index: 15,
            timecode: '00:01:45,591 --> 00:01:49,455',
            text: "Oh, c'est Phonix !",
            startTimeSeconds: 105.591,
        },
        {
            index: 16,
            timecode: '00:01:49,475 --> 00:01:51,797',
            text: "Ce Pokémon géant va passer à l'attaque.",
            startTimeSeconds: 109.475,
        },
        {
            index: 17,
            timecode: '00:01:52,503 --> 00:01:53,566',
            text: 'Bon !',
            startTimeSeconds: 112.503,
        },
        {
            index: 18,
            timecode: '00:01:53,586 --> 00:01:58,461',
            text: "Magnifique combat à Tectoplasma, qui ferait en forme aujourd'hui et qui sort un bâtiment !",
            startTimeSeconds: 113.586,
        },
    ],
    timePositionsToTimecodes: new Map<number, string>([
        [4.874, '00:00:04,874 --> 00:00:23,372'],
        [24.685, '00:00:24,685 --> 00:00:30,712'],
        [30.732, '00:00:30,732 --> 00:00:39,002'],
        [39.022, '00:00:39,022 --> 00:00:43,848'],
        [43.868, '00:00:43,868 --> 00:00:52,819'],
        [54.554, '00:00:54,554 --> 00:00:59,039'],
        [59.059, '00:00:59,059 --> 00:00:59,884'],
        [59.904, '00:00:59,904 --> 00:01:00,769'],
        [60.789, '00:01:00,789 --> 00:01:00,970'],
        [83.09, '00:01:23,090 --> 00:01:32,339'],
        [92.359, '00:01:32,359 --> 00:01:35,602'],
        [96.142, '00:01:36,142 --> 00:01:37,223'],
        [97.243, '00:01:37,243 --> 00:01:39,906'],
        [100.046, '00:01:40,046 --> 00:01:45,571'],
        [105.591, '00:01:45,591 --> 00:01:49,455'],
        [109.475, '00:01:49,475 --> 00:01:51,797'],
        [112.503, '00:01:52,503 --> 00:01:53,566'],
        [113.586, '00:01:53,586 --> 00:01:58,461'],
    ]),
    subtitleCuePointsInSec: [
        4.874, 24.685, 30.732, 39.022, 43.868, 54.554, 59.059, 59.904, 60.789,
        83.09, 92.359, 96.142, 97.243, 100.046, 105.591, 109.475, 112.503,
        113.586,
    ],
    timecodes: [
        '00:00:04,874 --> 00:00:23,372',
        '00:00:24,685 --> 00:00:30,712',
        '00:00:30,732 --> 00:00:39,002',
        '00:00:39,022 --> 00:00:43,848',
        '00:00:43,868 --> 00:00:52,819',
        '00:00:54,554 --> 00:00:59,039',
        '00:00:59,059 --> 00:00:59,884',
        '00:00:59,904 --> 00:01:00,769',
        '00:01:00,789 --> 00:01:00,970',
        '00:01:23,090 --> 00:01:32,339',
        '00:01:32,359 --> 00:01:35,602',
        '00:01:36,142 --> 00:01:37,223',
        '00:01:37,243 --> 00:01:39,906',
        '00:01:40,046 --> 00:01:45,571',
        '00:01:45,591 --> 00:01:49,455',
        '00:01:49,475 --> 00:01:51,797',
        '00:01:52,503 --> 00:01:53,566',
        '00:01:53,586 --> 00:01:58,461',
    ],
    subtitleTimestamps: [
        4.874, 24.685, 30.732, 39.022, 43.868, 54.554, 59.059, 59.904, 60.789,
        83.09, 92.359, 96.142, 97.243, 100.046, 105.591, 109.475, 112.503,
        113.586,
    ],
};
