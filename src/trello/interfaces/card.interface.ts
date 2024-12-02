export interface ITrelloCard {
    id: string;
    badges: {
        externalSource: null | string;
        subscribed: boolean;
        attachments: number;
        checkItems: number;
        checkItemsChecked: number;
        comments: number;
        description: boolean;
        due: string;
        dueComplete: boolean;
        start: string;
    };
    closed: boolean;
    dueComplete: boolean;
    dateLastActivity: string;
    desc: string;
    due: string;
    dueReminder: number;
    idBoard: string;
    idList: string;
    idMembers: string[];
    name: string;
    shortUrl: string;
    shortLink: string;
    subscribed: boolean;
    url: string;
    start: string;
}
