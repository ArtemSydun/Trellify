import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { configServiceEnum } from 'src/common/enums/config.service.enum';

describe('Database Connection Test', () => {
    let testingModule: TestingModule;

    beforeAll(async () => {
        testingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot(),
                MongooseModule.forRootAsync({
                    imports: [ConfigModule],
                    useFactory: async (configService: ConfigService) => ({
                        uri: configService.get<string>(configServiceEnum.MONGODB_URI),
                    }),
                    inject: [ConfigService],
                }),
            ],
        }).compile();

        const mongooseConnection = testingModule.get('DatabaseConnection');
        expect(mongooseConnection).toBeDefined();
    });

    afterAll(async () => {
        await testingModule.close(); // Clean up resources and close connections
    });

    it('should connect to the database successfully', async () => {
        const connectionState = testingModule.get('DatabaseConnection').readyState;
        // 1 = connected, 0 = disconnected
        expect(connectionState).toBe(1);
    });
});
