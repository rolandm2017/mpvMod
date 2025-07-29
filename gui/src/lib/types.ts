export type PlayerPosition = number; // seconds from mpv
export type SubtitleTiming = number; // seconds from SRT parsing
export type TimecodeString = string; // "00:01:23,456" format

// export type PlayerPosition = number & { readonly __brand: 'PlayerPosition' }; // seconds from mpv
// export type SubtitleTiming = number & { readonly __brand: 'SubtitleTiming' }; // seconds from SRT parsing
// export type TimecodeString = string & { readonly __brand: 'TimecodeString' }; // "00:01:23,456" format

// // Constructor functions - MUST create using these constructors for  TS to catch
// export const playerPosition = (n: number): PlayerPosition => n as PlayerPosition;
// export const subtitleTiming = (n: number): SubtitleTiming => n as SubtitleTiming;
// export const timecodeString = (s: string): TimecodeString => s as TimecodeString;
