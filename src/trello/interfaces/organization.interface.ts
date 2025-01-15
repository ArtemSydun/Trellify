import { IBoardMember } from './member.interface';

export interface IOrganization {
  id: string;
  name: string;
  displayName: string;
  domainName: string;
  idBoards: string[];
  idEnterprise: string | null;
  idEntitlement: string | null;
  idMemberCreator: string;
  membersCount: number;
  url: string;
  website: string | null;
  dateLastActivity: string;
  memberships: IBoardMember[];
}
