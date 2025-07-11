import {
  Profile,
  UpdateProfileRequestBody,
  KycUpdateRequestBody,
  Friend,
  Badge,
  UserBadge,
  GameHistoryEntry,
  CreateGameHistoryEntryBody,
  EnrichedUserProfile,
  RewardDefinition,
  DailyRewardInfo,
  WheelSpinPrize,
  WheelSpinStatus,
  WheelSpinResult,
  ClaimDailyRewardResponse
} from '../types/profile.types';
import { generateId, ensureDate, getTodayDateString,
   calculateDateDifferenceInDays,
   getTomorrowDateString } from '../utils/helpers'; // Added new date helpers
import pool from '../config/db.config';

// Define a type for RewardDefinition rows from DB
type RewardDefinitionRow = RewardDefinition & { [key: string]: any };
type WheelSpinPrizeRow = WheelSpinPrize & { [key: string]: any };

// Define types for DB rows
type ProfileRow = Profile & { [key: string]: any };
type FriendRow = Friend & { [key: string]: any };
type BadgeRow = Badge & { [key: string]: any };
type UserBadgeRow = UserBadge & { badge_name?: string; badge_icon_url?: string; badge_description?: string; } & { [key: string]: any }; // For JOINs
type GameHistoryRow = GameHistoryEntry & { [key: string]: any };

// Type for OkPacket result from INSERT/UPDATE/DELETE
interface OkPacket {
  affectedRows: number;
  insertId?: number | string; // insertId for INSERT, not always present for UPDATE
  changedRows?: number; // For UPDATE
}


export class ProfileService {

  async getProfile(userId: string): Promise<Profile | undefined> {
    console.log(`[ProfileService-DB] Getting profile for user: ${userId}`);
    const sql = 'SELECT * FROM profiles WHERE user_id = ? LIMIT 1';
    const [rows]: [ProfileRow[], any] = await pool.query(sql, [userId]) as [ProfileRow[], any];
    if (rows.length > 0) {
      // Convert date strings from DB to Date objects if necessary, though types might handle it.
      // For conceptual, assume direct mapping is okay or handled by driver/ORM.
      return rows[0] as Profile;
    }
    return undefined;
  }

  async updateProfile(userId: string, data: UpdateProfileRequestBody): Promise<Profile | undefined> {
    console.log(`[ProfileService-DB] Updating profile for user: ${userId}`);

    const currentProfile = await this.getProfile(userId);
    if (!currentProfile) {
      throw new Error('Profile not found for this user.');
    }

    // Dynamically build the SET part of the UPDATE query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // Map DTO fields to DB columns if names differ, here they are assumed same or handled by type
    if (data.username !== undefined) { updateFields.push('username = ?'); updateValues.push(data.username); }
    if (data.first_name !== undefined) { updateFields.push('first_name = ?'); updateValues.push(data.first_name); }
    if (data.last_name !== undefined) { updateFields.push('last_name = ?'); updateValues.push(data.last_name); }
    if (data.avatar_url !== undefined) { updateFields.push('avatar_url = ?'); updateValues.push(data.avatar_url); }
    if (data.date_of_birth !== undefined) { updateFields.push('date_of_birth = ?'); updateValues.push(ensureDate(data.date_of_birth)); } // ensureDate might be good here
    if (data.address_line1 !== undefined) { updateFields.push('address_line1 = ?'); updateValues.push(data.address_line1); }
    if (data.address_line2 !== undefined) { updateFields.push('address_line2 = ?'); updateValues.push(data.address_line2); }
    if (data.city !== undefined) { updateFields.push('city = ?'); updateValues.push(data.city); }
    if (data.state_province !== undefined) { updateFields.push('state_province = ?'); updateValues.push(data.state_province); }
    if (data.postal_code !== undefined) { updateFields.push('postal_code = ?'); updateValues.push(data.postal_code); }
    if (data.country !== undefined) { updateFields.push('country = ?'); updateValues.push(data.country); }
    if (data.bio !== undefined) { updateFields.push('bio = ?'); updateValues.push(data.bio); }

    if (updateFields.length === 0) {
      console.log('[ProfileService-DB] No fields to update for user:', userId);
      return currentProfile; // Return current profile if no changes
    }

    updateFields.push('updated_at = NOW()'); // Always update this timestamp
    updateValues.push(userId); // For the WHERE clause

    const sql = `UPDATE profiles SET ${updateFields.join(', ')} WHERE user_id = ?`;
    const [result]: [OkPacket, any] = await pool.query(sql, updateValues) as [OkPacket, any];

    if (result.affectedRows === 0 && result.changedRows === 0) { // changedRows for no actual value change
        // This could happen if data sent is same as current, or user_id not found (though we check above)
        console.warn(`[ProfileService-DB] Update for user ${userId} resulted in no changed rows.`);
        // Potentially re-fetch to be sure, or assume currentProfile if no error from DB
    }

    console.log('[ProfileService-DB] Profile updated (simulated DB).');
    const updatedProfile = await this.getProfile(userId); // Re-fetch to get the updated profile

    // Check for "Profile Complete" badge
    if (updatedProfile && updatedProfile.avatar_url && updatedProfile.bio) {
        try {
            await this.grantBadgeToUser(userId, 'profile_complete');
            console.log(`[ProfileService] Attempted to grant 'profile_complete' badge to user ${userId}.`);
        } catch (badgeError: any) {
            console.error(`[ProfileService] Error granting 'profile_complete' badge to user ${userId}: ${badgeError.message}`);
            // Non-critical error, don't fail the profile update
        }
    }
    return updatedProfile;
  }

