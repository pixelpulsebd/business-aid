export type Cat = 'growth' | 'legal';

export const CATS: Record<Cat, string> = { growth: 'E-commerce', legal: 'Legal Aid' };

export interface Service { slug: string; cat: Cat; name: string; items: string[] }

// Service 1: E-commerce Solution (SEO, Content creation, Media buying, Business strategy)
// Service 2: Legal Aid (bullets from framework section 3.2)
export const SERVICES: Service[] = [
  { slug: 'seo', cat: 'growth', name: 'SEO & AEO', items: ['Technical SEO', 'On-page SEO', 'Off-page authority', 'AI answer engines', 'E-commerce SEO', 'Rank reporting'] },
  { slug: 'content', cat: 'growth', name: 'Content creation', items: ['Content management', 'Social content', 'Catalog content'] },
  { slug: 'media', cat: 'growth', name: 'Media buying', items: ['Facebook ads', 'Google ads', 'GA4 + Meta Pixel'] },
  { slug: 'strategy', cat: 'growth', name: 'Business strategy', items: ['Growth roadmap', 'Sales management', 'Sales development'] },
  { slug: 'tax', cat: 'legal', name: 'Income tax', items: ['ITR filing', 'Tax planning', 'TIN registration', 'Notice handling', 'Appeal & tribunal', 'TDS / VDS advisory', 'Exemptions'] },
  { slug: 'rjsc', cat: 'legal', name: 'RJSC registration', items: ['Formation in 3 working days', 'MoA / AoA drafting', 'Return filing', 'Share allotment / transfer', 'Failed-AGM resolution', 'Company revival'] },
  { slug: 'audit', cat: 'legal', name: 'Audit assistance', items: ['Audit report assistance'] },
];

export const WORK_TAGS = ['SEO & AEO', 'Content creation', 'Media buying', 'Business strategy', 'Income tax', 'RJSC registration', 'Audit assistance', 'Legal / tech support', 'Web / digital presence'];

export interface Client {
  name: string;
  href: string;
  logoDomain: string;
  logoUrl?: string;
  logoPath?: string;
  businessType: string;
  servicesProvided: string[];
  tags: string[];
  result?: string;
}

