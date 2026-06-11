import { deriveContactItems } from './src/features/cms/core/derive'

const globals = {
  siteTitle: "Studio Power",
  contactPhone: "+505 8430 5691",
  contactAddress: "Costrado norte...",
  contactEmail: "myastropower@outlook.com",
  socialLinks: [
    {
      alt: "Instagram",
      url: "https://instagram.com/powerfitnees_polldance",
      icon: "mingcute:ins-fill",
      title: "powerfitnees_polldance"
    }
  ]
}

const contact = {
  mapLink: "https://maps.app.goo.gl/2nCSfYKXD12YQXPt5"
}

console.log(JSON.stringify(deriveContactItems(globals as any, contact as any), null, 2))
