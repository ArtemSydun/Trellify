import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { CreateUsedTrialDto } from '../dto/create-used-trial.dto';

import { UsedTrial } from '../entities/used-trial.entity';
import { UsedTrialRepository } from '../repositories/used-trial.repository';

@Injectable()
export class UsedTrialService {
  constructor(private readonly usedTrialRepository: UsedTrialRepository) {}

  async createUsedTrial(
    createUsedTrialDto: CreateUsedTrialDto,
  ): Promise<UsedTrial> {
    const usedTrial = await this.usedTrialRepository.findOneByEmail(
      createUsedTrialDto.email,
    );

    if (usedTrial) {
      return usedTrial;
    }

    const newUsedTrial =
      await this.usedTrialRepository.create(createUsedTrialDto);

    return newUsedTrial;
  }

  async findAll(): Promise<UsedTrial[]> {
    return await this.usedTrialRepository.findAllUsedTrials();
  }

  async findUserTrialById(id: string): Promise<UsedTrial> {
    const usedTrial = await this.usedTrialRepository.findOneById(id);

    return usedTrial;
  }

  async findUserTrialByEmail(email: string): Promise<UsedTrial> {
    const usedTrial = await this.usedTrialRepository.findOneByEmail(email);

    return usedTrial;
  }

  async findUserTrialByTrellifyUserId(userId: string): Promise<UsedTrial> {
    const usedTrial =
      await this.usedTrialRepository.findOneByTrellifyUserId(userId);

    return usedTrial;
  }

  async findUsedTrialByTrelloUserId(trelloUserId: string): Promise<UsedTrial> {
    const usedTrial =
      await this.usedTrialRepository.findOneByTrelloUserId(trelloUserId);

    return usedTrial;
  }

  async updateUsedTrialById(
    id: string,
    updateUsedTrialDto: Partial<UsedTrial>,
    i18n?: I18nContext,
  ): Promise<UsedTrial> {
    const usedTrialToDelete = await this.usedTrialRepository.findOneById(id);

    if (!usedTrialToDelete) {
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_USED_TRIAL_NOT_FOUND, {
          args: { trelloUserId: usedTrialToDelete.trelloUserId },
        }) || `Used trial ${id} does not exist`,
      );
    }

    const updatedUsedTrial = await this.usedTrialRepository.updateById(
      usedTrialToDelete.id,
      updateUsedTrialDto,
    );

    return updatedUsedTrial;
  }

  async deleteUserTrialById(
    id: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const usedTrialToDelete = await this.usedTrialRepository.findOneById(id);

    await this.usedTrialRepository.deleteById(usedTrialToDelete.id);

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_USED_TRIAL_DELETED, {
          args: {
            trelloUserId: usedTrialToDelete.trelloUserId,
          },
        }) ||
        `User trial for trello user ${usedTrialToDelete.trelloUserId} deleted successfully`,
      statusCode: HttpStatus.OK,
    };
  }
}
