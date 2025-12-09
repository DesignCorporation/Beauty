import passport from 'passport'
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20'
import { prisma, ClientSource } from '@beauty-platform/database'

const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const callbackURL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:6021/api/auth/google/callback'
const ownerCallbackURL =
  process.env.GOOGLE_OWNER_CALLBACK_URL || 'http://localhost:6021/api/auth/google-owner/callback'

if (!clientId || !clientSecret) {
  console.warn('[Auth][Google OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables')
  console.warn('[Auth][Google OAuth] Google OAuth will be disabled. Routes will return 503 Service Unavailable.')
}

type GoogleStrategyResult = {
  email: string
  firstName: string
  lastName: string
  googleId: string
  picture?: string | null
  clientProfileId: string
  phoneVerified: boolean
}

// Only initialize Google OAuth if credentials are available
if (clientId && clientSecret) {
  passport.use(
    new GoogleStrategy(
    {
      clientID: clientId || '',
      clientSecret: clientSecret || '',
      callbackURL,
      passReqToCallback: false
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase()

        if (!email) {
          return done(new Error('Google account is missing email address'))
        }

        const firstName = profile.name?.givenName || profile.displayName || 'Client'
        const lastName = profile.name?.familyName || ''
        const googleId = profile.id
        const picture = profile.photos?.[0]?.value || null

        const existingProfile = await prisma.clientProfile.findUnique({
          where: { email }
        })

        if (existingProfile) {
          const updatedProfile = await prisma.clientProfile.update({
            where: { email },
            data: {
              googleId,
              firstName: firstName || existingProfile.firstName,
              lastName: lastName || existingProfile.lastName,
              source: existingProfile.source ?? ClientSource.GOOGLE_OAUTH
            }
          })

          return done(null, {
            email,
            firstName: updatedProfile.firstName,
            lastName: updatedProfile.lastName,
            googleId,
            picture,
            clientProfileId: updatedProfile.email,
            phoneVerified: updatedProfile.phoneVerified
          } satisfies GoogleStrategyResult)
        }

        const newProfile = await prisma.clientProfile.create({
          data: {
            email,
            firstName,
            lastName,
            googleId,
            source: ClientSource.GOOGLE_OAUTH,
            preferredLanguage: 'PL'
          }
        })

        return done(null, {
          email,
          firstName: newProfile.firstName,
          lastName: newProfile.lastName,
          googleId,
          picture,
          clientProfileId: newProfile.email,
          phoneVerified: newProfile.phoneVerified
        } satisfies GoogleStrategyResult)
      } catch (error) {
        return done(error as Error)
      }
    }
  )
)

  // Owner OAuth Strategy (отдельная стратегия для владельцев салонов)
  passport.use(
    'google-owner',
    new GoogleStrategy(
    {
      clientID: clientId || '',
      clientSecret: clientSecret || '',
      callbackURL: ownerCallbackURL,
      passReqToCallback: false
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase()

        if (!email) {
          return done(new Error('Google account is missing email address'))
        }

        const firstName = profile.name?.givenName || profile.displayName || 'Owner'
        const lastName = profile.name?.familyName || ''
        const googleId = profile.id
        const picture = profile.photos?.[0]?.value || null

        return done(null, {
          email,
          firstName,
          lastName,
          googleId,
          picture,
          clientProfileId: email,
          phoneVerified: false
        } satisfies GoogleStrategyResult)
      } catch (error) {
        return done(error as Error)
      }
    }
  )
  )
} else {
  console.warn('[Auth][Google OAuth] Strategies not initialized - credentials missing')
}

export type GoogleAuthPayload = GoogleStrategyResult

export default passport
