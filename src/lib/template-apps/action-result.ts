export type AppActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export function getActionFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return issues.reduce<Record<string, string[]>>((errors, issue) => {
    const key = issue.path.length ? issue.path.join('.') : '_form'
    errors[key] ??= []
    errors[key].push(issue.message)
    return errors
  }, {})
}
