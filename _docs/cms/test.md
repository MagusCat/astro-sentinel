some fileds are shared between section for optimization but are just one editable for all.  for compatibility are by shared interfaces definen on docs/cms/generics.ts


Field Contact
fields like number, address and email are shared between the list but this are not allow to change their style because are inyected and end of social media list. 

like social list show on unify social media edit list
- facebook
- instagram

result
- facebook
- instagram
+ email, address and phone with their autogenerate appropiate link like google link to address, email mailto: and tel:.

this result this shared to hero section and contact

Social media social media are just one list but are share between with same format whats mean contact format are full version the truth and hero secion are just minify for temp data, this mean use contact version for the out result.

whatsapp section
accept number phone from unify fields but with respect fields format no spaces with country code.

Hero Section
    "socialLinks": [
      { "alt": "Instagram", "url": "https://instagram.com", "icon": "mingcute:instagram-line" },
      { "alt": "Teléfono", "url": "tel:+50550020202", "icon": "mingcute:phone-line" },
      { "alt": "Ubicación", "url": "https://maps.google.com", "icon": "mingcute:map-pin-line" }
    ]

Contact Section
    "contact": [
      {
        "title": "Instagram",
        "content": "@studiopower",
        "icon": "mingcute:instagram-line",
        "url": "https://instagram.com/studiopower"
      },
      {
        "title": "Teléfono",
        "content": "+505 5002 0202",
        "icon": "mingcute:phone-line",
        "url": "tel:+50550020202"
      },
      {
        "title": "Email",
        "content": "info@studiopower.com",
        "icon": "mingcute:mail-line",
        "url": "mailto:info@studiopower.com"
      },
      {
        "title": "Ubicación",
        "content": "Centro Comercial Power, Avenida Principal #456",
        "icon": "mingcute:map-pin-line",
        "url": "map.com"
      }