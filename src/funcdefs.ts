/** contains utility functions.
 * 
 * @module
*/

import type { MaybePromise } from "./deps.ts"


const chunkGenerator = function* <T>(chunk_size: number, array: T[]): Generator<T[], void> {
	const len = array.length
	for (let i = 0; i < len; i += chunk_size) {
		yield array.slice(i, i + chunk_size)
	}
}

export const batchPromisesMap_Factory = <T, R>(
	batch_size: number,
	map_fn: ((value: T, index: number, chunk_array: T[]) => MaybePromise<R>),
): ((input_array: T[]) => Promise<Array<R>>) => {
	return (async (input_array: T[]) => {
		const results: R[] = []
		let base_index = 0
		for (const chunk of chunkGenerator(batch_size, input_array)) {
			results.push(...(await Promise.all(chunk.map(
				((value, chunk_index, chunk_array) => map_fn(value, base_index + chunk_index, chunk_array))
			))))
			base_index += batch_size
		}
		return results
	})
}
