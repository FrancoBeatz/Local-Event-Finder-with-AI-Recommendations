
import { Category } from './types';

export const EVENT_CATEGORIES: Category[] = [
  'Tech', 'Music', 'Fitness', 'Business', 'Art', 'Food', 'Sports', 'Hobbies'
];

export const MOCK_EVENTS = [
  {
    id: '1',
    title: 'Modern Web Architecture Workshop',
    description: 'Join us for a deep dive into React and Microservices architecture. Perfect for senior devs and tech leads.',
    location: 'San Francisco, CA',
    dateTime: '2024-05-15T14:00:00',
    category: 'Tech' as const,
    organizer: 'TechTalk Hub',
    organizerId: 'admin1',
    imageUrl: 'https://picsum.photos/seed/tech1/800/600'
  },
  {
    id: '2',
    title: 'Jazz in the Park',
    description: 'An evening of smooth jazz and local wine tasting under the stars.',
    location: 'Austin, TX',
    dateTime: '2024-05-20T18:30:00',
    category: 'Music' as const,
    organizer: 'City Arts Council',
    organizerId: 'admin2',
    imageUrl: 'https://picsum.photos/seed/jazz/800/600'
  },
  {
    id: '3',
    title: 'Sunrise Yoga Session',
    description: 'Start your weekend with a refreshing yoga flow at the beach. All levels welcome!',
    location: 'Miami, FL',
    dateTime: '2024-05-18T07:00:00',
    category: 'Fitness' as const,
    organizer: 'Beachside Flow',
    organizerId: 'admin3',
    imageUrl: 'https://picsum.photos/seed/yoga/800/600'
  },
  {
    id: '4',
    title: 'Startup Networking Mixer',
    description: 'Connect with founders, investors, and innovators in the local tech ecosystem.',
    location: 'San Francisco, CA',
    dateTime: '2024-05-16T19:00:00',
    category: 'Business' as const,
    organizer: 'SF Innovators',
    organizerId: 'admin1',
    imageUrl: 'https://picsum.photos/seed/business/800/600'
  }
];
