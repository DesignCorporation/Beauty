declare module 'speakeasy' {
  type Encoding = 'ascii' | 'hex' | 'base32';

  interface GenerateSecretOptions {
    length?: number;
    name?: string;
    issuer?: string;
    symbols?: boolean;
  }

  interface GeneratedSecret {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
  }

  interface OtpauthURLOptions {
    secret: string;
    label: string;
    issuer?: string;
    encoding?: Encoding;
  }

  interface TotpGenerateOptions {
    secret: string;
    encoding?: Encoding;
    step?: number;
    time?: number;
  }

  interface TotpVerifyOptions extends TotpGenerateOptions {
    token: string;
    window?: number | { start?: number; end?: number };
  }

  export function generateSecret(options?: GenerateSecretOptions): GeneratedSecret;

  export function otpauthURL(options: OtpauthURLOptions): string;

  export function totp(options: TotpGenerateOptions): string;

  export namespace totp {
    function verify(options: TotpVerifyOptions): boolean;
  }
}
