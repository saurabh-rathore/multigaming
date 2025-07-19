import express from 'express';
import matchmakingRoutes from './routes/matchmaking';

const app = express();
app.use(express.json());

app.use('/v1/match', matchmakingRoutes);

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  console.log(`Matchmaking Service running on http://localhost:${PORT}`);
});
