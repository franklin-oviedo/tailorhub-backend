import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Store } from '../entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ListStoresQueryDto } from './dto/list-stores-query.dto';
import { PaginatedResult } from '../common/types/paginated-result.type';
import { UserInvitationService } from '../users/user-invitation.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { CreateUserInvitationDto } from '../users/dto/create-user-invitation.dto';

@Injectable()
export class StoresService {
  /* c8 ignore start */
  constructor(
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    private readonly configService: ConfigService,
    private readonly userInvitationService: UserInvitationService,
  ) {}
  /* c8 ignore stop */
  private withNormalizedStoreMedia(store: Store): Store {
    return {
      ...store,
      logo: store.logo ?? null,
      seal: store.seal ?? null,
    };
  }

  private toSafeStoreFileBaseName(storeName: string): string {
    const baseName = storeName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return baseName.length > 0 ? baseName : 'store';
  }

  private resolveFileExtension(mimetype: string): string {
    const rawExtension = mimetype.split('/')[1] ?? 'png';
    return rawExtension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
  }

  private toStoreLogoPath(storeName: string, mimetype: string): string {
    const safeBaseName = this.toSafeStoreFileBaseName(storeName);
    const extension = this.resolveFileExtension(mimetype);
    return `tailor-logs/${safeBaseName}-logo.${extension}`;
  }

  private toStoreSealPath(storeName: string, mimetype: string): string {
    const safeBaseName = this.toSafeStoreFileBaseName(storeName);
    const extension = this.resolveFileExtension(mimetype);
    return `tailorhub-seals/${safeBaseName}-seal.${extension}`;
  }

  private buildSupabaseClient(): SupabaseClient {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new BadRequestException(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for media uploads.',
      );
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  async create(createStoreDto: CreateStoreDto, actor: JwtPayload): Promise<Store> {
    const existingStore = await this.storesRepository.findOne({
      where: [
        { phone: createStoreDto.phone },
        { email: createStoreDto.email },
      ],
    });

    if (existingStore) {
      throw new BadRequestException('A store with that phone already exists.');
    }

    const store = this.storesRepository.create(createStoreDto);
    const savedStore = await this.storesRepository.save(store);

    if (createStoreDto.managerId) {
      await this.userInvitationService.assignManagerToStore(
        actor,
        savedStore.id,
        createStoreDto.managerId,
      );
    }

    return this.withNormalizedStoreMedia(savedStore);
  }

  async findAll(query: ListStoresQueryDto): Promise<PaginatedResult<Store>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.storesRepository.createQueryBuilder('store');

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere('(store.name ILIKE :search OR store.email ILIKE :search)', {
        search: searchPattern,
      });
    }

    qb.orderBy('store.createdAt', 'DESC').skip(skip).take(limit);

    const [data, totalItems] = await qb.getManyAndCount();
    const normalizedData = data.map((store) => this.withNormalizedStoreMedia(store));

    return {
      data: normalizedData,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findOne(id: string): Promise<Store> {
    const store = await this.storesRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException('Store not found.');
    }
    return this.withNormalizedStoreMedia(store);
  }

  async update(id: string, updateStoreDto: UpdateStoreDto): Promise<Store> {
    const store = await this.findOne(id);

    if (updateStoreDto.email && updateStoreDto.email !== store.email || updateStoreDto.phone && updateStoreDto.phone !== store.phone) {
      const existingStore = await this.storesRepository.findOne({
        where: [
          { email: updateStoreDto.email },
          { phone: updateStoreDto.phone },
        ],
      });

      if (existingStore) {
        if (existingStore.email === updateStoreDto.email) {
          throw new BadRequestException('A store with that email already exists.');
        }
        if (existingStore.phone === updateStoreDto.phone) {
          throw new BadRequestException('A store with that phone already exists.');
        }
      }
    }

    Object.assign(store, updateStoreDto);
    const updatedStore = await this.storesRepository.save(store);
    return this.withNormalizedStoreMedia(updatedStore); 
  }

  async uploadLogo(id: string, file: Express.Multer.File): Promise<Store> {
    if (!file) {
      throw new BadRequestException('Logo file is required.');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Logo file must be an image.');
    }

    const store = await this.findOne(id);
    const supabaseBucket = this.configService.get<string>('SUPABASE_STORAGE_BUCKET');

    if (!supabaseBucket) {
      throw new BadRequestException('SUPABASE_STORAGE_BUCKET must be configured for logo uploads.');
    }

    const supabase = this.buildSupabaseClient();
    const filePath = this.toStoreLogoPath(store.name, file.mimetype);

    const { error } = await supabase.storage
      .from(supabaseBucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(`Unable to upload logo: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(supabaseBucket).getPublicUrl(filePath);

    store.logo = publicUrl;
    const savedStore = await this.storesRepository.save(store);
    return this.withNormalizedStoreMedia(savedStore);
  }

  async remove(id: string): Promise<void> {
    const store = await this.findOne(id);
    await this.storesRepository.remove(store);
  }

  async uploadSeal(id: string, file: Express.Multer.File): Promise<Store> {
    if (!file) {
      throw new BadRequestException('Seal file is required.');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Seal file must be an image.');
    }

    const store = await this.findOne(id);
    const supabaseBucket = this.configService.get<string>('SUPABASE_STORAGE_BUCKET');

    if (!supabaseBucket) {
      throw new BadRequestException('SUPABASE_STORAGE_BUCKET must be configured for seal uploads.');
    }

    const supabase = this.buildSupabaseClient();
    const filePath = this.toStoreSealPath(store.name, file.mimetype);

    const { error } = await supabase.storage
      .from(supabaseBucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(`Unable to upload seal: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(supabaseBucket).getPublicUrl(filePath);

    store.seal = publicUrl;
    const savedStore = await this.storesRepository.save(store);
    return this.withNormalizedStoreMedia(savedStore);
  }

  async createManagerInvitation(
    storeId: string,
    dto: CreateUserInvitationDto,
    actor: JwtPayload,
  ) {
    return this.userInvitationService.createManagerInvitation(actor, storeId, dto);
  }
}
