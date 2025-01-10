/** contains common top level interfaces.
 * 
 * @module
*/

export interface AudioFileDownloadDescription {
	/** the url to fetch the audio from. */
	url: string | URL

	/** the download path. */
	path: string

	/** the title of the sound track. */
	title: string
}
