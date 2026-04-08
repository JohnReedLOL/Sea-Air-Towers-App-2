# Sea Air Towers — Vacation Rentals & Sales

A web application for renting and buying vacation apartments directly from landlords at [Sea Air Towers](http://www.seaairtowers.org/) in Hollywood Beach, Florida.

## Features

- **Search apartments** by bedrooms, bathrooms, and date availability
- **Landlord accounts** — sign up, list apartments, manage pricing and availability
- **Apartment listings** with monthly pricing, photos links, and additional details
- **Booking system** — landlords can mark date ranges as booked/unbooked
- **Password reset** flow with token-based security

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js ≥ 18 |
| **Language** | TypeScript 5 |
| **Framework** | Express 4 |
| **Database** | MongoDB (via Mongoose 8) |
| **Auth** | Passport.js (local strategy) |
| **Templates** | Pug |
| **CSS** | Bootstrap 5.3 (CDN) + custom coastal theme |
| **Icons** | Bootstrap Icons |
| **Build** | Sass, ts-node |
| **Lint** | ESLint 9 (flat config) + typescript-eslint |
| **Test** | Jest + ts-jest |
| **CI** | GitHub Actions (Node 18/20/22 matrix) |

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [MongoDB](https://www.mongodb.com/) (local or remote)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/<your-username>/Sea-Air-Towers-App-2.git
cd Sea-Air-Towers-App-2

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set MONGODB_URI and SESSION_SECRET
```

### Running MongoDB locally (Docker)

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

Then set in your `.env`:
```
MONGODB_URI=mongodb://localhost:27017/sea-air-towers
SESSION_SECRET=your-secret-here
```

### Build and run

```bash
# Build (compiles Sass, TypeScript, lints, copies static assets)
npm run build

# Start the server
npm start
```

The app runs at **http://localhost:8000** by default.

### Development mode

```bash
# Watch for changes (Sass + TypeScript + nodemon)
npm run watch
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Full build: Sass → TypeScript → ESLint → copy static assets |
| `npm run build-ts` | Compile TypeScript only |
| `npm run build-sass` | Compile Sass only |
| `npm run lint` | Type-check and lint with ESLint |
| `npm start` | Start the production server |
| `npm test` | Run Jest tests |
| `npm run watch` | Development mode with auto-reload |

## Project Structure

```
src/
├── app.ts                  # Express app configuration and routes
├── server.ts               # Server entry point
├── config/
│   └── passport.ts         # Passport authentication strategy
├── controllers/
│   ├── home.ts             # Homepage
│   ├── user.ts             # Auth (login, signup, password reset)
│   ├── apartment.ts        # Apartment CRUD and search
│   └── contact.ts          # Contact and mobile shortcut pages
├── models/
│   ├── Landlord.ts         # Landlord (user) model
│   ├── Apartment.ts        # Apartment listing model
│   └── ApartmentBookings.ts # Date booking model
├── types/                  # Custom type declarations
├── util/
│   ├── logger.ts           # Winston logger
│   └── secrets.ts          # Environment variable loader
└── public/
    ├── css/main.scss       # Custom theme styles
    ├── images/             # Property photos, favicons
    └── js/                 # Client-side scripts
views/                      # Pug templates
├── layout.pug              # Base layout (Bootstrap 5 CDN)
├── home.pug                # Homepage with hero, carousel, map
├── partials/               # Navbar, footer, flash messages
├── account/                # Login, signup, profile, password reset
└── apartment/              # Search, listings, create/edit, availability
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (required) |
| `SESSION_SECRET` | Express session secret (required) |
| `PORT` | Server port (default: 8000) |
| `NODE_ENV` | Environment: `production` or `development` |

## License

