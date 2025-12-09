import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote, Heart } from "lucide-react";

const testimonials = [
  {
    name: "Анна Петрова",
    role: "Владелица салона 'Красота'",
    location: "Москва",
    rating: 5,
    text: "SalonPro полностью изменил нашу работу! Теперь клиенты записываются сами, а я вижу всю аналитику в реальном времени. Прибыль выросла на 35% за первые два месяца.",
    avatar: "🌸"
  },
  {
    name: "Мария Иванова",
    role: "Директор сети салонов 'Элит'",
    location: "Санкт-Петербург", 
    rating: 5,
    text: "Управляем 3 салонами через одну систему. Очень удобно! Особенно нравится программа лояльности - клиенты стали возвращаться чаще. Поддержка просто супер!",
    avatar: "💎"
  },
  {
    name: "Екатерина Смирнова",
    role: "Мастер-парикмахер",
    location: "Казань",
    rating: 5,
    text: "Красивый интерфейс, всё интуитивно понятно. Клиенты в восторге от онлайн-записи. Система сама напоминает о визитах - забытых записей стало в разы меньше!",
    avatar: "✨"
  }
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-muted">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-2 mb-6 border border-border shadow-sm">
            <Heart className="w-4 h-4 text-pink-600" />
            <span className="text-pink-700 font-medium">Отзывы клиентов</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6">
            Что говорят о нас
            <span className="text-pink-500"> владельцы салонов</span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Более 2000 салонов красоты уже выбрали SalonPro. 
            Присоединяйтесь к успешным предпринимателям!
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative bg-white border border-border shadow-xl shadow-slate-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-pink-400"></div>
              <CardContent className="p-8">
                {/* Quote icon */}
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Quote className="w-6 h-6 text-pink-500" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-muted-foreground leading-relaxed mb-6 text-lg font-light italic">
                  &ldquo;{testimonial.text}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-300 rounded-full flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-foreground">
                      {testimonial.name}
                    </h4>
                    <p className="text-pink-600 font-medium text-sm">
                      {testimonial.role}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-pink-500 rounded-3xl p-12 text-white shadow-2xl shadow-pink-500/20">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">2000+</div>
              <p className="text-pink-100">Довольных салонов</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.9/5</div>
              <p className="text-pink-100">Средний рейтинг</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">35%</div>
              <p className="text-pink-100">Рост прибыли</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <p className="text-pink-100">Техподдержка</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
