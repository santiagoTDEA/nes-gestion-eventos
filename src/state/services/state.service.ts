import {
    Injectable,
} from '@nestjs/common';
import { StatusRepository } from '../repositories/state.repository';
import { Status } from '../entities/state.entity';
import { ErrorManager } from '../../utils/error.manager';
import { CreateStatusDto } from '../dto/state.dto';


@Injectable()
export class StatusService {
    constructor(
        private readonly statusRepository: StatusRepository,
    ) { }

    async findAll(): Promise<Status[]> {
        return this.statusRepository.findAll();
    }

    async findById(idStatus: number): Promise<Status> {

        try {
            const status = await this.statusRepository.findById(idStatus);

            if (!status) {
                throw new ErrorManager({
                    type: 'NOT_FOUND',
                    message: `No se encontró el estado con ese ID "${idStatus}"`,
                });
            }

            return status;
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }

    async create(createStatusDto: CreateStatusDto): Promise<Status> {

        try {
            const existingStatus = await this.statusRepository.findByName(
                createStatusDto.statusName,
            );

            if (existingStatus) {

                throw new ErrorManager({
                    type: 'CONFLICT',
                    message: `Ya existe un estado con el nombre "${createStatusDto.statusName}"`,
                });
            }

            const status = new Status();

            status.statusName = createStatusDto.statusName;

            return this.statusRepository.create(status);

        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }



    async remove(idStatus: number): Promise<void> {
        try {
            await this.findById(idStatus);

            await this.statusRepository.delete(idStatus);
        } catch (error) {
            if (error instanceof ErrorManager) {
                ErrorManager.createAsignatureError(error.message);
            }

            throw error;
        }
    }
}