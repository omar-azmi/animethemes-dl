import { emptyDir, ensureFile } from "jsr:@std/fs@1.0.8"
import { fetchPlaylistMetadata } from "./api/playlist_metadata.ts"
import type { TrackResourceMeta } from "./api/typedefs.ts"
import { joinPaths, parseFilepathInfo } from "./deps.ts"
import { batchPromisesMap_Factory } from "./funcdefs.ts"
import { encodeM3u8, type M3u8Entry } from "./m3u/codec.ts"
import type { AudioFileDownloadDescription } from "./typedefs.ts"


export interface DownloadPlaylistToFsConfig {
	/** the output directory for the downloaded audio files.
	 * 
	 * @defaultValue `"./out/tracks/"`
	*/
	dir: string

	/** the output file path of the ".m3u" playlist file.
	 * 
	 * @defaultValue `"./out/playlist.m3u"`
	*/
	playlist: string

	/** download audio files in batches to speed up the overall download process.
	 * 
	 * you don't want to set it to something too large (like over `50`), because the server may then refuse to serve you altogether.
	 * 
	 * @defaultValue `20`
	*/
	batchSize: number

	/** if dryrun is enabled, then nothing will be stored onto your filesystem, and the audio files will not be fetched either.
	 * 
	 * this is useful when you want read the logs to ensure that the files will be saved at the correct location.
	 * 
	 * @defaultValue `false`
	*/
	dryrun: boolean

	/** a function that names the audio file based on the track's metadata. */
	filenameFn: (track_meta: TrackResourceMeta, track_index: number, full_track_list: Array<TrackResourceMeta>) => string

	/** a function that provides the song title field for the ".m3u" playlist, based on the track's metadata. */
	titleFn: (track_meta: TrackResourceMeta, track_index: number, full_track_list: Array<TrackResourceMeta>) => string
}

export const defaultDownloadPlaylistToFsConfig: DownloadPlaylistToFsConfig = {
	dir: "./out/tracks/",
	playlist: "./out/playlist.m3u",
	batchSize: 20,
	dryrun: false,
	filenameFn: (track_meta: TrackResourceMeta, track_index: number) => {
		const anime_name_char_limit = 30
		let anime_name = track_meta.animethemeentry.animetheme.anime.slug.toLowerCase()
		// below, we reduce the file name if it is too long, by snipping off everything after the next over-limit underscore ("_") character.
		if (anime_name.length >= anime_name_char_limit) {
			const snipping_index = anime_name.indexOf("_", anime_name_char_limit)
			anime_name = anime_name.slice(0, snipping_index < 0 ? undefined : snipping_index)
		}
		const
			theme_slug = track_meta.animethemeentry.animetheme.slug.toLowerCase(),
			theme_group = track_meta.animethemeentry.animetheme.group?.slug.toLowerCase() ?? "jp",
			audio_extension = parseFilepathInfo(track_meta.video.audio.basename).extname.toLowerCase()
		// the line below was disabled because `theme_slug` typically includes the `theme_group`, thus we'll only make it redundant
		// return `${track_index}-${anime_name}-${theme_slug}-${theme_group}${audio_extension}`
		return `${track_index}-${anime_name}-${theme_slug}${audio_extension}`
	},
	titleFn: (track_meta: TrackResourceMeta, track_index: number) => {
		const
			anime_name = track_meta.animethemeentry.animetheme.anime.name,
			theme_slug = track_meta.animethemeentry.animetheme.slug.toUpperCase(),
			theme_group = track_meta.animethemeentry.animetheme.group?.slug.toUpperCase() ?? "JP"
		// the line below was disabled because `theme_slug` typically includes the `theme_group`, thus we'll only make it redundant
		// return `${track_index} - ${anime_name} - ${theme_slug} ${theme_group}`
		return `${track_index} - ${anime_name} - ${theme_slug}`
	},
}

/** a function that provides the audio file url from the given track metadata. */
const linkFn = (track_meta: TrackResourceMeta, track_index?: number, full_track_list?: Array<TrackResourceMeta>): URL => {
	return new URL(track_meta.video.audio.link)
}

export const downloadPlaylistToFs = async (playlist_id: string, config: Partial<DownloadPlaylistToFsConfig> = {}): Promise<void> => {
	const
		{ dir, playlist, batchSize, dryrun, filenameFn, titleFn } = { ...defaultDownloadPlaylistToFsConfig, ...config },
		track_meta_list = await fetchPlaylistMetadata(playlist_id)

	console.log(`[fs] emptying output directory for downloading the audio files: "${dir}"`)
	if (!dryrun) { await emptyDir(dir) }

	const download_list = track_meta_list.map((track_meta, index, list): AudioFileDownloadDescription => {
		const
			url = linkFn(track_meta, index, list),
			path = joinPaths(dir, filenameFn(track_meta, index, list)),
			title = titleFn(track_meta, index, list)
		return { url, path, title }
	})
	const playlist_content = encodeM3u8(download_list.map(({ path, title }, index): M3u8Entry => {
		return { path, name: title }
	}), playlist)

	await batchPromisesMap_Factory<AudioFileDownloadDescription, void>(
		batchSize,
		async ({ url, path, title }, index) => {
			if (!dryrun) {
				const bytes = await (await fetch(url)).bytes()
				await ensureFile(path)
				await Deno.writeFile(path, bytes)
			}
			console.log(`[fetch-fs ${index}] downloaded "${title}" to "${path}"`)
		}
	)(download_list)

	console.log(`[fs] creating local playlist file at location: "${playlist}"`)
	if (!dryrun) {
		await ensureFile(playlist)
		await Deno.writeTextFile(playlist, playlist_content)
	}
}
