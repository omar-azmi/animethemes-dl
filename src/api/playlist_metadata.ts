/** this module captures the playlist's theme track's meta data, so that it can be later used for parsing the links.
 * 
 * @module
*/

import type { BulkTrackResourceMetaResponse, TrackResourceMeta } from "./typedefs.ts"


/** 
 * @param link the initial API link.
 * @param append_to the array to append the tracks' meta data to.
 * @returns returns the API link to the next page of results (if any).
*/
const appendTrackMetaFromApi = async (link: string, append_to: Array<TrackResourceMeta>): Promise<string | undefined> => {
	const
		bulk_response = await (await fetch(link)).json() as BulkTrackResourceMetaResponse,
		next_link = bulk_response.links.next ?? undefined
	append_to.push(...bulk_response.tracks)
	return next_link
}

/** fetches the track list metadata of the given publicly visible playlist id.
 * 
 * if your playlist's url is, say, `"https://animethemes.moe/playlist/mb7tqz"`, then `"mb7tqz"` is its id.
 * 
 * @param playlist_id the id of your playlist.
 *   examples: `"mb7tqz"`, `"WD4C5Y"`, `"QBsO3"`
*/
export const fetchPlaylistMetadata = async (playlist_id: string): Promise<Array<TrackResourceMeta>> => {
	const
		track_meta_list: Array<TrackResourceMeta> = [],
		initial_page = 1,
		page_size = 100,
		include = [
			"video.audio",
			"animethemeentry.animetheme.group",
			"animethemeentry.animetheme.anime.images",
			"animethemeentry.animetheme.song.artists",
		],
		query = `page[size]=${page_size}&page[number]=${initial_page}&include=${include.join(",")}`
	let link: string | undefined = `https://api.animethemes.moe/playlist/${playlist_id}/track?${query}`
	do {
		link = await appendTrackMetaFromApi(link!, track_meta_list)
	} while (link)
	return track_meta_list
}
