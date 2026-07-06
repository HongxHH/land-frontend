const PREFIX = '[landcheck]'

function formatMessage(level, message, context) {
  const parts = [PREFIX, level, message]
  if (context && Object.keys(context).length > 0) {
    parts.push(JSON.stringify(context))
  }
  return parts.join(' ')
}

function logToConsole(level, formatted, error) {
  if (level === 'error') {
    if (error != null) {
      console.error(formatted, error)
    } else {
      console.error(formatted)
    }
    return
  }
  if (level === 'warn') {
    console.warn(formatted)
    return
  }
  if (level === 'info') {
    console.info(formatted)
    return
  }
  console.debug(formatted)
}

function emit(level, message, context, error) {
  const formatted = formatMessage(level, message, context)
  if (import.meta.env.DEV || level === 'error' || level === 'warn') {
    logToConsole(level, formatted, error)
  }
}

export const logger = {
  debug(message, context) {
    if (!import.meta.env.DEV) return
    emit('debug', message, context)
  },
  info(message, context) {
    if (!import.meta.env.DEV) return
    emit('info', message, context)
  },
  warn(message, context) {
    emit('warn', message, context)
  },
  error(message, context, error) {
    emit('error', message, context, error)
  },
}

export default logger
