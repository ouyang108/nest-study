import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';
import { UserService } from "../user/user.service";
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { Cache } from 'cache-manager';
export declare class CatsService {
    private readonly userService;
    private readonly configService;
    private readonly primas;
    private readonly cacheManager;
    constructor(userService: UserService, configService: ConfigService, primas: PrismaService, cacheManager: Cache);
    create(createCatDto: CreateCatDto): string;
    findAll(): Promise<{
        data: {
            msg: string;
            users: string;
            message: string | undefined;
            DATABASE_URL: string | undefined;
            xyz_shared_key_123: string | undefined;
            result: {
                id: number;
                email: string;
                name: string | null;
                age: number | null;
            }[];
        };
    }>;
    findOne(id: number): string;
    update(id: number, updateCatDto: UpdateCatDto): Promise<string | UpdateCatDto>;
    remove(id: number): string;
}