  async updateUserKycStatus(userId: string, kycData: { kyc_status: Profile['kyc_status'], kyc_document_id?: string, kyc_rejection_reason?: string }): Promise<Profile | undefined> {
    console.log(`[ProfileService-DB] Updating KYC status for user: ${userId}`);
    const updateFields: string[] = ['kyc_status = ?', 'updated_at = NOW()'];
    const updateValues: any[] = [kycData.kyc_status];

    if (kycData.kyc_document_id !== undefined) {
        updateFields.push('kyc_document_id = ?');
        updateValues.push(kycData.kyc_document_id);
    } else { // If setting to a non-pending status, maybe clear document_id if not provided
        updateFields.push('kyc_document_id = NULL'); // Or keep existing, depends on logic
    }
    if (kycData.kyc_rejection_reason !== undefined) {
        updateFields.push('kyc_rejection_reason = ?');
        updateValues.push(kycData.kyc_rejection_reason);
    } else if (kycData.kyc_status !== 'rejected') { // Clear rejection reason if status is not 'rejected'
        updateFields.push('kyc_rejection_reason = NULL');
    }

    updateValues.push(userId); // For WHERE clause

    const sql = `UPDATE profiles SET ${updateFields.join(', ')} WHERE user_id = ?`;
    const [result]: [OkPacket, any] = await pool.query(sql, updateValues) as [OkPacket, any];

    if (result.affectedRows === 0) {
      throw new Error('Profile not found for KYC update or no changes made.');
    }
    console.log(`[ProfileService-DB] KYC status updated to ${kycData.kyc_status} (simulated DB).`);
    return this.getProfile(userId);
  }

