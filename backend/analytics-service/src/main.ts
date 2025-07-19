console.log('Analytics Service starting...');

const app = {
  post: (path: string, handler: Function) => console.log(`[SimApp] POST ${path}`),
  listen: (port: number, callback: () => void) => {
    console.log(`[SimApp] Server would be listening on port ${port}`);
    callback();
  }
};

// Simulate route registration
app.post('/v1/analytics/ingest', (req: any, res: any) => { /* analyticsRoutes.post_ingest_events(req, res) */ });

const PORT = process.env.PORT || 3010; // Different port

app.listen(Number(PORT), () => {
  console.log(`[SimApp] Analytics Service would be running on http://localhost:${PORT}`);
});
