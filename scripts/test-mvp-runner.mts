import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const tmpData = await fs.mkdtemp(path.join(os.tmpdir(), 'myreader-mvp-'))
process.env.MYREADER_TEST_DATA = tmpData

const { runMvpSmokeTests } = await import('./test-mvp.mts')
await runMvpSmokeTests(tmpData)
