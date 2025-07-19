import express from 'express';
import gameRoutes from './routes/game';

const app = express();
app.use(express.json());

app.use('/v1/games', gameRoutes);

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`Game Engine Service running on http://localhost:${PORT}`);
});
