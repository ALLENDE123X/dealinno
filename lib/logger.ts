import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const hasAxiom = !!process.env.AXIOM_TOKEN

export const logger = pino({
  level: isProduction ? 'info' : (isTest ? 'silent' : 'debug'),
  transport: isTest 
    ? undefined
    : (isProduction && hasAxiom)
      ? { target: 'pino-axiom', options: { token: process.env.AXIOM_TOKEN, dataset: 'dealinno' } }
      : !isProduction
        ? { target: 'pino-pretty' }
        : undefined // Default to standard JSON stdout if Axiom is not configured in production/builds
})
