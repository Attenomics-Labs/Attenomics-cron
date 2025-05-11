/** Map raw API tweet object to our internal shape */
//creating Model for Users
const UserModel = (u) => {
    let profileurl = null;
    console.log(u['profilePicture']);
    if (u['profilePicture']) {
        profileurl = u.profilePicture.replace("normal", "400x400");
    }
    return {
        UserId: u.id,
        name: u.name,
        username: u.userName,
        location: u.location,
        Bio: u.description,
        protected: u.protected,
        isVerified: u.isVerified,
        isBlueVerified: u.isBlueVerified,
        createdAt: u.createdAt,
        profilePicture: profileurl,
        isCreator: u.isCreator ?? false,
        attentionPoint: u.attentionPoint ?? 0,
        isNewUser: u.isNewUser ?? true,
    };
}

const insertQuery = `
            INSERT INTO users (
              user_id, username, name, bio, profile_picture_url,
              created_at, attention_point, ranks, is_verified,
              is_blocked, is_blue_verified, is_new_user,
              is_creator, protected, location
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            )
            ON CONFLICT (user_id) DO UPDATE SET
              username = EXCLUDED.username,
              name = EXCLUDED.name,
              bio = EXCLUDED.bio,
              profile_picture_url = EXCLUDED.profile_picture_url,
              created_at = EXCLUDED.created_at,
              attention_point = EXCLUDED.attention_point,
              ranks = EXCLUDED.ranks,
              is_verified = EXCLUDED.is_verified,
              is_blocked = EXCLUDED.is_blocked,
              is_blue_verified = EXCLUDED.is_blue_verified,
              is_new_user = EXCLUDED.is_new_user,
              is_creator = EXCLUDED.is_creator,
              protected = EXCLUDED.protected,
              location = EXCLUDED.location;
          `;

const createusersquery = `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    bio TEXT,
    profile_picture_url TEXT,
    created_at TIMESTAMP,
    attention_point DECIMAL(10,2),
    ranks DECIMAL(10,2),
    is_verified BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_blue_verified BOOLEAN DEFAULT FALSE,
    is_new_user BOOLEAN DEFAULT FALSE,
    is_creator BOOLEAN DEFAULT FALSE,
    protected BOOLEAN DEFAULT FALSE,
    location VARCHAR(255)
);`;

export { UserModel, createusersquery, insertQuery };