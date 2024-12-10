## Run app
1. Prerequisites:
- Node.js (v18+)
- PostgreSQL
- Git

2. Setup Steps:
```

# Clone the repository
git clone git@github.com:OlegPlichko/madkudu-log-viewer.git
cd madkudu-log-viewer

# Install dependencies
npm install

# Create PostgreSQL database
createdb log_viewer_db
psql -f ./db/migrations/postgresql-schema.sql

# Set environment variables
# Create .env file in root directory
echo "DATABASE_URL=postgresql://username:password@localhost:5432/log_viewer_db
PORT=3000" > .env

# Start backend and frontend
npm start

```

3. Access Application:
http://localhost:3000

Recommended Deployment:
- Frontend: Vercel
- Database: Supabase PostgreSQL