import Papa from 'papaparse'
import type {
  CsvImportRow,
  CsvWorkerRequest,
  CsvWorkerResponse,
} from '@/lib/import/csv-import-types'

const CHUNK_SIZE = 100

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<CsvWorkerRequest>) => void) | null
  postMessage: (message: CsvWorkerResponse) => void
}

let activeParser: Papa.Parser | null = null
let pendingComplete = false
let sourceLine = 1

function post(message: CsvWorkerResponse) {
  workerScope.postMessage(message)
}

function parseRows(file: File) {
  const rows: CsvImportRow[] = []
  sourceLine = 1
  pendingComplete = false

  Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: 'greedy',
    chunkSize: 64 * 1024,
    step(result, parser) {
      sourceLine += 1

      if (result.errors.length > 0) {
        parser.pause()
        activeParser = parser
        post({
          type: 'row-error',
          line: sourceLine,
          message: 'Baris CSV tidak dapat diparse.',
        })
        return
      }

      rows.push({ line: sourceLine, fields: result.data })

      if (rows.length === CHUNK_SIZE) {
        parser.pause()
        activeParser = parser
        post({ type: 'rows', rows: rows.splice(0, rows.length) })
      }
    },
    complete() {
      activeParser = null

      if (rows.length > 0) {
        pendingComplete = true
        post({ type: 'rows', rows: rows.splice(0, rows.length) })
        return
      }

      post({ type: 'complete' })
    },
    error() {
      activeParser = null
      post({
        type: 'row-error',
        line: sourceLine,
        message: 'File CSV gagal dibaca.',
      })
      post({ type: 'complete' })
    },
  })
}

workerScope.onmessage = (event) => {
  const request = event.data

  if (request.type === 'parse') {
    let totalRows = 0

    Papa.parse<string[]>(request.file, {
      skipEmptyLines: 'greedy',
      chunkSize: 64 * 1024,
      step() {
        totalRows += 1
      },
      complete() {
        post({ type: 'ready', totalRows: Math.max(0, totalRows - 1) })
        parseRows(request.file)
      },
      error() {
        post({
          type: 'row-error',
          line: 1,
          message: 'File CSV gagal dibaca.',
        })
        post({ type: 'complete' })
      },
    })
    return
  }

  if (request.type === 'continue') {
    if (pendingComplete) {
      pendingComplete = false
      post({ type: 'complete' })
      return
    }

    activeParser?.resume()
    activeParser = null
    return
  }

  activeParser?.abort()
  activeParser = null
  pendingComplete = false
  post({ type: 'cancelled' })
}