  async createProfileIfNotExists(userId: string, initialData?: Partial<Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>>): Promise<Profile> {
    let profile = await this.getProfile(userId);
    if (profile) {
      return profile;
    }

    console.log(`[ProfileService-DB] Profile not found for ${userId}, creating one.`);
    const now = new Date();
    const newProfileData: Profile = {
      user_id: userId,
      username: initialData?.username || `user_${userId.substring(0, 8)}`,
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      kyc_status: initialData?.kyc_status || 'not_started',
      created_at: now,
      updated_at: now,
      // Fill other fields with defaults or from initialData
      avatar_url: initialData?.avatar_url,
      date_of_birth: ensureDate(initialData?.date_of_birth),
      address_line1: initialData?.address_line1,
      // ... etc. for all Profile fields
    };

    const sql = `
      INSERT INTO profiles (user_id, username, first_name, last_name, kyc_status, avatar_url, date_of_birth, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // Ensure all columns in INSERT match the VALUES, and handle undefined initialData fields gracefully (e.g. to NULL)
    const params = [
        newProfileData.user_id, newProfileData.username, newProfileData.first_name, newProfileData.last_name,
        newProfileData.kyc_status, newProfileData.avatar_url || null, newProfileData.date_of_birth || null,
        newProfileData.created_at, newProfileData.updated_at
    ];

    const [result]: [OkPacket, any] = await pool.query(sql, params) as [OkPacket, any];
    if (result.affectedRows !== 1) {
        throw new Error('Failed to create profile in database.');
    }

    console.log(`[ProfileService-DB] Profile created for user ${userId} (simulated DB).`);
    return newProfileData; // Return the newly constructed profile data
  }

  // --- Conceptual Friend Management Methods ---
  async addFriendRequest(requesterId: string, recipientId: string): Promise<Friend | null> {
    console.log(`[ProfileService-DB] User ${requesterId} sending friend request to ${recipientId}`);
    if (requesterId === recipientId) throw new Error("Cannot send friend request to oneself.");

    // Check if inverse request or existing friendship exists
    const checkExistingSql = 'SELECT * FROM friends WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)';
    const [existingRows]: [FriendRow[], any] = await pool.query(checkExistingSql, [requesterId, recipientId, recipientId, requesterId]) as [FriendRow[], any];
    if (existingRows.length > 0) {
        if(existingRows[0].status === 'blocked') throw new Error('Cannot send friend request; relationship is blocked.');
        throw new Error('Friend request already exists or users are already friends.');
    }

    const friendshipId = generateId('fr');
    const now = new Date();
    const insertSql = 'INSERT INTO friends (friendship_id, user_id_1, user_id_2, status, requested_at) VALUES (?, ?, ?, ?, ?)';
    const [result]: [OkPacket, any] = await pool.query(insertSql, [friendshipId, requesterId, recipientId, 'pending', now]) as [OkPacket, any];

    if (result.affectedRows === 1) {
        return { friendship_id: friendshipId, user_id_1: requesterId, user_id_2: recipientId, status: 'pending', requested_at: now };
    }
    return null;
  }

  async respondToFriendRequest(userId: string, friendshipId: string, response: 'accepted' | 'declined'): Promise<Friend | null> {
    console.log(`[ProfileService-DB] User ${userId} responding ${response} to friend request ${friendshipId}`);
    const getRequestSql = 'SELECT * FROM friends WHERE friendship_id = ? AND user_id_2 = ? AND status = ?';
    const [requests]: [FriendRow[], any] = await pool.query(getRequestSql, [friendshipId, userId, 'pending']) as [FriendRow[], any];
    if (requests.length === 0) {
        throw new Error('Friend request not found or not pending for this user.');
    }
    const requestToUpdate = requests[0];

    const updateSql = 'UPDATE friends SET status = ?, responded_at = NOW() WHERE friendship_id = ?';
    const [result]: [OkPacket, any] = await pool.query(updateSql, [response, friendshipId]) as [OkPacket, any];

    if (result.affectedRows === 1 || result.changedRows === 1) {
        requestToUpdate.status = response;
        requestToUpdate.responded_at = new Date();
        return requestToUpdate;
    }
    return null;
  }

  async listFriends(userId: string, status: 'accepted' | 'pending' | 'declined' | 'blocked' = 'accepted'): Promise<Partial<Profile>[]> {
    console.log(`[ProfileService-DB] Listing ${status} friends for user ${userId}`);
    // This query is more complex: needs to join with profiles table to get friend's details
    // SELECT p.* FROM profiles p JOIN friends f ON ( (f.user_id_1 = ? AND f.user_id_2 = p.user_id) OR (f.user_id_2 = ? AND f.user_id_1 = p.user_id) ) WHERE f.status = ? AND (f.user_id_1 = ? OR f.user_id_2 = ?)
    // For conceptual simplicity, we'll just fetch IDs from friends table and then conceptually fetch profiles.

    const friendsQuery = `
        SELECT
            CASE
                WHEN user_id_1 = ? THEN user_id_2
                ELSE user_id_1
            END as friend_user_id
        FROM friends
        WHERE (user_id_1 = ? OR user_id_2 = ?) AND status = ?
    `;
    const [friendLinks]: [any[], any] = await pool.query(friendsQuery, [userId, userId, userId, status]) as [any[], any];

    const friendUserIds: string[] = friendLinks.map(link => link.friend_user_id);
    if (friendUserIds.length === 0) return [];

    // Conceptually fetch profiles for these IDs. This would be multiple SELECTs or an IN query.
    // SELECT * FROM profiles WHERE user_id IN (...)
    // For mock, assume we get them.
    const friendProfiles: Partial<Profile>[] = [];
    for (const fid of friendUserIds) {
        const p = await this.getProfile(fid); // Using existing getProfile for mock
        if(p) friendProfiles.push({ userId: p.user_id, username: p.username, avatar_url: p.avatar_url, kyc_status: p.kyc_status /* as Profile['kyc_status'] - temp fix */ });
    }
    return friendProfiles;
  }

  // For test cleanup if needed
  async __clearProfilesAndFriends() {
    // await pool.query("DELETE FROM friends"); // Be careful with this in real tests
    // await pool.query("DELETE FROM profiles");
    console.log("[ProfileService-DB] Conceptual clear of profiles and friends (not actually run in mock).");
  }

  // --- Badge Management Methods ---

  async listUserBadges(userId: string): Promise<UserBadge[]> {
    console.log(`[ProfileService-DB] Listing badges for user: ${userId}`);
    // Query that joins user_badges with badges to get badge details
    const sql = `
      SELECT ub.user_id, ub.badge_id, ub.earned_at, b.name as badge_name, b.icon_url as badge_icon_url, b.description as badge_description
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `;
    const [rows]: [UserBadgeRow[], any] = await pool.query(sql, [userId]) as [UserBadgeRow[], any];
    return rows.map(row => ({
        user_id: row.user_id,
        badge_id: row.badge_id,
        earned_at: new Date(row.earned_at),
        badge_name: row.badge_name,
        badge_icon_url: row.badge_icon_url,
        badge_description: row.badge_description
    }));
  }

  async listAllBadges(): Promise<Badge[]> {
    console.log(`[ProfileService-DB] Listing all available badges`);
    const sql = 'SELECT id, name, description, icon_url, created_at FROM badges ORDER BY name';
    const [rows]: [BadgeRow[], any] = await pool.query(sql) as [BadgeRow[], any];
    return rows.map(row => ({ ...row, created_at: new Date(row.created_at) }));
  }

  async grantBadgeToUser(userId: string, badgeId: string): Promise<UserBadge | null> {
    console.log(`[ProfileService-DB] Granting badge ${badgeId} to user ${userId}`);

    // Check if user already has the badge
    const checkSql = 'SELECT user_id FROM user_badges WHERE user_id = ? AND badge_id = ?';
    const [existing]: [UserBadgeRow[], any] = await pool.query(checkSql, [userId, badgeId]) as [UserBadgeRow[], any];
    if (existing.length > 0) {
      console.log(`[ProfileService-DB] User ${userId} already has badge ${badgeId}.`);
      return existing[0] as UserBadge; // Or throw error, or return null/undefined
    }

    // Check if badge exists
    const badgeCheckSql = 'SELECT id FROM badges WHERE id = ?';
    const [badgeRows]: [BadgeRow[], any] = await pool.query(badgeCheckSql, [badgeId]) as [BadgeRow[], any];
    if (badgeRows.length === 0) {
        throw new Error(`Badge with ID ${badgeId} not found.`);
    }
    // Check if user profile exists (important for FK constraint)
    const profile = await this.getProfile(userId);
    if (!profile) {
        throw new Error(`User profile with ID ${userId} not found. Cannot grant badge.`);
    }

    const earnedAt = new Date();
    const insertSql = 'INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)';
    const [result]: [OkPacket, any] = await pool.query(insertSql, [userId, badgeId, earnedAt]) as [OkPacket, any];

    if (result.affectedRows === 1) {
      return { user_id: userId, badge_id: badgeId, earned_at: earnedAt };
    }
    return null; // Should not happen if checks pass
  }

  async __seedBadges(): Promise<void> { // For conceptual seeding
    console.log('[ProfileService-DB] Seeding initial badges...');
    const badgesToSeed: Badge[] = [
        { id: 'first_game_played', name: 'Welcome Aboard!', description: 'Awarded for playing your first game.', icon_url: '/assets/badges/first_game.png' },
        { id: 'ludo_10_wins', name: 'Ludo Conqueror', description: 'Awarded for winning 10 Ludo games.', icon_url: '/assets/badges/ludo_10_wins.png' },
        { id: 'profile_complete', name: 'Identity Verified', description: 'Awarded for completing your profile (e.g. avatar and bio).', icon_url: '/assets/badges/profile_complete.png' }
    ];

    for (const badge of badgesToSeed) {
        try {
            const checkSql = 'SELECT id FROM badges WHERE id = ?';
            const [existing]: [BadgeRow[], any] = await pool.query(checkSql, [badge.id]) as [BadgeRow[], any];
            if (existing.length === 0) {
                const insertSql = 'INSERT INTO badges (id, name, description, icon_url, created_at) VALUES (?, ?, ?, ?, NOW())';
                await pool.query(insertSql, [badge.id, badge.name, badge.description, badge.icon_url]);
                console.log(`[ProfileService-DB] Seeded badge: ${badge.name}`);
            } else {
                console.log(`[ProfileService-DB] Badge ${badge.name} already exists.`);
            }
        } catch (error: any) {
            console.error(`[ProfileService-DB] Error seeding badge ${badge.name}: ${error.message}`);
        }
    }
  }


  // --- Game History Methods ---

  async addGameHistoryEntry(userId: string, entryData: CreateGameHistoryEntryBody): Promise<GameHistoryEntry> {
    console.log(`[ProfileService-DB] Adding game history for user: ${userId}`);
    const entryId = generateId('gh'); // gh for game_history
    const playedAt = new Date();

    const newEntry: GameHistoryEntry = {
      id: entryId,
      user_id: userId,
      game_id: entryData.game_id,
      game_type: entryData.game_type || 'classic',
      score: entryData.score,
      win_loss_draw: entryData.win_loss_draw,
      played_at: playedAt,
      opponent_id: entryData.opponent_id,
      game_duration_seconds: entryData.game_duration_seconds,
    };

    // Check if user profile exists (important for FK constraint)
    const profile = await this.getProfile(userId);
    if (!profile) {
        throw new Error(`User profile with ID ${userId} not found. Cannot add game history.`);
    }

    const sql = `
      INSERT INTO game_history (id, user_id, game_id, game_type, score, win_loss_draw, played_at, opponent_id, game_duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      newEntry.id, newEntry.user_id, newEntry.game_id, newEntry.game_type, newEntry.score,
      newEntry.win_loss_draw, newEntry.played_at, newEntry.opponent_id || null, newEntry.game_duration_seconds
    ];
    const [result]: [OkPacket, any] = await pool.query(sql, params) as [OkPacket, any];

    if (result.affectedRows !== 1) {
      throw new Error('Failed to add game history entry to database.');
    }

    // Check for "First Game Played" badge
    const historyCountSql = 'SELECT COUNT(id) as game_count FROM game_history WHERE user_id = ?';
    const [countRows]: [any[], any] = await pool.query(historyCountSql, [userId]) as [any[], any];
    const gameCount = countRows[0]?.game_count || 0;

    if (gameCount === 1) {
      try {
        await this.grantBadgeToUser(userId, 'first_game_played');
        console.log(`[ProfileService] Granted 'first_game_played' badge to user ${userId}.`);
      } catch (badgeError: any) {
        console.error(`[ProfileService] Error granting 'first_game_played' badge to ${userId}: ${badgeError.message}`);
        // Non-critical, don't fail the history entry
      }
    }
    return newEntry;
  }

