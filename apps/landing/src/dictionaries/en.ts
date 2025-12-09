export const en = {
  nav: {
    features: "Features",
    pricing: "Pricing",
    stories: "Stories",
    login: "Log in",
    getAccess: "Get Access",
  },
  hero: {
    eyebrow: "The Gold Standard",
    title: {
      gold: "Beauty",
      regular: "Redefined.",
    },
    subtitle: "Orchestrate your salon's rhythm with an interface as elegant as the services you provide. Scheduling, payments, and AI in one system.",
    cta: {
      primary: "Start Free Trial",
      secondary: "Watch Film",
    },
  },
  features: {
    title: "The Collection",
    items: {
      ai: {
        title: "AI Concierge",
        desc: "An intelligent assistant that speaks your brand's language. Handles bookings and questions.",
      },
      financials: {
        title: "Financials",
        desc: "Elegant reporting that makes sense of your revenue streams. Track growth without the headache.",
      },
      vault: {
        title: "Secure Vault",
        desc: "Bank-grade encryption for your client data. Your client list is yours alone.",
      },
      waitlist: {
        title: "Smart Waitlist",
        desc: "Automatically fill cancellations with high-value clients.",
      },
    },
  },
  deepDive: {
    calendar: {
      title: "A Calendar that breathes",
      desc: "Clear daily and weekly views. No double bookings, no confusion. See exactly who is coming and when.",
    },
    messaging: {
      title: "WhatsApp & Telegram",
      desc: "Forget outdated SMS. Your clients use messengers. Send confirmations and reminders where they actually look.",
      bullets: ["Automatic confirmations", "Appointment reminders", "Zero SMS fees"],
    },
    analytics: {
      title: "Total Business Control",
      desc: "Track revenue, team performance, and service popularity. Make decisions based on data, not guesswork.",
      bullets: ["Sales reports", "Staff commission", "Visit history"],
    },
  },
  pricing: {
    title: "Membership",
    subtitle: "Transparent pricing. No hidden fees.",
    promo: "End of Year Offer: -50% off base plan.",
    plans: {
      starter: {
        name: "Solo Artist",
        price: "50 zł",
        originalPrice: "100 zł",
        period: "/mo net",
        desc: "For independent artists building their legacy.",
        features: [
          "Full calendar",
          "24/7 Online booking",
          "Payments (Deposits)",
          "SMS reminders (100 included)",
        ],
      },
      pro: {
        name: "Salon",
        price: "50 zł",
        plus: "+ 25 zł / staff",
        period: "/mo net",
        desc: "For growing teams. Complete orchestration.",
        features: [
          "Everything in Solo",
          "Team & Commission management",
          "Financial reports & Inventory",
          "Custom website",
          "Unlimited SMS",
        ],
        badge: "Most Popular",
      },
      enterprise: {
        name: "Empire",
        price: "Custom",
        desc: "For multi-location brands defining the industry.",
        features: [
          "Dedicated account manager",
          "API & Webhooks",
          "White-label app",
          "Data migration service",
        ],
      },
    },
    calculator: {
      base: "Base Plan",
      staff: "Staff members",
      staffUnit: "p.",
      total: "Total monthly",
      vat: "+ 23% VAT",
    }
  },
  pricingFeatures: {
    title: "Feature Comparison",
    categories: [
      {
        name: "Core Features",
        items: [
          { name: "Appointment Calendar", starter: true, pro: true },
          { name: "24/7 Online Booking", starter: true, pro: true },
          { name: "Client Database (CRM)", starter: "Up to 500", pro: "Unlimited" },
          { name: "Mobile App", starter: true, pro: true },
        ]
      },
      {
        name: "Finance & Payments",
        items: [
          { name: "Online Deposits (Stripe)", starter: true, pro: true },
          { name: "Fiscal Receipts", starter: false, pro: true },
          { name: "Sales Reports", starter: "Basic", pro: "Advanced" },
          { name: "Inventory Management", starter: false, pro: true },
        ]
      },
      {
        name: "Marketing",
        items: [
          { name: "SMS/Email Reminders", starter: "100 qty", pro: "Unlimited" },
          { name: "WhatsApp Messages", starter: false, pro: true },
          { name: "Review Collection", starter: true, pro: true },
          { name: "Custom Website", starter: false, pro: true },
        ]
      }
    ]
  },
  faq: {
    title: "Common Questions",
    subtitle: "Everything you need to know about orchestrated salon management.",
    contact: "Contact Support",
    items: [
      {
        q: "Do you issue VAT invoices?",
        a: "Yes, we are a registered EU company. You receive a VAT invoice every month.",
      },
      {
        q: "Can I migrate from other software?",
        a: "Yes. Our Concierge team handles the migration of your client database and history for free.",
      },
      {
        q: "How does per-staff pricing work?",
        a: "You pay 50 zł base + 25 zł for each active staff member with a schedule.",
      },
    ],
  },
  founders: {
    title: "A Note from the Founders",
    quote: "We built Beauty Platform because we believe technology should be as beautiful as the art you create every day. It should be silent, supportive, and seamless.",
    author: "DESIGN CORPORATION",
    role: "Co-Founders",
  }
}
