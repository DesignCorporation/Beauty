import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@beauty-platform/ui'
import { 
  Users, 
  Crown, 
  Scissors, 
  User, 
  Wrench, 
  ArrowRight 
} from 'lucide-react'

export const SystemLogicSection: React.FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          🌟 Система ролей и логика платформы
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ROLES OVERVIEW */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">👥 Система ролей</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Super Admin */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="text-center">
                <Wrench className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <h4 className="font-bold text-red-800">Super Admin</h4>
                <p className="text-sm text-red-600 mt-2">Управляет всей платформой</p>
              </div>
              <ul className="mt-3 text-xs text-red-700 space-y-1">
                <li>• Все салоны</li>
                <li>• Системные настройки</li>
                <li>• Аналитика платформы</li>
                <li>• Биллинг</li>
              </ul>
            </div>

            {/* Salon Owner */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="text-center">
                <Crown className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-bold text-blue-800">Salon Owner</h4>
                <p className="text-sm text-blue-600 mt-2">Владелец салона</p>
              </div>
              <ul className="mt-3 text-xs text-blue-700 space-y-1">
                <li>• Полный доступ к салону</li>
                <li>• Управление мастерами</li>
                <li>• Приглашения персонала</li>
                <li>• Финансы салона</li>
              </ul>
            </div>

            {/* Staff Member */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="text-center">
                <Scissors className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-bold text-green-800">Staff Member</h4>
                <p className="text-sm text-green-600 mt-2">Мастер салона</p>
              </div>
              <ul className="mt-3 text-xs text-green-700 space-y-1">
                <li>• Только свои записи</li>
                <li>• Календарь мастера</li>
                <li>• Клиенты мастера</li>
                <li>• Ограниченный доступ</li>
              </ul>
            </div>

            {/* Client */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <div className="text-center">
                <User className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-bold text-purple-800">Client</h4>
                <p className="text-sm text-purple-600 mt-2">Клиент салона</p>
              </div>
              <ul className="mt-3 text-xs text-purple-700 space-y-1">
                <li>• Бронирование записей</li>
                <li>• История посещений</li>
                <li>• Личный профиль</li>
                <li>• Отзывы и рейтинги</li>
              </ul>
            </div>
          </div>
        </div>

        {/* STAFF INVITATION FLOW */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">🤝 Система приглашений мастеров</h3>
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
              <div className="flex-1 bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">Owner отправляет приглашение</h4>
                <p className="text-sm text-blue-600 mt-1">CRM → Team → "Invite Staff" → Email мастера</p>
              </div>
              <ArrowRight className="w-6 h-6 text-blue-500" />
            </div>

            {/* Step 2 */}
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
              <div className="flex-1 bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800">Мастер получает email</h4>
                <p className="text-sm text-green-600 mt-1">Красивое письмо с кнопкой "Accept Invitation"</p>
              </div>
              <ArrowRight className="w-6 h-6 text-green-500" />
            </div>

            {/* Step 3 */}
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
              <div className="flex-1 bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800">Регистрация мастера</h4>
                <p className="text-sm text-purple-600 mt-1">Заполнение профиля, создание пароля, загрузка фото</p>
              </div>
              <ArrowRight className="w-6 h-6 text-purple-500" />
            </div>

            {/* Step 4 */}
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
              <div className="flex-1 bg-indigo-50 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-800">Подтверждение Owner'a</h4>
                <p className="text-sm text-indigo-600 mt-1">Owner получает уведомление и подтверждает мастера</p>
              </div>
              <ArrowRight className="w-6 h-6 text-indigo-500" />
            </div>

            {/* Step 5 */}
            <div className="flex items-center space-x-4">
              <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">5</div>
              <div className="flex-1 bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800">Мастер активирован!</h4>
                <p className="text-sm text-orange-600 mt-1">Доступ к CRM с ограниченными правами</p>
              </div>
            </div>
          </div>
        </div>

        {/* PERMISSIONS MATRIX */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">🛡️ Матрица прав доступа</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4">Функция</th>
                  <th className="text-center py-3 px-4 text-red-600">Super Admin</th>
                  <th className="text-center py-3 px-4 text-blue-600">Salon Owner</th>
                  <th className="text-center py-3 px-4 text-green-600">Staff Member</th>
                  <th className="text-center py-3 px-4 text-purple-600">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 font-medium">Просмотр всех салонов</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 font-medium">Управление салоном</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Приглашение мастеров</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 font-medium">Просмотр всех записей салона</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Просмотр своих записей</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 font-medium">Создание записей</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-yellow-500">🔒</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Финансовые отчеты</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-green-500">✅</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                  <td className="text-center py-3 px-4 text-red-500">❌</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2">🔒 = Ограниченный доступ (только свои записи)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)