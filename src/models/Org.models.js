
const OrgModel = (Org) => {
    return {
        username: Org.username,
        description: Org.description,
        image: Org.image,
        name: Org.name,
        startDate: Org.startDate,
        endDate: Org.endDate,
        claimDate: Org.claimDate,
        shortPrize: Org.shortPrize,
        prizeDescription: Org.prizeDescription,
        firstPrize: Org.firstPrize,
        secondPrize: Org.secondPrize,
        thirdPrize: Org.thirdPrize
    }
};

export { OrgModel };