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
        Name: u.name,
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

export { UserModel };