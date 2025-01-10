/** a submodule for parsing and unparsing ".m3u" playlist file's contents.
 * 
 * for specifications of this file format, check out [wikipedia](https://en.wikipedia.org/wiki/M3U).
 * 
 * TODO: for the time being, I am only parsing and unparsing the two most crucial fields: `name` and `path`.
 *   but for a more featured encoder/decoder, I'll have to parse a whole lot more fields than just those two.
 * 
 * @module
*/

import { isString, relativePath } from "../deps.ts"


export interface M3u8Entry {
	name: string
	path: string
}

export type M3u8Entries = Array<M3u8Entry>

const
	// os-agnostic newline character for regex
	nl = "\\r?\\n",
	// hash character for regex
	hash = "\\#",
	m3u8_entry_regex = new RegExp(String.raw`${hash}EXTINF\:\d*,(?<name>.*?)${nl}(?<path>[^${hash}].*?)${nl}`, "g")

/** parse the contents of a ".m3u" or ".m3u8" file into an array of {@link M3u8Entry}.
 * 
 * @param m3u8_text the string contents of a ".m3u" or ".m3u8" file.
 * @returns the parsed data
*/
export const decodeM3u8 = (m3u8_text: string): M3u8Entries => {
	m3u8_text = m3u8_text + "\n" // we put an extra new line at the end to ensure that the last entry is captured in case there was no trailing new line.
	const entries: M3u8Entry[] = []
	for (const match of m3u8_text.matchAll(m3u8_entry_regex)) {
		const { name, path } = match.groups!
		entries.push({ name, path })
	}
	return entries
}

/** converts an array of {@link M3u8Entry} back to a ".m3u" file's string content,
 * while ensuring to use relative paths to the music files if possible.
 * 
 * @param entries the entries to encode back into a ".m3u" playlist file.
 * @param playlist_path the path where the ".m3u" playlist file will be created,
 *   so that relative audio file referencing can be used instead of absolute paths.
 * @returns the parsed data
*/
export const encodeM3u8 = (entries: M3u8Entries, playlist_path: string | URL = ""): string => {
	playlist_path = isString(playlist_path) ? playlist_path : playlist_path.href
	const entries_str: string[] = ["#EXTM3U",]
	for (const { name, path } of entries) {
		let relative_entry_path = path
		try { relative_entry_path = relativePath(playlist_path, path) }
		catch { console.warn("no common path between the following playlist file and music file:", playlist_path, path) }
		entries_str.push(`#EXTINF:0,${name}`, relative_entry_path)
	}
	return entries_str.join("\n")
}
