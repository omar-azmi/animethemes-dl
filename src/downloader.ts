import { emptyDir, ensureFile } from "jsr:@std/fs@1.0.8"
import { fetchPlaylistMetadata } from "./api/playlist_metadata.ts"
import type { TrackResourceMeta } from "./api/typedefs.ts"
import { joinPaths, parseFilepathInfo } from "./deps.ts"
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

export const default_DownloadPlaylistToFsConfig: DownloadPlaylistToFsConfig = {
	dir: "./out/tracks/",
	playlist: "./out/playlist.m3u",
	dryrun: false,
	filenameFn: (track_meta: TrackResourceMeta, track_index: number) => {
		const
			anime_name = track_meta.animethemeentry.animetheme.anime.slug.toLowerCase(),
			theme_slug = track_meta.animethemeentry.animetheme.slug.toLowerCase(),
			theme_group = track_meta.animethemeentry.animetheme.group?.slug.toLowerCase() ?? "jp",
			audio_extension = parseFilepathInfo(track_meta.video.audio.basename).extname.toLowerCase()
		return `${track_index}-${anime_name}-${theme_slug}-${theme_group}${audio_extension}`
	},
	titleFn: (track_meta: TrackResourceMeta, track_index: number) => {
		const
			anime_name = track_meta.animethemeentry.animetheme.anime.name,
			theme_slug = track_meta.animethemeentry.animetheme.slug.toUpperCase(),
			theme_group = track_meta.animethemeentry.animetheme.group?.slug.toUpperCase() ?? "JP"
		return `${track_index} - ${anime_name} - ${theme_slug} ${theme_group}`
	},
}

/** a function that provides the audio file url from the given track metadata. */
const linkFn = (track_meta: TrackResourceMeta, track_index?: number, full_track_list?: Array<TrackResourceMeta>): URL => {
	return new URL(track_meta.video.audio.link)
}

export const downloadPlaylistToFs = async (playlist_id: string, config: Partial<DownloadPlaylistToFsConfig> = {}): Promise<void> => {
	const
		{ dir, playlist, dryrun, filenameFn, titleFn } = { ...default_DownloadPlaylistToFsConfig, ...config },
		track_meta_list = await fetchPlaylistMetadata(playlist_id)
	await emptyDir(dir)
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

	// we download the audio files one by one instead of queuing all of them in one go,
	// because we don't want the server to blacklist us for making too many requests too quickly.
	// TODO: in the future, process the download links in batches
	for (const { url, path, title } of download_list) {
		if (!dryrun) {
			const bytes = await (await fetch(url)).bytes()
			await ensureFile(path)
			await Deno.writeFile(path, bytes)
		}
		console.log(`downloaded "${title}" to "${path}"`)
	}

	console.log(`creating local playlist file at location: "${playlist}"`)
	if (!dryrun) {
		await ensureFile(playlist)
		await Deno.writeTextFile(playlist, playlist_content)
	}
}
