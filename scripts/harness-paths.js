import { realpath } from 'node:fs/promises'
import path from 'node:path'

export async function resolveInside(boundary, candidate) {
  const realBoundary = await realpath(boundary)
  const realCandidate = await realpath(path.resolve(realBoundary, candidate))
  const relative = path.relative(realBoundary, realCandidate)

  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`path is outside allowed boundary: ${candidate}`)
  }

  return realCandidate
}
