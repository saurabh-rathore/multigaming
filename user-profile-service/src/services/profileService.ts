import { Profile, UpdateProfileRequestBody, KycUpdateRequestBody, Friend } from '../types/profile.types'; // Assuming Friend type is here
import { generateId, ensureDate } from '../utils/helpers'; // ensureDate might be less relevant with DB handling dates
import pool from '../config/db.config'; // Import the conceptual MySQL pool for UserProfile

// Define a type for what a profile row from the DB might look like
type ProfileRow = Profile & { [key: string]: any }; // Allow for other DB fields
type FriendRow = Friend & { [key: string]: any };   // For friend operations

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
    return this.getProfile(userId); // Re-fetch to get the updated profile with new updated_at
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
}
