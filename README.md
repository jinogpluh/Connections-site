# Connections-site

Deploy on Vercel with an Upstash Redis database connected.

Required environment variables:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The app stores shared puzzles in `/api/puzzles`, so everyone visiting the deployed site sees the same puzzle list.

Vercel project settings:
- Root Directory should be the project root.
- Output Directory should be empty.
- After changing env vars or project settings, redeploy the project.
