import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@beauty-platform/ui'
import { Calendar, Sparkles, Users, Star } from 'lucide-react'

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">{t('pages.home.brand')}</h1>
            </div>
            <div className="flex space-x-4">
              <Link to="/login">
                <Button variant="outline">{t('pages.home.header.login')}</Button>
              </Link>
              <Link to="/register">
                <Button>{t('pages.home.header.register')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold mb-6">
            {t('pages.home.hero.title')}
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            {t('pages.home.hero.subtitle')}
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              {t('pages.home.hero.cta')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">
            {t('pages.home.features.title')}
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">{t('pages.home.features.booking.title')}</h4>
              <p className="text-gray-600">
                {t('pages.home.features.booking.description')}
              </p>
            </div>
            <div className="text-center">
              <Users className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">{t('pages.home.features.masters.title')}</h4>
              <p className="text-gray-600">
                {t('pages.home.features.masters.description')}
              </p>
            </div>
            <div className="text-center">
              <Star className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">{t('pages.home.features.reviews.title')}</h4>
              <p className="text-gray-600">
                {t('pages.home.features.reviews.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-6 text-gray-900">
            {t('pages.home.cta.title')}
          </h3>
          <p className="text-xl mb-8 text-gray-600">
            {t('pages.home.cta.subtitle')}
          </p>
          <Link to="/register">
            <Button size="lg" className="text-lg px-8 py-3">
              {t('pages.home.cta.button')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="h-6 w-6" />
            <span className="text-lg font-semibold">{t('pages.home.brand')}</span>
          </div>
          <p className="text-gray-400">
            {t('pages.home.footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  )
}