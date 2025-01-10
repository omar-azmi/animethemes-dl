import { defaultStopwatch } from "jsr:@oazmi/kitchensink@0.9.1/timeman"
import { downloadPlaylistToFs } from "../src/downloader.ts"


defaultStopwatch.push()
await downloadPlaylistToFs("mb7tqz", { dryrun: false })
console.log(`completed operation in: ${defaultStopwatch.popDelta() / 1000} seconds`)
