# InsureCast Frontend

Next.js frontend for the InsureCast forecasting dashboard. The production image uses standalone Next.js output and replaces the baked-in local API URL with `API_URL` at container startup, so the same image can target local Docker, staging, or `https://api-insurecast.symfa.ai`.

## Getting Started

Prerequisites:

- Node.js 24+
- pnpm

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
The frontend expects the backend API at [http://localhost:8000](http://localhost:8000) during local development.

## Checks

```bash
pnpm lint
pnpm check
pnpm build
```

## Docker

```bash
docker build -t insurecast-frontend .
docker run -p 3000:3000 -e API_URL=http://host.docker.internal:8000 insurecast-frontend
```

At deployment time, set `API_URL=https://api-insurecast.symfa.ai` so the UI points at the hosted backend without rebuilding the image.

## Deployment

- Frontend: [https://insurecast.symfa.ai](https://insurecast.symfa.ai)
- Backend API: [https://api-insurecast.symfa.ai](https://api-insurecast.symfa.ai)

The production Dockerfile uses Node.js 24 and keeps `PORT=3000` and `HOSTNAME=0.0.0.0` in the runtime container for deployment parity with the reference repo.

## References

- [Next.js documentation](https://nextjs.org/docs)
