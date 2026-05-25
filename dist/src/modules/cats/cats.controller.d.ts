import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';
export declare class CatsController {
    private readonly catsService;
    constructor(catsService: CatsService);
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
    findOne(id: string): string;
    update(id: string, updateCatDto: UpdateCatDto): Promise<string | UpdateCatDto>;
    remove(id: string): string;
}
