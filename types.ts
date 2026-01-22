
export type Category = 'Tech' | 'Music' | 'Fitness' | 'Business' | 'Art' | 'Food' | 'Sports' | 'Hobbies';

export interface User {
  id: string;
  name: string;
  email: string;
  location: string;
  interests: Category[];
  savedEvents: string[]; // Event IDs
  interactions: UserInteraction[];
}

export interface UserInteraction {
  eventId: string;
  type: 'view' | 'save' | 'share';
  timestamp: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  dateTime: string;
  category: Category;
  organizer: string;
  imageUrl?: string;
  organizerId: string;
}

export interface Recommendation {
  eventId: string;
  reason: string;
  matchScore: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
