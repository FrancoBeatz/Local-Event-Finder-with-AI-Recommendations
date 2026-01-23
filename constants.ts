
import { Category } from './types';

export const EVENT_CATEGORIES: Category[] = [
  'Tech', 'Music', 'Fitness', 'Business', 'Art', 'Food', 'Sports', 'Hobbies'
];

export const MOCK_EVENTS = [
  {
    id: '1',
    title: 'Cape Town Tech Summit 2025',
    description: 'The premier gathering for innovators in the Silicon Cape. Networking, keynote speakers, and startup pitches.',
    location: 'V&A Waterfront, Cape Town',
    dateTime: '2025-06-15T09:00:00',
    category: 'Tech' as const,
    organizer: 'Silicon Cape Initiative',
    organizerId: 'admin1',
    imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    title: 'Jazz on the Promenade',
    description: 'Enjoy sunset rhythms with local jazz legends at the Sea Point Promenade. Family friendly and free entry.',
    location: 'Sea Point, Cape Town',
    dateTime: '2025-08-25T17:30:00',
    category: 'Music' as const,
    organizer: 'Cape Town Arts Council',
    organizerId: 'admin2',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    title: 'Sandton Business Networking Breakfast',
    description: 'Connect with industry leaders in Sandton. A high-impact session for entrepreneurs and executives.',
    location: 'Sandton City, Johannesburg',
    dateTime: '2025-10-22T07:30:00',
    category: 'Business' as const,
    organizer: 'Joburg Chamber of Commerce',
    organizerId: 'admin3',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    title: 'Durban Beachfront Yoga',
    description: 'Morning flow on the Golden Mile. Start your Saturday with ocean breeze and mindfulness.',
    location: 'Golden Mile, Durban',
    dateTime: '2026-01-18T06:30:00',
    category: 'Fitness' as const,
    organizer: 'Suncoast Yoga',
    organizerId: 'admin4',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '5',
    title: 'Winelands Food & Wine Festival',
    description: 'Sample the finest cultivars and gourmet local cuisine in the heart of the Winelands.',
    location: 'Stellenbosch, Western Cape',
    dateTime: '2025-11-01T11:00:00',
    category: 'Food' as const,
    organizer: 'Winelands Collective',
    organizerId: 'admin5',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '6',
    title: 'Soweto Heritage Art Walk',
    description: 'A guided tour through the vibrant street art and galleries of Vilakazi Street.',
    location: 'Orlando West, Soweto',
    dateTime: '2025-12-16T10:00:00',
    category: 'Art' as const,
    organizer: 'Soweto Creative Hub',
    organizerId: 'admin6',
    imageUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=800'
  }
];
