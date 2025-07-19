import {
    listAvailableTournaments, getTournamentDetails, registerUserForTournament,
    getTournamentParticipantList, startTournamentAdmin, finalizeTournamentAdmin
} from '../controllers/tournamentController';

export const tournamentRoutes = {
  list_tournaments: listAvailableTournaments,          // GET /tournaments
  get_tournament_by_id: getTournamentDetails,         // GET /tournaments/:tournamentId
  register_for_tournament: registerUserForTournament, // POST /tournaments/:tournamentId/register
  list_participants: getTournamentParticipantList,    // GET /tournaments/:tournamentId/participants

  // Admin specific routes (would have different auth/prefix in real setup)
  admin_start_tournament: startTournamentAdmin,       // POST /tournaments/:tournamentId/start (Admin)
  admin_finalize_tournament: finalizeTournamentAdmin, // POST /tournaments/:tournamentId/finalize (Admin)
};
