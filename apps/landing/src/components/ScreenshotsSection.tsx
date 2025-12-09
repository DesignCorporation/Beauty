import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function ScreenshotsSection() {
  return (
    <section id="screenshots" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-pink-100 rounded-full px-6 py-2 mb-6 border border-pink-200/50">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <span className="text-pink-700 font-medium">Интерфейс системы</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6">
            Красивый и <span className="text-pink-500">интуитивный</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Современный дизайн, который понравится вам и вашим сотрудникам. 
            Всё необходимое всегда под рукой.
          </p>
        </div>

        {/* Main screenshot */}
        <div className="mb-16">
          <Card className="bg-white border border-border shadow-2xl shadow-slate-500/10 rounded-3xl overflow-hidden">
            <div className="p-8">
              <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center relative overflow-hidden">
                
                {/* Mock interface elements */}
                <div className="relative z-10 w-full h-full p-8">
                  {/* Top bar */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-6 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-pink-400 rounded-lg"></div>
                      <span className="font-semibold text-foreground">Главная панель</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Онлайн</Badge>
                  </div>

                  {/* Content grid */}
                  <div className="grid grid-cols-3 gap-4 h-full">
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                      <div className="h-4 bg-pink-200 rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-1"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                      <div className="h-4 bg-purple-200 rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-1"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                      <div className="h-4 bg-emerald-200 rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-1"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-sm font-medium text-muted-foreground">SalonPro Dashboard</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Feature highlights */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Мобильная версия",
              description: "Работает на всех устройствах",
              bgColor: "bg-pink-100",
              icon: "📱"
            },
            {
              title: "Тёмная тема", 
              description: "Комфорт для глаз",
              bgColor: "bg-purple-100",
              icon: "🌙"
            },
            {
              title: "Быстрая загрузка",
              description: "< 2 секунд на любом устройстве",
              bgColor: "bg-emerald-100", 
              icon: "⚡"
            },
            {
              title: "Без рекламы",
              description: "Чистый интерфейс",
              bgColor: "bg-amber-100",
              icon: "✨"
            }
          ].map((feature, index) => (
            <Card key={index} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="p-6 text-center">
                <div className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl`}>
                  {feature.icon}
                </div>
                <h3 className="font-serif font-bold text-lg text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