  async listGameHistoryForUser(userId: string, limit: number = 10, offset: number = 0): Promise<GameHistoryEntry[]> {
    console.log(`[ProfileService-DB] Listing game history for user: ${userId}, limit: ${limit}, offset: ${offset}`);
    const sql = `
      SELECT id, user_id, game_id, game_type, score, win_loss_draw, played_at, opponent_id, game_duration_seconds
      FROM game_history
      WHERE user_id = ?
      ORDER BY played_at DESC
      LIMIT ?
      OFFSET ?
    `;
    const [rows]: [GameHistoryRow[], any] = await pool.query(sql, [userId, limit, offset]) as [GameHistoryRow[], any];
    return rows.map(row => ({ ...row, played_at: new Date(row.played_at) }));
  }

  // --- Enriched Profile Method ---
  async getEnrichedUserProfile(userId: string): Promise<EnrichedUserProfile | undefined> {
    const profile = await this.getProfile(userId);
    if (!profile) {
        return undefined;
    }
    const badges = await this.listUserBadges(userId);
    const recentHistory = await this.listGameHistoryForUser(userId, 5); // Get last 5 games

    return {
        ...profile,
        badges,
        recent_history: recentHistory,
        // Daily reward and wheel spin status can also be part of enriched profile
        daily_reward_status: await this.getDailyRewardStatus(userId),
        wheel_spin_status: await this.getWheelSpinStatus(userId),
    };
  }

