import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const hasAxiom = !!process.env.AXIOM_TOKEN

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  transport: (isProduction && hasAxiom)
    ? { target: 'pino-axiom', options: { token: process.env.AXIOM_TOKEN, dataset: 'dealinno' } }
    : !isProduction
      ? { target: 'pino-pretty' }
      : undefined // Default to standard JSON stdout if Axiom is not configured in production/builds
})
