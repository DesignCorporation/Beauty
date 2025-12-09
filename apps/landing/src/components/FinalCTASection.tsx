import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Heart, Crown } from "lucide-react";

export default function FinalCTASection() {
  return (
    <section id="cta" className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 text-center relative">
        {/* Icons */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-5xl md:text-7xl font-serif font-bold text-white mb-8 leading-tight">
          Готовы к росту
          <br />
          вашего салона?
        </h2>

        {/* Subtext */}
        <p className="text-2xl text-muted-foreground/60 leading-relaxed mb-12 max-w-full mx-auto">
          Присоединяйтесь к 2000+ успешных салонов красоты, которые уже 
          увеличили свою прибыль с помощью SalonPro
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          <Button 
            size="lg" 
            className="bg-pink-500 text-white hover:bg-pink-600 rounded-full px-12 py-6 text-xl font-bold shadow-2xl shadow-black/20 transform hover:scale-105 transition-all duration-200"
          >
            Начать бесплатно сейчас
            <ArrowRight className="w-6 h-6 ml-3" />
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="border-2 border-slate-500 text-white hover:bg-slate-700 rounded-full px-10 py-6 text-xl font-semibold transition-all duration-200"
          >
            Заказать демо
          </Button>
        </div>

        {/* Final guarantees */}
        <div className="grid md:grid-cols-3 gap-8 max-w-full mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Запуск за 10 минут</h3>
            <p className="text-muted-foreground/70">Начните работать сегодня</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">14 дней бесплатно</h3>
            <p className="text-muted-foreground/70">Без привязки карты</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Гарантия возврата</h3>
            <p className="text-muted-foreground/70">30 дней без рисков</p>
          </div>
        </div>

        {/* Final tagline */}
        <div className="mt-16 pt-16 border-t border-white/10">
          <p className="text-2xl font-serif italic text-white/90">
            &ldquo;Превратите ваш салон в прибыльный бизнес с SalonPro&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