  // --- Daily Rewards and Engagement Methods ---

  async recordUserLogin(userId: string): Promise<{ currentStreak: number; lastLogin: string; message: string }> {
    await this.createProfileIfNotExists(userId); // Ensure profile exists
    const profile = (await this.getProfile(userId))!; // Should exist now

    const todayStr = getTodayDateString();
    let currentStreak = profile.login_streak_days || 0;
    let message = '';

    if (profile.last_login_date) {
      const lastLoginStr = ensureDate(profile.last_login_date)!.toISOString().split('T')[0];
      const diffDays = calculateDateDifferenceInDays(lastLoginStr, todayStr);

      if (diffDays === 1) { // Consecutive login
        currentStreak++;
        message = `Login streak continued: ${currentStreak} days.`;
      } else if (diffDays > 1) { // Streak broken
        currentStreak = 1; // Reset to 1 for today's login
        message = 'Login streak reset. Welcome back!';
      } else if (diffDays === 0) { // Already logged in today
        message = `Already logged in today. Current streak: ${currentStreak} days.`;
        // No change to streak or last_login_date needed if already logged in today
        return { currentStreak, lastLogin: lastLoginStr, message };
      } else { // diffDays < 0, should not happen if system clock is correct
        console.warn(`[ProfileService] recordUserLogin: last_login_date ${lastLoginStr} is in the future for user ${userId}. Resetting streak.`);
        currentStreak = 1;
        message = 'Login date issue detected, streak reset.';
      }
    } else { // First login ever for tracking purposes
      currentStreak = 1;
      message = 'First login recorded. Streak started!';
    }

    const updateSql = 'UPDATE profiles SET last_login_date = ?, login_streak_days = ?, updated_at = NOW() WHERE user_id = ?';
    await pool.query(updateSql, [todayStr, currentStreak, userId]);

    console.log(`[ProfileService-DB] User ${userId} login recorded. Streak: ${currentStreak}. Last login: ${todayStr}`);
    return { currentStreak, lastLogin: todayStr, message };
  }

