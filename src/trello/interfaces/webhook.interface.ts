export interface WebhookInterface {
    id: string;
    description: string;
    idModel: string;
    callbackURL: string;
    active: boolean;
    consecutiveFailures: number;
    firstConsecutiveFailDate: string;
}
