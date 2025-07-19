import express from 'express';
import tournamentRoutes from './routes/tournament';

const app = express();
app.use(express.json());

app.use('/v1/tournaments', tournamentRoutes);

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
  console.log(`Tournament Service running on http://localhost:${PORT}`);
});
