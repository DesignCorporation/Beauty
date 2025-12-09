import { vi } from 'vitest'

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-min-32-chars-long'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:6021/auth/google/callback'
process.env.TWILIO_ACCOUNT_SID = 'test-account-sid'
process.env.TWILIO_AUTH_TOKEN = 'test-auth-token'
process.env.TWILIO_PHONE_NUMBER = '+1234567890'

// Mock node modules if needed
type MockFn = ReturnType<typeof vi.fn>
type MockLogger = {
  info: MockFn
  error: MockFn
  warn: MockFn
  debug: MockFn
  child: MockFn & ((bindings?: unknown) => MockLogger)
}

const createMockLogger = (): MockLogger => {
  const logger: Partial<MockLogger> = {}
  logger.info = vi.fn()
  logger.error = vi.fn()
  logger.warn = vi.fn()
  logger.debug = vi.fn()
  logger.child = vi.fn(() => logger as MockLogger) as MockLogger['child']
  return logger as MockLogger
}

vi.mock('pino', () => {
  const mockLogger = createMockLogger()
  return {
    default: vi.fn(() => mockLogger),
    pino: vi.fn(() => mockLogger)
  }
})

vi.mock('pino-http', () => ({
  default: vi.fn(() => (_req: any, _res: any, next: any) => next())
}))
