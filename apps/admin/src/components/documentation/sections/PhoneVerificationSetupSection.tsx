import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui';
import {
  Smartphone,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Globe,
  Lock,
  Database,
  Terminal,
  DollarSign,
  FileText
} from 'lucide-react';

const overviewStats = [
  { label: 'Target Market', value: '🇵🇱 Poland + EU' },
  { label: 'Primary Provider', value: 'Twilio' },
  { label: 'Fallback', value: 'MessageBird' },
  { label: 'OTP TTL', value: '5 минут' }
];

const smsProviders = [
  { name: 'Twilio', coverage: 'Global (Poland: €0.08/SMS)', recommended: true },
  { name: 'MessageBird', coverage: 'Europe (Poland: €0.065/SMS)', recommended: false }
];

const twilioEnvVars = [
  { name: 'TWILIO_ACCOUNT_SID', value: 'ACxxxxxxx...', note: 'MUST начинаться с AC' },
  { name: 'TWILIO_AUTH_TOKEN', value: 'your-auth-token', note: 'Auth token из Dashboard' },
  { name: 'TWILIO_PHONE_NUMBER', value: '+48123456789', note: 'Купленный польский номер' }
];

const messageBirdEnvVars = [
  { name: 'MESSAGEBIRD_API_KEY', value: 'your-api-key', note: 'Live API Key' },
  { name: 'MESSAGEBIRD_ORIGINATOR', value: 'BeautyPlatform', note: 'Sender ID (до 11 символов)' }
];

const otpEnvVars = [
  { name: 'SMS_OTP_LENGTH', value: '6', note: 'Длина OTP кода (default: 6)' },
  { name: 'SMS_OTP_EXPIRY_MINUTES', value: '5', note: 'Время жизни OTP (default: 5 минут)' },
  { name: 'SMS_MAX_ATTEMPTS_PER_HOUR', value: '3', note: 'Максимум попыток в час (default: 3)' }
];

const verificationFlowSteps = [
  'Client вводит phone number в международном формате (+48...)',
  'Frontend отправляет POST /api/clients/verify-phone с JWT auth',
  'Backend: нормализация через libphonenumber-js → E.164 формат',
  'Rate limiting check: максимум 3 SMS в час на номер (Redis)',
  'OTP generation: 6-значный код через crypto.randomInt()',
  'OTP storage: Redis с TTL 5 минут, ключ otp:code:{phone}',
  'SMS отправка: Twilio (primary) → MessageBird (fallback)',
  'SMS message: двуязычный (EN + PL) с OTP кодом',
  'Client получает SMS → вводит код на фронте',
  'Frontend отправляет POST /api/clients/confirm-phone { phone, code }',
  'Backend: timing-safe comparison (crypto.timingSafeEqual)',
  'Успех: ClientProfile.phoneVerified = true, phoneVerifiedAt = now()',
  'Редирект: /complete-profile → /dashboard'
];

const securityFeatures = [
  'Rate Limiting: 3 SMS в час на номер (Redis с TTL)',
  'OTP Expiry: 5 минут automatic expiration (Redis TTL)',
  'Failed Attempts: максимум 3 неверных попытки на номер',
  'Timing-Safe Comparison: crypto.timingSafeEqual() для защиты от timing attacks',
  'Cryptographic OTP: crypto.randomInt() (не Math.random())',
  'Phone Normalization: libphonenumber-js E.164 validation',
  'Redis Isolation: отдельные ключи для codes/attempts/requests',
  'Automatic Cleanup: Redis TTL автоматически удаляет expired codes'
];

const twilioSetupSteps = [
  '1. Перейдите на console.twilio.com и зарегистрируйтесь',
  '2. На Dashboard скопируйте Account SID (начинается с AC) и Auth Token',
  '3. Phone Numbers → Buy a Number → выберите Poland (+48)',
  '4. Включите SMS capability при покупке номера',
  '5. Купите номер (стоимость: ~€1/месяц)',
  '6. Скопируйте купленный номер в формате +48...',
  '7. Добавьте credentials в /root/projects/beauty/.env'
];

const messageBirdSetupSteps = [
  '1. Перейдите на dashboard.messagebird.com',
  '2. Settings → API Access → скопируйте Live API Key',
  '3. Настройте Originator (sender ID): BeautyPlatform',
  '4. Добавьте API key в .env файл'
];

