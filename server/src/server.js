import 'dotenv/config';
import app from './app.js';
import { prisma } from './database/prisma.js';
import { expirePendingOffers } from './services/matching/matchingService.js';

const port = Number(process.env.PORT || 4000);
const server = app.listen(port, () => {
  console.log(`Demo API listening on http://localhost:${port}`);
});

const expiryTimer = setInterval(() => {
  expirePendingOffers(prisma).catch(() => console.error('Offer expiry check failed.'));
  prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } }).catch(() => {});
}, 5000);
expiryTimer.unref();

async function shutdown() {
  clearInterval(expiryTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
