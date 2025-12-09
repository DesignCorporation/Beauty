import { useMutation } from '@tanstack/react-query'
import { clientApi } from '../services'

interface SendOtpResponse {
  expiresIn: number
  attemptsRemaining?: number
  maxAttempts?: number
}

interface ConfirmOtpParams {
  phone: string
  code: string
}

export const usePhoneVerification = () => {
  const sendMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await clientApi.sendPhoneVerification(phone)
      if (!response.success) {
        throw new Error(response.error || 'Failed to send verification code')
      }
      const payload = (response.data as SendOtpResponse | undefined) ?? {
        // @ts-expect-error — API может возвращать значения на корневом уровне
        expiresIn: response.expiresIn,
        // @ts-expect-error — свойства приходят без data
        attemptsRemaining: response.attemptsRemaining,
        // @ts-expect-error — свойства приходят без data
        maxAttempts: response.maxAttempts
      }
      return payload
    }
  })

  const confirmMutation = useMutation({
    mutationFn: async ({ phone, code }: ConfirmOtpParams) => {
      const response = await clientApi.confirmPhoneVerification(phone, code)
      if (!response.success) {
        throw new Error(response.error || 'Failed to verify code')
      }
      return response.data
    }
  })

  return {
    sendOtp: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    sendError: sendMutation.error instanceof Error ? sendMutation.error : null,
    confirmOtp: confirmMutation.mutateAsync,
    isConfirming: confirmMutation.isPending,
    confirmError: confirmMutation.error instanceof Error ? confirmMutation.error : null
  }
}
