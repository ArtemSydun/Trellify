import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
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
    updateUsedTrialDto: any,
  ): Promise<UsedTrial> {
    const usedTrialToDelete = await this.usedTrialRepository.findOneById(id);

    if (!usedTrialToDelete) {
      throw new NotFoundException(`Used trial ${id} does not exist`);
    }

    const updatedUsedTrial = await this.usedTrialRepository.updateById(
      usedTrialToDelete.id,
      updateUsedTrialDto,
    );

    return updatedUsedTrial;
  }

  async deleteUserTrialById(id: string): Promise<DefaultResponse<null>> {
    const usedTrialToDelete = await this.usedTrialRepository.findOneById(id);

    await this.usedTrialRepository.deleteById(usedTrialToDelete.id);

    return {
      message: `User trial deleted successfully`,
      statusCode: HttpStatus.OK,
    };
  }
}
