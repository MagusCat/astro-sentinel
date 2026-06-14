// Generics

export interface DataIconItem {
  icon: string;
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  alt?: string;
}

export interface DataMediaItem {
  id: number | string;
  title: string;
  url?: string;
  image?: string;
  excerpt?: string;
  date?: string;
  author?: string;
}

// Hero Section

export interface SocialLink extends DataIconItem {
  alt: string;
  url: string;
  icon: string;
}

export interface HeroCarouselImage {
  src: string | unknown;
  type: "local" | "external";
  alt?: string;
}

export interface HeroSectionData {
  title: string;
  subtitle: string;
  description: string;
  socialLinks: SocialLink[];
  carouselImages?: HeroCarouselImage[];
}

// About Section

export interface AboutSectionData {
  heading: string;
  paragraph_1: string;
  paragraph_2?: string;
}

// Principles / Art Section

export interface ArtContentItem extends DataIconItem {
  icon: string;
  title: string;
  description: string;
}

export interface ArtSectionData {
  heading: string;
  items: ArtContentItem[];
}

// schedule section

export interface HourSlot {
  time: string;
  period: "am" | "pm" | "AM" | "PM";
}

export interface DaySchedule {
  slots: HourSlot[];
  active?: boolean;
}

export interface ScheduleInfo {
  // Ej: "Mon"
  [key: string]: DaySchedule;
}

export interface DayLabel {
  // Ej: Mon: "Monday"
  [key: string]: string;
}

export interface ClassInfo {
  name: string;
  description?: string;
  details: string[];
  scheduleDays: ScheduleInfo;
}

export interface ScheduleSectionData {
  heading: string;
  classes: ClassInfo[];
  dayLabels: DayLabel;
}

// Gallery Section

export interface GalleryImage extends DataMediaItem {
  id: number | string;
  url: string;
  title: string;
}

export interface GallerySectionData {
  heading: string;
  images: GalleryImage[];
}

// Comments / Testimonials Section

export interface TestimonialItem {
  name: string;
  role: string;
  content: string;
  theme?: "light" | "dark" | "highlight";
}

export interface CommentsSectionData {
  heading: string;
  items: TestimonialItem[];
}

// Contact Section

export interface ContactItem extends DataIconItem {
  icon: string;
  title: string;
  content: string;
  url?: string;
}

export interface WhatsappItem {
  number: string;
  message: string;
  title: string;
}

export interface ContactSectionData {
  heading?: string;
  description?: string;
  contact: ContactItem[];
  whatsapp: WhatsappItem;
  mapEmbedUrl?: string;
}

// FAQ Section

export interface FaqData {
  question: string;
  answer: string;
}

export interface FaqSectionData {
  heading?: string;
  description?: string;
  faqs: FaqData[];
}

// Header & Footer (LAYOUT)

export interface NavItem {
  section: string;
  url: string;
}

export interface HeaderData {
  navItems: NavItem[];
  contactItem?: NavItem;
}

export interface FooterItem {
  label: string;
  url: string;
}

export interface FooterData {
  copyright: number;
  owner: string;
  footerItems: FooterItem[];
}

// Root Landing Page Content

export interface LandingPageContent {
  header: HeaderData;
  hero: HeroSectionData;
  about: AboutSectionData;
  art: ArtSectionData;
  schedule: ScheduleSectionData;
  gallery: GallerySectionData;
  comments: CommentsSectionData;
  faq: FaqSectionData;
  contact: ContactSectionData;
  footer: FooterData;
}
