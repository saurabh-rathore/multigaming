import * as ctrl from '../controllers/adminController'; // Using ctrl alias

// Placeholder for Express Router and middleware
// import { Router } from 'express';
// import { ensureAdminAuthenticated } from '../middleware/auth.middleware'; // Conceptual
// const router = Router();

// All these routes should be protected by ensureAdminAuthenticated middleware in a real app.
export const adminRoutes = {
  // User Management (example existing)
  get_users_list: ctrl.listUsers,        // GET /admin/users
  post_ban_user: ctrl.banUserAccount,    // POST /admin/users/:userId/ban

  // Game Management (example existing)
  get_games_list: ctrl.listGames,        // GET /admin/games
  post_toggle_game_status: ctrl.toggleGameStatus, // POST /admin/games/:gameId/toggle-status (more RESTful than /toggle-active)

  // Dashboard Endpoints
  get_dashboard_summary: ctrl.getDashboardSummary,            // GET /admin/dashboard/summary
  get_active_users_report: ctrl.getActiveUsersReport,       // GET /admin/reports/active-users
  get_match_stats_report: ctrl.getMatchStatisticsReport,    // GET /admin/reports/match-statistics
  get_feedback_report: ctrl.getSatisfactionFeedbackReport,  // GET /admin/reports/feedback

  // Audit Logs
  get_audit_logs: ctrl.listAuditLogs,                       // GET /admin/audit-logs

  // --- Export Routes ---
  // GET /admin/export/users.csv
  // GET /admin/export/game-results.csv?gameId=...&fromDate=...&toDate=...
  // GET /admin/export/audit-logs.csv?fromDate=...&toDate=...
  get_export_users_csv: ctrl.exportUsersCsvController,
  get_export_game_results_csv: ctrl.exportGameResultsCsvController,
  get_export_audit_logs_csv: ctrl.exportAuditLogsCsvController,

  // --- Moderation Routes ---
  // POST /admin/users/:userId/mute (Body: { durationHours: number, reason: string })
  // POST /admin/users/:userId/unmute
  post_mute_user: ctrl.muteUserController,
  post_unmute_user: ctrl.unmuteUserController,

  // GET /admin/chat/transcripts/room/:roomId
  // GET /admin/chat/transcripts/user/:userId?limit=...
  get_chat_transcript_room: ctrl.viewChatTranscriptRoomController,
  get_chat_transcript_user: ctrl.viewChatTranscriptUserController
};

// Example Express Router mapping:
// router.use(ensureAdminAuthenticated); // Apply middleware to all admin routes
//
// router.get('/users', ctrl.listUsers);
// router.post('/users/:userId/ban', ctrl.banUserAccount);
// router.get('/games', ctrl.listGames);
// router.post('/games/:gameId/toggle-status', ctrl.toggleGameStatus);
//
// router.get('/dashboard/summary', ctrl.getDashboardSummary);
// router.get('/reports/active-users', ctrl.getActiveUsersReport);
// router.get('/reports/match-statistics', ctrl.getMatchStatisticsReport);
// router.get('/reports/feedback', ctrl.getSatisfactionFeedbackReport);
//
// router.get('/audit-logs', ctrl.listAuditLogs);
//
// export default router;
