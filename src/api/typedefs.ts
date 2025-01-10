/** the {@link BulkTrackResourceMetaResponse} interface provides the server's response to the following GET request template:
 * > https://api.animethemes.moe/playlist/${playlist_id}/track?${query}
 * 
 * where:
 * - `playlist_id`: is your playlist's id
 * - `query`
 *   > page[size]=${page_size}&page[number]=${initial_page}&include=${include_fields}
 *   - `page_size` = `1` to `100` (max)
 *   - `initial_page`: number
 *   - `include_fields` = `["video.audio", "animethemeentry.animetheme.group", "animethemeentry.animetheme.anime.images", "animethemeentry.animetheme.song.artists"].join(",")`
 * 
 * @module
*/

export interface BulkTrackResourceMetaResponse {
	tracks: TrackResourceMeta[]
	links: NavigationLinks
	meta: ResponsePageMeta
}

export interface TrackResourceMeta {
	id: string
	animethemeentry: AnimeThemeEntryMeta
	video: VideoResourceMeta
}

export interface AnimeThemeEntryMeta {
	id: number
	episodes?: string
	notes?: string
	nsfw: boolean
	spoiler: boolean
	version?: number
	animetheme: AnimeThemeMeta
}

export interface AnimeThemeMeta {
	id: number

	/** optional opening/ending number. */
	sequence?: number

	/** abbreviation slug for opening/ending and its optional number. */
	slug: `${"OP" | "ED"}${number | ""}`
	type: "OP" | "ED"
	anime: AnimeDescription
	group?: LanguageGroup
	song: SongMeta
}

export interface AnimeDescription {
	id: number
	name: string

	media_format: "TV" | "Movie"
	season: "Spring" | "Summer" | "Fall" | "Winter"

	/** anime {@link name} in lowercase ascii and underscores for spacing.
	 * example: "shingeki_no_kyojin_season_3"
	*/
	slug: string

	/** anime description */
	synopsis: string

	/** anime release year */
	year: number

	/** there are usually two images, one small, and one large.
	 * I've always seen the `facet: "Large Cover"` come first, but it's not a guarantee.
	*/
	images: Image[]
}

export interface Image {
	id: number
	facet: "Large Cover" | "Small Cover"
	path: string

	/** http link to the actual anime image cover. */
	link: string
}

export interface LanguageGroup {
	id: number

	/** "English Version", "EN", etc... */
	name: string

	/** "EN", "JP", etc... */
	slug: string
}

export interface SongMeta {
	id: number

	/** title of the song track. */
	title: string

	/** artists involved in the track's production. */
	artists: ArtistDescription[]
}

export interface ArtistDescription {
	id: number
	name: string
	slug: string
	artistsong: {
		alias?: string // artist's alias for this specific song.
		as?: string // as some character.
	}
}

export interface VideoResourceMeta {
	id: number
	basename: string

	/** the base file name is a combination of "anime-name" + "op/ed-number" + "tags".
	 * examples: "BlackClover-ED3-NCBD1080", or "RomeoNoAoiSora-OP1".
	 * sometimes the {@link tags} are NOT appended to the name.
	*/
	filename: string

	lyrics: boolean
	nc: boolean
	overlap: string
	path: string

	/** resolution of the video. examples: `1080`, `480`, etc... */
	resolution: number
	
	size: number
	
	/** video source. */
	source: "BD" | "DVD" | "WEB" | "RAW" | "VHS"

	subbed: boolean
	uncen: boolean

	/** usually specifies the quality. examples: "NCDVD480", "NCBD1080", "DVD480", "Lyrics", etc... */
	tags: string

	/** http link to the actual music video file. */
	link: string

	audio: AudioResourceMeta
}

export interface AudioResourceMeta {
	id: number
	basename: string

	/** same as {@link VideoResourceMeta.filename}. */
	filename: string
	path: string
	size: number

	/** http link to the actual music audio file. */
	link: string
}

export interface NavigationLinks {
	first: string
	last?: null

	/** goes `null` on the first page. */
	prev?: string

	/** goes `null` on the last page. */
	next?: string
}

export interface ResponsePageMeta {
	current_page: number
	from: number
	path: string
	per_page: number
	to: number
}
