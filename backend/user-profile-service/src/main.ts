import express from 'express';
import profileRoutes from './routes/profile';

const app = express();
app.use(express.json());

app.use('/v1', profileRoutes);

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`User Profile Service running on http://localhost:${PORT}`);
});