// Client sectors and service descriptions are based on the Business Aid website framework.
// Partner logos use the client-supplied, locally stored files in public/client-logo/.
export const CLIENTS: Client[] = [
  {
    name: 'jbhalalfood.com', href: 'https://jbhalalfood.com/', logoDomain: 'jbhalalfood.com', logoPath: '/client-logo/jb-alal-food-logo.png',
    businessType: 'Halal grocery and everyday essentials delivered across Japan.',
    servicesProvided: ['SEO & AEO', 'Content creation', 'Media buying', 'Website and technology support'],
    tags: ['Content creation', 'Legal / tech support', 'Media buying', 'SEO & AEO'], result: '8× sales growth in 5 months',
  },
  {
    name: 'koyabazar.com', href: 'https://koyabazar.com/', logoDomain: 'koyabazar.com', logoPath: '/client-logo/koya-bazar-logo.png',
    businessType: 'Bangladesh-based online shopping business offering home, furniture, IT, kitchen, and lifestyle products.',
    servicesProvided: ['SEO & AEO', 'Content creation', 'Media buying', 'Business strategy', 'Income tax consultancy', 'RJSC registration and compliance', 'Audit assistance'],
    tags: ['SEO & AEO', 'Content creation', 'Media buying', 'Business strategy', 'Income tax', 'RJSC registration', 'Audit assistance'],
  },
  {
    name: 'gulfgainsborough.co.uk', href: 'https://www.gulfgainsborough.co.uk/', logoDomain: 'gulfgainsborough.co.uk', logoPath: '/client-logo/gulf-gainsboroughs-logo.png',
    businessType: 'UK-based fuel station and vehicle-care business.',
    servicesProvided: ['Website development', 'Digital presence'],
    tags: ['Web / digital presence'],
  },
  {
    name: 'thefishbazar.com', href: 'https://thefishbazar.com/', logoDomain: 'thefishbazar.com', logoPath: '/client-logo/fish-bazar-logo.png',
    businessType: 'Online seafood retail and delivery serving Dhaka customers.',
    servicesProvided: ['Content creation and management', 'Media buying'],
    tags: ['Content creation', 'Media buying'],
  },
  {
    name: 'farmzila.com.bd', href: 'https://farmzila.com.bd/', logoDomain: 'farmzila.com.bd', logoPath: '/client-logo/farmzila-logo.png',
    businessType: 'Natural foods, pantry products, and health-focused ingredients.',
    servicesProvided: ['Business strategy', 'Sales management'],
    tags: ['Business strategy'],
  },
  {
    name: 'smartmeals.online', href: 'https://smartmeals.online/', logoDomain: 'smartmeals.online', logoPath: '/client-logo/smart-meals-logo.png',
    businessType: 'Fresh prepared meals and nutrition-focused food delivery in Dhaka.',
    servicesProvided: ['Content creation and management', 'Sales development'],
    tags: ['Content creation', 'Business strategy'],
  },
  {
    name: 'japangoodsbd.com', href: 'https://japangoodsbd.com/', logoDomain: 'japangoodsbd.com', logoPath: '/client-logo/japan-goods-logo.png',
    businessType: 'Japanese beauty, skincare, and lifestyle products for Bangladesh.',
    servicesProvided: ['SEO & AEO', 'Content creation', 'Media buying', 'Sales and marketing support'],
    tags: ['SEO & AEO', 'Media buying', 'Content creation', 'Business strategy'],
  },
  {
    name: 'mrsolutionbd.com', href: 'https://mrsolutionbd.com/', logoDomain: 'mrsolutionbd.com', logoPath: '/client-logo/mr-solution-logo.png',
    businessType: 'Interior architecture and design services.',
    servicesProvided: ['Legal and business solutions', 'Technology and digital support'],
    tags: ['Legal / tech support'],
  },
  {
    name: 'rongdhonubd.com', href: 'https://rongdhonubd.com/', logoDomain: 'rongdhonubd.com', logoPath: '/client-logo/rong-dhonu-logo.png',
    businessType: 'Custom home painting and residential finishing services.',
    servicesProvided: ['Business support', 'Content creation', 'Media buying', 'Technology support'],
    tags: ['Business strategy', 'Legal / tech support', 'Content creation', 'Media buying'],
  },
  {
    name: 'facebook.com/shop.radience', href: 'https://www.facebook.com/shop.radience', logoDomain: 'facebook.com', logoPath: '/client-logo/radience-logo.jpg', logoUrl: 'https://graph.facebook.com/shop.radience/picture?type=large&width=512&height=512',
    businessType: 'Clothing retail and Facebook-based fashion commerce.',
    servicesProvided: ['Content creation', 'Media buying'],
    tags: ['Media buying', 'Content creation'],
  },
  {
    name: 'unicornbd.com', href: 'https://unicornbd.com/', logoDomain: 'unicornbd.com', logoPath: '/client-logo/unicornBD-logo.png',
    businessType: 'An online retail brand serving e-commerce customers.',
    servicesProvided: ['Content creation', 'Media buying'],
    tags: ['Media buying', 'Content creation'],
  },
  {
    name: 'ariosebd.com', href: 'https://ariosebd.com/', logoDomain: 'ariosebd.com', logoPath: '/client-logo/ariose-logo.png',
    businessType: 'An e-commerce brand supported with digital growth services.',
    servicesProvided: ['SEO & AEO', 'Content creation', 'Media buying'],
    tags: ['SEO & AEO', 'Media buying', 'Content creation'],
  },
];

export const CONTACT = {
  phone: '+880 1711 293197', wa: '8801711293197', email: 'info@thebizaid.com',
  address: '7B, House No.: Cha-71/4, Badda Lake Drive Road, Gulshan, Dhaka-1212',
};
