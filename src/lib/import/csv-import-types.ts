export type CsvImportRow = {
  line: number
  fields: Record<string, string>
}

export type CsvWorkerRequest =
  | { type: 'parse'; file: File }
  | { type: 'continue' }
  | { type: 'cancel' }

export type CsvWorkerResponse =
  | { type: 'ready'; totalRows: number }
  | { type: 'rows'; rows: CsvImportRow[] }
  | { type: 'row-error'; line: number; message: string }
  | { type: 'complete' }
  | { type: 'cancelled' }