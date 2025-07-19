import express from 'express';
import adminRoutes from './routes/admin';

const app = express();
app.use(express.json());

app.use('/v1/admin', adminRoutes);

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
  console.log(`Admin Service running on http://localhost:${PORT}`);
});
