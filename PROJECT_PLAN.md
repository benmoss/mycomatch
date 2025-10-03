# Mushroom Identification Practice App

## Project Overview
A web application for practicing mushroom identification using real observation data from iNaturalist.

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (React-based)
- **Styling**: Tailwind CSS
- **State Management**: React Context API / Zustand
- **Image Handling**: Next.js Image component
- **Type Safety**: TypeScript

### Data & APIs
- **Primary Data Source**: iNaturalist API (public, free)
- **Local Storage**: Browser LocalStorage for user progress (Phase 1)
- **Future**: PostgreSQL/Supabase for user accounts (Phase 2+)

### Development Tools
- **Package Manager**: npm/pnpm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Version Control**: Git

## Features Roadmap

### Phase 1 - MVP (Weeks 1-2)
**Goal**: Working quiz app with iNaturalist data

#### Core Features
- [ ] Quiz interface displaying mushroom photos
- [ ] Multiple choice answers (4 options)
- [ ] Immediate feedback (correct/incorrect)
- [ ] Species information display after answering
- [ ] Basic score tracking (session-based)
- [ ] Next/Previous navigation

#### Technical Requirements
- [ ] iNaturalist API integration
  - Fetch research-grade fungus observations
  - Filter for quality photos
  - Rate limit handling (100 req/min)
- [ ] Image loading and optimization
- [ ] Responsive design (mobile-first)

### Phase 2 - Enhanced Experience (Weeks 3-4)
**Goal**: Improved UX and customization

#### Features
- [ ] Regional filters (location-based species)
- [ ] Seasonal filters (when mushrooms fruit)
- [ ] Difficulty levels
  - Easy: Common species with distinct features
  - Medium: Similar-looking species
  - Hard: Rare or challenging identifications
- [ ] Progress tracking and statistics
  - Accuracy rate by species
  - Learning streaks
  - Personal bests
- [ ] Study modes
  - Timed challenges
  - Genus-specific quizzes
  - Seasonal species focus

#### Technical Requirements
- [ ] LocalStorage persistence
- [ ] Client-side data caching
- [ ] Statistics calculation engine

### Phase 3 - Advanced Features (Weeks 5+)
**Goal**: Community and learning optimization

#### Features
- [ ] User accounts and authentication
- [ ] Cloud-synced progress
- [ ] Spaced repetition algorithm
  - Track difficult species
  - Resurface for review
- [ ] Multiple photos per species
- [ ] Habitat and context information
- [ ] Identification tips and key features
- [ ] Custom quiz creation
- [ ] Community leaderboards
- [ ] Offline mode with cached data

#### Technical Requirements
- [ ] Backend API (Next.js API routes or separate service)
- [ ] Database (PostgreSQL/Supabase)
- [ ] Authentication (NextAuth.js or similar)
- [ ] Service worker for offline functionality

## iNaturalist API Integration

### Key Endpoints
- **GET /observations**: Retrieve mushroom observations with photos
- **GET /taxa**: Get detailed species information

### API Parameters
```
/observations?
  iconic_taxa=Fungi
  &quality_grade=research
  &photos=true
  &per_page=50
  &order=desc
  &order_by=created_at
```

### Filtering Strategy
- `taxon_id=47170` - Basidiomycota (most common mushrooms)
- `taxon_id=48250` - Ascomycota (morels, cups, etc.)
- Geographic bounding box for regional filtering
- `created_at` for seasonal filtering
- `photo_license=cc-by,cc-by-nc,cc-by-sa` for properly licensed images

### Rate Limiting
- 100 requests per minute
- Implement request throttling
- Cache responses aggressively
- Consider building a curated dataset

## Data Strategy

### Curation Approach
1. **Starter Species Set**: Curate 50-100 common, easily identifiable species
2. **Photo Quality**: Select observations with clear, well-lit photos
3. **Educational Value**: Prioritize species with distinct identifying features
4. **Regional Relevance**: Build region-specific datasets

### Data Structure
```typescript
interface MushroomQuizItem {
  id: number;
  scientificName: string;
  commonName: string;
  photoUrl: string;
  photoAttribution: string;
  taxonId: number;
  observationCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  identificationTips?: string[];
  habitat?: string;
  season?: string[];
  region?: string;
}
```

## UX Considerations

### Quiz Flow
1. Display high-quality mushroom photo
2. Show 4 multiple-choice options (1 correct, 3 similar species)
3. User selects answer
4. Immediate visual feedback
5. Display species information and learning tips
6. Continue to next question

### Key Features
- **Progressive Image Loading**: Show low-res preview first
- **Multiple Photos**: When available, show different angles/stages
- **Context Clues**: Include habitat, substrate, season info
- **Accessibility**: Keyboard navigation, screen reader support
- **Mobile Optimized**: Touch-friendly, works on all devices

## Success Metrics

### MVP Success Criteria
- [ ] 50+ curated species in quiz pool
- [ ] <2s average question load time
- [ ] Mobile responsive (works on phones/tablets)
- [ ] 90%+ correct photo attributions

### User Engagement (Phase 2+)
- Average session duration
- Questions answered per session
- Return user rate
- Accuracy improvement over time

## Development Milestones

### Week 1
- [ ] Project setup (Next.js, TypeScript, Tailwind)
- [ ] iNaturalist API integration
- [ ] Basic quiz interface

### Week 2
- [ ] Answer validation and feedback
- [ ] Species information display
- [ ] Score tracking
- [ ] MVP deployment

### Week 3-4 (Phase 2)
- [ ] Filters and customization
- [ ] Progress tracking
- [ ] Enhanced UI/UX

### Week 5+ (Phase 3)
- [ ] User accounts
- [ ] Advanced features
- [ ] Community features

## Open Questions

1. **Image Licensing**: Verify iNaturalist CC license compatibility
2. **Data Storage**: When to transition from LocalStorage to database?
3. **Monetization**: Keep free? Premium features? Donations?
4. **Content Moderation**: How to ensure species accuracy?
5. **Mobile App**: Future React Native version?

## Resources

- [iNaturalist API Documentation](https://api.inaturalist.org/v1/docs/)
- [iNaturalist Developer Docs](https://www.inaturalist.org/pages/developers)
- [Next.js Documentation](https://nextjs.org/docs)
- [Mushroom Observer](https://mushroomobserver.org/) - Alternative data source