  async getDailyRewardStatus(userId: string): Promise<DailyRewardInfo> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('Profile not found.');

    const todayStr = getTodayDateString();
    const currentStreak = profile.login_streak_days || 0;

    // Check if reward for today has already been claimed
    const lastClaimedStr = profile.last_reward_claimed_date ? ensureDate(profile.last_reward_claimed_date)!.toISOString().split('T')[0] : null;

    if (currentStreak === 0) {
        return { is_eligible_to_claim: false, current_streak_day: 0, message: "Log in to start a streak!" };
    }

    if (lastClaimedStr === todayStr) {
      return {
        is_eligible_to_claim: false,
        current_streak_day: currentStreak,
        message: "Reward already claimed today. Come back tomorrow!",
        next_reward_at: getTomorrowDateString()
      };
    }

    // User has an active streak and hasn't claimed today. Find the reward.
    // Streaks might cap at 7 days and then repeat, or have longer cycles.
    // For a 7-day cycle:
    const streakDayForReward = currentStreak > 0 ? ((currentStreak - 1) % 7) + 1 : 0;
    if (streakDayForReward === 0) { // Should be caught by currentStreak === 0, but defensive
         return { is_eligible_to_claim: false, current_streak_day: currentStreak, message: "No active streak." };
    }

    const rewardSql = 'SELECT streak_day, reward_type, reward_value, description, icon_url FROM reward_definitions WHERE streak_day = ?';
    const [rewardRows]: [RewardDefinitionRow[], any] = await pool.query(rewardSql, [streakDayForReward]) as [RewardDefinitionRow[], any];

    if (rewardRows.length === 0) {
      return {
          is_eligible_to_claim: false,
          current_streak_day: currentStreak,
          message: `No reward defined for streak day ${streakDayForReward}.`,
          reward_for_today: null
        };
    }

