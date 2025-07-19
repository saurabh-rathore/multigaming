import express from 'express';
import leaderboardRoutes from './routes/leaderboard';

const app = express();
app.use(express.json());

app.use('/v1/leaderboards', leaderboardRoutes);

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
  console.log(`Leaderboard Service running on http://localhost:${PORT}`);
});
