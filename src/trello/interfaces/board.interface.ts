export interface IBoard {
    id: string;
    name: string;
    desc: string;
    closed: boolean;
    dateClosed: string | null;
    pinned: boolean;
    starred: boolean;
    url: string;
    shortLink: string;
    subscribed: boolean;
    dateLastActivity: string;
    dateLastView: string;
    shortUrl: string;
    idMemberCreator: string;
}