    return {
      is_eligible_to_claim: true,
      current_streak_day: currentStreak,
      reward_for_today: rewardRows[0],
      message: `Reward available for day ${currentStreak} of your streak!`
    };
  }

  async claimDailyReward(userId: string): Promise<ClaimDailyRewardResponse> {
    const profile = (await this.getProfile(userId))!; // Assume profile exists or createIfNotExists was called
    if (!profile) throw new Error('Profile not found for claiming reward.');

    const rewardStatus = await this.getDailyRewardStatus(userId);
    if (!rewardStatus.is_eligible_to_claim || !rewardStatus.reward_for_today) {
      return { success: false, message: rewardStatus.message || "No reward eligible to claim." };
    }

    const reward = rewardStatus.reward_for_today;
    let actualValueGranted: any = reward.reward_value;
    let grantedMessage = `Claimed: ${reward.description || reward.reward_type}`;

    // --- Simulate Granting Reward (actual granting might involve other services) ---
    let updatedAvailableWheelSpins = profile.available_wheel_spins || 0;

    if (reward.reward_type === 'coins') {
      const amount = parseInt(reward.reward_value, 10);
      // TODO: Call WalletService.addCoins(userId, amount);
      console.log(`[ProfileService] User ${userId} granted ${amount} coins (simulated).`);
      grantedMessage = `You received ${amount} coins!`;
    } else if (reward.reward_type === 'wheel_spin') {
      const spinsToAdd = parseInt(reward.reward_value, 10);
      updatedAvailableWheelSpins += spinsToAdd;
      const updateSpinsSql = 'UPDATE profiles SET available_wheel_spins = ?, updated_at = NOW() WHERE user_id = ?';
      await pool.query(updateSpinsSql, [updatedAvailableWheelSpins, userId]);
      grantedMessage = `You received ${spinsToAdd} wheel spin(s)!`;
    } else {
      // Handle other reward types (power_ups, avatar_items)
      console.log(`[ProfileService] User ${userId} granted ${reward.reward_type}: ${reward.reward_value} (simulated).`);
    }
    // --- End Simulate Granting ---

    const todayStr = getTodayDateString();
    const updateProfileSql = 'UPDATE profiles SET last_reward_claimed_date = ?, updated_at = NOW() WHERE user_id = ?';
    await pool.query(updateProfileSql, [todayStr, userId]);

    return {
      success: true,
      reward_granted: { ...reward, actual_value_granted: actualValueGranted },
      message: grantedMessage,
      updated_profile_fields: {
        last_reward_claimed_date: todayStr,
        login_streak_days: profile.login_streak_days, // Streak itself doesn't change on claim
        available_wheel_spins: reward.reward_type === 'wheel_spin' ? updatedAvailableWheelSpins : undefined
      }
    };
  }

  async __seedRewardDefinitions(): Promise<void> { // Conceptual seeding
    console.log('[ProfileService-DB] Seeding reward definitions...');
    const rewards: RewardDefinition[] = [
        { streak_day: 1, reward_type: 'coins', reward_value: '50', description: '50 Coins', icon_url: '/assets/rewards/coins_50.png' },
        { streak_day: 2, reward_type: 'coins', reward_value: '100', description: '100 Coins', icon_url: '/assets/rewards/coins_100.png' },
        { streak_day: 3, reward_type: 'wheel_spin', reward_value: '1', description: '1 Free Wheel Spin', icon_url: '/assets/rewards/wheel_spin.png' },
        { streak_day: 4, reward_type: 'coins', reward_value: '150', description: '150 Coins', icon_url: '/assets/rewards/coins_150.png' },
        { streak_day: 5, reward_type: 'game_entry_ticket', reward_value: '1_ludo_ticket', description: '1 Ludo Game Ticket', icon_url: '/assets/rewards/ludo_ticket.png' },
        { streak_day: 6, reward_type: 'coins', reward_value: '250', description: '250 Coins', icon_url: '/assets/rewards/coins_250.png' },
        { streak_day: 7, reward_type: 'wheel_spin', reward_value: '2', description: 'Jackpot! 2 Free Wheel Spins', icon_url: '/assets/rewards/wheel_spin_x2.png' },
    ];
    for (const r of rewards) {
        try {
            const checkSql = 'SELECT streak_day FROM reward_definitions WHERE streak_day = ?';
            const [existing]: [any[], any] = await pool.query(checkSql, [r.streak_day]) as [any[], any];
            if (existing.length === 0) {
                const insertSql = 'INSERT INTO reward_definitions (streak_day, reward_type, reward_value, description, icon_url) VALUES (?, ?, ?, ?, ?)';
                await pool.query(insertSql, [r.streak_day, r.reward_type, r.reward_value, r.description, r.icon_url]);
            }
        } catch (error: any) { console.error(`Error seeding reward for day ${r.streak_day}: ${error.message}`); }
    }
  }


  // --- Wheel Spin Methods ---

  async getWheelSpinStatus(userId: string): Promise<WheelSpinStatus> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('Profile not found.');
    // Logic for 'next_free_spin_at' would depend on how free spins are granted (e.g. daily cron)
    // For now, just returning available_spins.
    return { available_spins: profile.available_wheel_spins || 0 };
  }

  async performWheelSpin(userId: string): Promise<WheelSpinResult> {
    const profile = (await this.getProfile(userId))!;
    if (!profile) throw new Error('Profile not found for wheel spin.');

    if ((profile.available_wheel_spins || 0) <= 0) {
      return { success: false, message: "Not enough wheel spins available." };
    }

    // Fetch active prizes and their weights
    const prizeSql = 'SELECT prize_id, prize_type, prize_value, prize_display_name, icon_url, probability_weight, is_jackpot FROM wheel_spin_prizes WHERE is_active = TRUE';
    const [prizes]: [WheelSpinPrizeRow[], any] = await pool.query(prizeSql) as [WheelSpinPrizeRow[], any];
    if (prizes.length === 0) {
      return { success: false, message: "No prizes available for wheel spin at the moment." };
    }

    // Weighted random selection
    let totalWeight = 0;
    for (const prize of prizes) {
      totalWeight += prize.probability_weight;
    }
    let randomNum = Math.random() * totalWeight;
    let selectedPrize: WheelSpinPrize | undefined;
    for (const prize of prizes) {
      if (randomNum < prize.probability_weight) {
        selectedPrize = prize;
        break;
      }
      randomNum -= prize.probability_weight;
    }
    if (!selectedPrize) selectedPrize = prizes[prizes.length - 1]; // Fallback, should not be reached if weights are positive

    // Decrement user's available spins
    const newAvailableSpins = (profile.available_wheel_spins || 0) - 1;
    const updateSpinsSql = 'UPDATE profiles SET available_wheel_spins = ?, last_wheel_spin_date = ?, updated_at = NOW() WHERE user_id = ?';
    await pool.query(updateSpinsSql, [newAvailableSpins, getTodayDateString(), userId]);

    // --- Simulate Granting Prize ---
    if (selectedPrize.prize_type === 'coins') {
      // TODO: Call WalletService.addCoins(userId, parseInt(selectedPrize.prize_value));
      console.log(`[ProfileService] User ${userId} won ${selectedPrize.prize_value} coins from wheel spin (simulated).`);
    } else if (selectedPrize.prize_type === 'badge_id') {
      try {
        await this.grantBadgeToUser(userId, selectedPrize.prize_value);
        console.log(`[ProfileService] User ${userId} won badge ${selectedPrize.prize_value} from wheel spin.`);
      } catch (badgeError: any) {
         console.error(`[ProfileService] Error granting badge ${selectedPrize.prize_value} from wheel spin: ${badgeError.message}`);
      }
    } else {
      console.log(`[ProfileService] User ${userId} won ${selectedPrize.prize_display_name} from wheel spin (simulated).`);
    }
    // --- End Simulate Granting ---

    return {
      success: true,
      prize_won: selectedPrize,
      message: `Congratulations! You won: ${selectedPrize.prize_display_name}`,
      updated_available_spins: newAvailableSpins
    };
  }

  async __seedWheelPrizes(): Promise<void> { // Conceptual seeding
    console.log('[ProfileService-DB] Seeding wheel spin prizes...');
    const prizesData: Omit<WheelSpinPrize, 'prize_id' | 'is_active'>[] = [
        { prize_type: 'coins', prize_value: '10', prize_display_name: '10 Coins', probability_weight: 30, icon_url: '/assets/prizes/coins_10.png' },
        { prize_type: 'coins', prize_value: '25', prize_display_name: '25 Coins', probability_weight: 25, icon_url: '/assets/prizes/coins_25.png' },
        { prize_type: 'coins', prize_value: '50', prize_display_name: '50 Coins', probability_weight: 20, icon_url: '/assets/prizes/coins_50.png' },
        { prize_type: 'coins', prize_value: '100', prize_display_name: '100 Coins', probability_weight: 10, icon_url: '/assets/prizes/coins_100.png' },
        { prize_type: 'game_entry_ticket', prize_value: '1_any_game', prize_display_name: '1 Free Game Ticket', probability_weight: 10, icon_url: '/assets/prizes/ticket.png' },
        { prize_type: 'badge_id', prize_value: 'spinner_luck', prize_display_name: 'Lucky Spinner Badge', probability_weight: 4, icon_url: '/assets/badges/spinner_luck.png' },
        { prize_type: 'coins', prize_value: '500', prize_display_name: '500 Coins Jackpot!', probability_weight: 1, is_jackpot: true, icon_url: '/assets/prizes/coins_500_jackpot.png' },
    ];
    // Ensure 'spinner_luck' badge is defined in __seedBadges or badges table
    // await this.__seedBadges(); // If needed ensure badges are seeded first, or handle FK constraints

    for (const prize of prizesData) {
        const prizeId = `${prize.prize_type}_${prize.prize_value}`.replace(/ /g, '_').toLowerCase();
        try {
            const checkSql = 'SELECT prize_id FROM wheel_spin_prizes WHERE prize_id = ?';
            const [existing]: [any[], any] = await pool.query(checkSql, [prizeId]) as [any[], any];
            if (existing.length === 0) {
                const insertSql = 'INSERT INTO wheel_spin_prizes (prize_id, prize_type, prize_value, prize_display_name, probability_weight, icon_url, is_jackpot, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)';
                await pool.query(insertSql, [prizeId, prize.prize_type, prize.prize_value, prize.prize_display_name, prize.probability_weight, prize.icon_url, prize.is_jackpot || false]);
            }
        } catch (error: any) { console.error(`Error seeding wheel prize ${prize.prize_display_name}: ${error.message}`); }
    }
  }

}