const troubleshooting = [
  'No SMS providers configured: проверьте .env, убедитесь что нет placeholder значений ("your-account-sid")',
  'TWILIO_ACCOUNT_SID validation failed: Account SID MUST начинаться с "AC", иначе SDK не инициализируется',
  'SMS не доставляется: проверьте Twilio Dashboard → Logs → Messages для статуса доставки',
  'RATE_LIMIT_EXCEEDED: превышен лимит 3 SMS в час → подождите или очистите Redis вручную',
  'Invalid phone number format: номер должен быть в международном формате (+48...)',
  'Redis connection error: проверьте что Redis запущен (docker run -d -p 6379:6379 redis:7-alpine)',
  'OTP expired: код истек через 5 минут → запросите новый код',
  'Incorrect verification code: проверьте что клиент вводит правильный 6-значный код'
];

const costEstimation = [
  { provider: 'Twilio', setup: '€1/месяц (номер)', perSms: '€0.08', monthly1k: '€81', monthly10k: '€801' },
  { provider: 'MessageBird', setup: 'Free', perSms: '€0.065', monthly1k: '€65', monthly10k: '€650' }
];

export const PhoneVerificationSetupSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-green-600" />
          Phone Verification Setup Guide
        </CardTitle>
        <p className="text-sm text-gray-600">
          Полное руководство по настройке SMS OTP верификации для польского и европейского рынка. Обновлено 07.10.2025.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-green-900 font-semibold text-sm">{stat.value}</div>
              <div className="text-green-700 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-900">
              <strong>Target Market:</strong> Beauty Platform ориентирована на польский и европейский рынок.
              Используем международные SMS провайдеры (Twilio/MessageBird) с отличным покрытием EU.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          SMS Providers Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {smsProviders.map((provider) => (
            <div key={provider.name} className={`p-3 border rounded-lg ${provider.recommended ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-gray-900">{provider.name}</span>
                {provider.recommended && (
                  <span className="text-xs bg-purple-200 text-purple-900 px-2 py-1 rounded-full font-semibold">
                    Recommended
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-700">{provider.coverage}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-900">
              <strong>Fallback Strategy:</strong> Система автоматически пробует Twilio → MessageBird.
              Если оба провайдера недоступны, вернется ошибка с деталями обоих failures.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-600" />
          Twilio Configuration (Primary)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Setup Steps</h4>
          <div className="space-y-2">
            {twilioSetupSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-700">{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Environment Variables</h4>
          <div className="space-y-2">
            {twilioEnvVars.map((env) => (
              <div key={env.name} className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono text-gray-900">{env.name}</code>
                  <span className="text-xs text-gray-600">{env.note}</span>
                </div>
                <code className="text-xs font-mono text-blue-600 mt-1 block">{env.value}</code>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-900">
              <strong>Critical:</strong> TWILIO_ACCOUNT_SID MUST начинаться с "AC", иначе Twilio SDK
              выбросит ошибку инициализации. Placeholder значения ("your-account-sid") автоматически пропускаются.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-600" />
          MessageBird Configuration (Fallback)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Setup Steps</h4>
          <div className="space-y-2">
            {messageBirdSetupSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                <CheckCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-700">{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Environment Variables</h4>
          <div className="space-y-2">
            {messageBirdEnvVars.map((env) => (
              <div key={env.name} className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono text-gray-900">{env.name}</code>
                  <span className="text-xs text-gray-600">{env.note}</span>
                </div>
                <code className="text-xs font-mono text-orange-600 mt-1 block">{env.value}</code>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          Redis Configuration (Required)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Local Development</h4>
          <div className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono space-y-1">
            <div># Запуск Redis через Docker</div>
            <div>docker run -d -p 6379:6379 --name beauty-redis redis:7-alpine</div>
            <div className="mt-2"># Проверка</div>
            <div>redis-cli ping  # Должно вернуть PONG</div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Production Options</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded">
              <span className="text-xs font-semibold text-indigo-900 block">AWS ElastiCache</span>
              <span className="text-xs text-indigo-700">Managed Redis на AWS</span>
            </div>
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded">
              <span className="text-xs font-semibold text-indigo-900 block">DigitalOcean</span>
              <span className="text-xs text-indigo-700">Managed Databases</span>
            </div>
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded">
              <span className="text-xs font-semibold text-indigo-900 block">Redis Cloud</span>
              <span className="text-xs text-indigo-700">redis.com hosted</span>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Environment Variable</h4>
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <code className="text-xs font-mono text-gray-900 block">REDIS_URL</code>
            <code className="text-xs font-mono text-indigo-600 mt-1 block">redis://localhost:6379</code>
            <span className="text-xs text-gray-600 mt-1 block">Development / Production URL</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-600" />
          OTP Configuration (Optional)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {otpEnvVars.map((env) => (
            <div key={env.name} className="bg-gray-50 border border-gray-200 rounded p-3">
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono text-gray-900">{env.name}</code>
                <span className="text-xs text-gray-600">{env.note}</span>
              </div>
              <code className="text-xs font-mono text-teal-600 mt-1 block">{env.value}</code>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="text-xs text-teal-900">
            <strong>Note:</strong> Эти переменные опциональны. Если не указаны, используются defaults:
            OTP length = 6, expiry = 5 минут, max attempts = 3 в час.
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-600" />
          Verification Flow Architecture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {verificationFlowSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 p-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {idx + 1}
              </div>
              <span className="text-xs text-gray-700 leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          Security Features
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {securityFeatures.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 border border-red-100 rounded">
              <Lock className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          SMS Message Format (Dual Language)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-mono text-gray-900 space-y-2">
            <div className="text-blue-700">EN:</div>
            <div>Your Beauty Platform verification code: <strong>123456</strong>. Valid for <strong>5</strong> minutes.</div>
            <div className="mt-3 text-blue-700">PL:</div>
            <div>Twój kod weryfikacyjny Beauty Platform: <strong>123456</strong>. Ważny przez <strong>5</strong> minut.</div>
          </div>
        </div>
        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-xs text-purple-900">
            <strong>UX Optimization:</strong> Система отправляет SMS на двух языках (EN + PL) для лучшего
            пользовательского опыта в европейском рынке.
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Cost Estimation (Poland)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Provider</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Setup</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">Per SMS</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">1K SMS/mo</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-900">10K SMS/mo</th>
              </tr>
            </thead>
            <tbody>
              {costEstimation.map((row) => (
                <tr key={row.provider} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-semibold text-gray-900">{row.provider}</td>
                  <td className="py-2 px-3 text-gray-700">{row.setup}</td>
                  <td className="py-2 px-3 text-gray-700">{row.perSms}</td>
                  <td className="py-2 px-3 text-gray-700">{row.monthly1k}</td>
                  <td className="py-2 px-3 text-gray-700">{row.monthly10k}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-xs text-green-900">
            <strong>Recommendation:</strong> Используйте Twilio как primary, MessageBird как fallback.
            MessageBird дешевле на ~18%, но Twilio имеет лучший developer experience и документацию.
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Troubleshooting
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {troubleshooting.map((issue, idx) => (
            <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-xs text-gray-900">
                <strong className="text-yellow-900">{issue.split(':')[0]}:</strong>
                {issue.split(':').slice(1).join(':')}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          Useful Links
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <a href="https://www.twilio.com/docs/sms/pricing/pl" target="_blank" rel="noopener noreferrer"
             className="block p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
            <span className="text-xs text-blue-900 font-semibold">Twilio Poland Coverage</span>
            <span className="text-xs text-blue-700 block mt-1">SMS pricing and availability</span>
          </a>
          <a href="https://www.messagebird.com/pricing/sms/poland" target="_blank" rel="noopener noreferrer"
             className="block p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
            <span className="text-xs text-blue-900 font-semibold">MessageBird Poland SMS</span>
            <span className="text-xs text-blue-700 block mt-1">European SMS provider</span>
          </a>
          <a href="https://gitlab.com/catamphetamine/libphonenumber-js" target="_blank" rel="noopener noreferrer"
             className="block p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
            <span className="text-xs text-blue-900 font-semibold">libphonenumber-js Docs</span>
            <span className="text-xs text-blue-700 block mt-1">Phone number validation library</span>
          </a>
          <a href="https://redis.io/docs/getting-started/" target="_blank" rel="noopener noreferrer"
             className="block p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
            <span className="text-xs text-blue-900 font-semibold">Redis Quick Start</span>
            <span className="text-xs text-blue-700 block mt-1">OTP storage setup</span>
          </a>
        </div>
      </CardContent>
    </Card>
  </div>
);
