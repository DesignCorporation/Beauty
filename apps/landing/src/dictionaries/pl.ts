export const pl = {
  nav: {
    features: "Możliwości",
    pricing: "Cennik",
    stories: "Historie",
    login: "Zaloguj się",
    getAccess: "Rozpocznij Próbę",
  },
  hero: {
    eyebrow: "Złoty Standard",
    title: {
      gold: "Beauty",
      regular: "Zdefiniowane na nowo.",
    },
    subtitle: "Zarządzaj salonem z elegancją, na jaką zasługują Twoje usługi. Harmonogram, płatności i AI w jednym systemie.",
    cta: {
      primary: "Rozpocznij za darmo",
      secondary: "Zobacz film",
    },
  },
  features: {
    title: "Kolekcja",
    items: {
      ai: {
        title: "AI Concierge",
        desc: "Inteligentny asystent, który mówi językiem Twojej marki. Obsługuje rezerwacje i pytania.",
      },
      financials: {
        title: "Finanse",
        desc: "Eleganckie raporty przychodów. Integracja z kasami fiskalnymi i pełna kontrola nad VAT.",
      },
      vault: {
        title: "Bezpieczeństwo",
        desc: "Szyfrowanie klasy bankowej. Twoja baza klientów jest tylko Twoja.",
      },
      waitlist: {
        title: "Smart Waitlist",
        desc: "Automatyczne zapełnianie odwołanych wizyt klientami VIP.",
      },
    },
  },
  deepDive: {
    calendar: {
      title: "Kalendarz, który daje spokój",
      desc: "Przejrzysty widok dnia i tygodnia. Żadnych nakładek, żadnych pomyłek. Widzisz dokładnie, kto i kiedy przychodzi.",
    },
    messaging: {
      title: "WhatsApp & Telegram",
      desc: "Zapomnij o przestarzałych SMS-ach. Twoi klienci są na komunikatorach. Wysyłaj potwierdzenia i przypomnienia tam, gdzie oni faktycznie są.",
      bullets: ["Automatyczne potwierdzenia", "Przypomnienia o wizycie", "Zero opłat za SMS"],
    },
    analytics: {
      title: "Pełna kontrola biznesu",
      desc: "Śledź przychody, wydajność zespołu i popularność usług. Podejmuj decyzje oparte na danych, nie na intuicji.",
      bullets: ["Raporty sprzedaży", "Rozliczenia pracowników", "Historia wizyt"],
    },
  },
  pricing: {
    title: "Członkostwo",
    subtitle: "Przejrzyste zasady. Żadnych ukrytych opłat. Faktura VAT.",
    promo: "Oferta Specjalna do końca roku: -50% na start.",
    plans: {
      starter: {
        name: "Solo Artist",
        price: "50 zł",
        originalPrice: "100 zł",
        period: "/mc netto",
        desc: "Dla niezależnych twórców budujących swoją markę.",
        features: [
          "Pełny kalendarz wizyt",
          "Rezerwacje online 24/7",
          "Płatności (Zadatek)",
          "Przypomnienia SMS (100 szt.)",
        ],
      },
      pro: {
        name: "Salon",
        price: "50 zł",
        plus: "+ 25 zł / pracownik",
        period: "/mc netto",
        desc: "Dla rozwijających się zespołów. Pełna orkiestracja.",
        features: [
          "Wszystko z pakietu Solo",
          "Zarządzanie zespołem i prowizjami",
          "Raporty finansowe i magazyn",
          "Własna strona www",
          "Nielimitowane SMS",
        ],
        badge: "Najczęściej Wybierany",
      },
      enterprise: {
        name: "Empire",
        price: "Wycena",
        desc: "Dla sieci salonów definiujących branżę.",
        features: [
          "Wsparcie dedykowanego opiekuna",
          "API i Webhooki",
          "Aplikacja White-label",
          "Migracja danych z Booksy/Versum",
        ],
      },
    },
    calculator: {
      base: "Pakiet Bazowy",
      staff: "Pracownicy",
      staffUnit: "os.",
      total: "Razem miesięcznie",
      vat: "+ 23% VAT",
    }
  },
  pricingFeatures: {
    title: "Porównanie funkcji",
    categories: [
      {
        name: "Podstawowe",
        items: [
          { name: "Kalendarz wizyt", starter: true, pro: true },
          { name: "Rezerwacje online 24/7", starter: true, pro: true },
          { name: "Baza klientów (CRM)", starter: "Do 500", pro: "Nielimitowana" },
          { name: "Aplikacja mobilna", starter: true, pro: true },
        ]
      },
      {
        name: "Finanse & Płatności",
        items: [
          { name: "Zadatek online (Stripe)", starter: true, pro: true },
          { name: "Paragony fiskalne", starter: false, pro: true },
          { name: "Raporty sprzedaży", starter: "Podstawowe", pro: "Zaawansowane" },
          { name: "Zarządzanie magazynem", starter: false, pro: true },
        ]
      },
      {
        name: "Marketing",
        items: [
          { name: "Przypomnienia SMS/Email", starter: "100 szt.", pro: "Nielimitowane" },
          { name: "Wiadomości WhatsApp", starter: false, pro: true },
          { name: "Zbieranie opinii", starter: true, pro: true },
          { name: "Własna strona www", starter: false, pro: true },
        ]
      }
    ]
  },
  faq: {
    title: "Częste Pytania",
    subtitle: "Wszystko, co musisz wiedzieć o zarządzaniu salonem.",
    contact: "Skontaktuj się z nami",
    items: [
      {
        q: "Czy wystawiacie faktury VAT?",
        a: "Tak, jesteśmy polską spółką. Otrzymasz fakturę VAT 23% każdego miesiąca.",
      },
      {
        q: "Czy mogę przenieść dane z Booksy/Versum?",
        a: "Oczywiście. Nasz zespół Concierge zajmie się migracją Twojej bazy klientów i historii wizyt bezpłatnie.",
      },
      {
        q: "Jak działa opłata za pracownika?",
        a: "Płacisz 50 zł za bazę + 25 zł za każdego aktywnego pracownika z grafikiem. Jeśli pracownik odejdzie, wyłączasz go i płacisz mniej.",
      },
    ],
  },
  founders: {
    title: "Słowo od Założycieli",
    quote: "Stworzyliśmy Beauty Platform, ponieważ wierzymy, że technologia powinna być tak piękna, jak sztuka, którą tworzysz każdego dnia. Powinna być cicha, wspierająca i niezawodna.",
    author: "DESIGN CORPORATION",
    role: "Współzałożyciele",
  }
}
