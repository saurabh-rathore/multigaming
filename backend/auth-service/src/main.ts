import express from 'express';
import authRoutes from './routes/auth';

const app = express();
app.use(express.json());

app.use('/v1/auth', authRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Auth Service running on http://localhost:${PORT}`);
});
