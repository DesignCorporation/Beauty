import twilio from 'twilio'
import * as messagebird from 'messagebird'
import type { MessageBird } from 'messagebird'

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

const messageBirdApiKey = process.env.MESSAGEBIRD_API_KEY
const messageBirdOriginator = process.env.MESSAGEBIRD_ORIGINATOR || 'BeautyPlatform'

// 🔧 Валидация Twilio credentials перед инициализацией
// TWILIO_ACCOUNT_SID должен начинаться с "AC", иначе SDK падает
const isTwilioConfigured =
  twilioAccountSid &&
  twilioAuthToken &&
  twilioAccountSid.startsWith('AC') &&
  twilioAccountSid !== 'your-account-sid' // не placeholder

const twilioClient = isTwilioConfigured
  ? twilio(twilioAccountSid, twilioAuthToken)
  : null

// 🔧 Валидация MessageBird credentials
const isMessageBirdConfigured =
  messageBirdApiKey &&
  messageBirdApiKey !== 'your-api-key' // не placeholder

const messageBirdClient: MessageBird | null = isMessageBirdConfigured
  ? messagebird.initClient(messageBirdApiKey)
  : null

// Логирование состояния SMS провайдеров
if (!twilioClient && !messageBirdClient) {
  console.warn('⚠️  No SMS providers configured - phone verification will fail')
  console.warn('   Set TWILIO_ACCOUNT_SID (must start with AC) or MESSAGEBIRD_API_KEY to enable SMS')
} else {
  if (twilioClient) console.log('✅ Twilio SMS provider initialized')
  if (messageBirdClient) console.log('✅ MessageBird SMS provider initialized')
}

export class SmsProviderError extends Error {
  provider: 'twilio' | 'messagebird'

  constructor(provider: 'twilio' | 'messagebird', message: string, cause?: unknown) {
    super(message)
    this.name = 'SmsProviderError'
    this.provider = provider
    if (cause instanceof Error && cause.stack) {
      this.stack = cause.stack
    }
  }
}

async function sendViaTwilio(to: string, body: string) {
  if (!twilioClient || !twilioPhoneNumber) {
    throw new SmsProviderError('twilio', 'Twilio is not configured')
  }

  await twilioClient.messages.create({
    body,
    to,
    from: twilioPhoneNumber
  })
}

async function sendViaMessageBird(to: string, body: string) {
  if (!messageBirdClient) {
    throw new SmsProviderError('messagebird', 'MessageBird is not configured')
  }

  await new Promise<void>((resolve, reject) => {
    messageBirdClient.messages.create(
      {
        originator: messageBirdOriginator,
        recipients: [to],
        body
      },
      (error) => {
        if (error) {
          reject(new SmsProviderError('messagebird', 'MessageBird send failed', error))
        } else {
          resolve()
        }
      }
    )
  })
}

export async function sendVerificationSms(phone: string, message: string): Promise<void> {
  const errors: SmsProviderError[] = []

  if (twilioClient && twilioPhoneNumber) {
    try {
      await sendViaTwilio(phone, message)
      return
    } catch (error) {
      const smsError = error instanceof SmsProviderError ? error : new SmsProviderError('twilio', 'Twilio send failed', error)
      errors.push(smsError)
      console.error('[SMS] Twilio send failed', smsError)
    }
  }

  if (messageBirdClient) {
    try {
      await sendViaMessageBird(phone, message)
      return
    } catch (error) {
      const smsError = error instanceof SmsProviderError ? error : new SmsProviderError('messagebird', 'MessageBird send failed', error)
      errors.push(smsError)
      console.error('[SMS] MessageBird send failed', smsError)
    }
  }

  if (errors.length === 0) {
    throw new Error('No SMS providers are configured')
  }

  const aggregated = errors.map((err) => `${err.provider}: ${err.message}`).join('; ')
  throw new Error(`All SMS providers failed: ${aggregated}`)
}
