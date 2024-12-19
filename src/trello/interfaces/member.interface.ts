export interface ITrelloMember {
    id: string;
    activityBlocked: boolean;
    confirmed: boolean;
    fullName: string;
    idPremOrgsAdmin: string[];
    initials: string;
    memberType: string;
    products: string[];
    url: string;
    username: string;
    status: string;
    dateLastImpression: string;
    dateLastActive: string;
    email: string | null;
    idBoards: string[];
    idOrganizations: string[];
}

export interface IBoardMember {
    id: string;
    idMember: string;
    memberType: string;
    unconfirmed: boolean;
    deactivated: boolean;
}
