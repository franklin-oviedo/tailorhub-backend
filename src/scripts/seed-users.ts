import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { Role } from '../common/enums/role.enum';
import { Appointment, AppointmentStatus } from '../entities/appointment.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { Store } from '../entities/store.entity';
import { User } from '../entities/user.entity';

type SeedUserInput = {
  fullName: string;
  email: string;
  role: Role;
};

type SeedContext = {
  store: Store;
  employee: User;
  client: User;
  products: Product[];
};

function ensureLocalExecution(): void {
  const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
  const isProduction = env === 'production';
  const databaseUrl = process.env.DATABASE_URL ?? '';

  const hasRemoteDatabase =
    databaseUrl.length > 0 &&
    !databaseUrl.includes('localhost') &&
    !databaseUrl.includes('127.0.0.1') &&
    !databaseUrl.includes('host.docker.internal');

  if (isProduction || hasRemoteDatabase) {
    throw new Error(
      'This seed is restricted to local development only. Refusing to run in production or with a remote database URL.',
    );
  }
}

async function upsertUser(
  usersRepository: Repository<User>,
  store: Store,
  hashedPassword: string,
  input: SeedUserInput,
): Promise<'created' | 'updated'> {
  const existing = await usersRepository.findOne({ where: { email: input.email } });

  if (existing) {
    existing.fullName = input.fullName;
    existing.role = input.role;
    existing.password = hashedPassword;
    existing.store = store;
    existing.storeId = store.id;
    await usersRepository.save(existing);
    return 'updated';
  }

  const created = usersRepository.create({
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    password: hashedPassword,
    store,
    storeId: store.id,
  });
  await usersRepository.save(created);
  return 'created';
}

async function upsertProduct(
  productsRepository: Repository<Product>,
  store: Store,
  input: Pick<Product, 'name' | 'description' | 'price' | 'isActive'>,
): Promise<Product> {
  const existing = await productsRepository.findOne({
    where: { storeId: store.id, name: input.name },
  });

  if (existing) {
    existing.description = input.description;
    existing.price = input.price;
    existing.isActive = input.isActive;
    return productsRepository.save(existing);
  }

  return productsRepository.save(
    productsRepository.create({
      ...input,
      store,
      storeId: store.id,
    }),
  );
}

async function seedUsers(
  usersRepository: Repository<User>,
  store: Store,
  hashedPassword: string,
): Promise<{ admin: User; employee: User; client: User }> {
  const seedUsersList: SeedUserInput[] = [
    {
      fullName: 'Admin Demo',
      email: 'admin@tailorhub.local',
      role: Role.ADMIN,
    },
    {
      fullName: 'Employee Demo',
      email: 'employee@tailorhub.local',
      role: Role.EMPLOYEE,
    },
    {
      fullName: 'Client Demo',
      email: 'client@tailorhub.local',
      role: Role.CLIENT,
    },
  ];

  for (const seedUser of seedUsersList) {
    const status = await upsertUser(usersRepository, store, hashedPassword, seedUser);
    // eslint-disable-next-line no-console
    console.log(`${status.toUpperCase()} ${seedUser.role}: ${seedUser.email}`);
  }

  const [admin, employee, client] = await Promise.all([
    usersRepository.findOneOrFail({ where: { email: 'admin@tailorhub.local' } }),
    usersRepository.findOneOrFail({ where: { email: 'employee@tailorhub.local' } }),
    usersRepository.findOneOrFail({ where: { email: 'client@tailorhub.local' } }),
  ]);

  return { admin, employee, client };
}

async function seedProducts(
  productsRepository: Repository<Product>,
  store: Store,
): Promise<Product[]> {
  const products = await Promise.all([
    upsertProduct(productsRepository, store, {
      name: 'Traje Clasico Azul',
      description: 'Traje formal azul marino para oficina.',
      price: 199.99,
      isActive: true,
    }),
    upsertProduct(productsRepository, store, {
      name: 'Camisa Blanca Premium',
      description: 'Camisa de algodon para eventos formales.',
      price: 49.5,
      isActive: true,
    }),
    upsertProduct(productsRepository, store, {
      name: 'Chaleco Gris',
      description: 'Chaleco para traje de tres piezas.',
      price: 79,
      isActive: true,
    }),
  ]);

  // eslint-disable-next-line no-console
  console.log(`SEEDED products: ${products.length}`);
  return products;
}

async function seedOrders(
  ordersRepository: Repository<Order>,
  context: SeedContext,
): Promise<Order> {
  const seedOrderMarker = '[SEED_LOCAL_ORDER]';

  const previousOrders = await ordersRepository.find({
    where: { storeId: context.store.id },
  });
  const oldSeedOrders = previousOrders.filter((order) => order.notes?.includes(seedOrderMarker));
  if (oldSeedOrders.length > 0) {
    await ordersRepository.remove(oldSeedOrders);
  }

  const itemA = {
    product: context.products[0],
    productId: context.products[0].id,
    quantity: 1,
    unitPrice: Number(context.products[0].price),
    subtotal: Number(context.products[0].price),
  };
  const itemB = {
    product: context.products[1],
    productId: context.products[1].id,
    quantity: 2,
    unitPrice: Number(context.products[1].price),
    subtotal: Number((Number(context.products[1].price) * 2).toFixed(2)),
  };

  const totalAmount = Number((itemA.subtotal + itemB.subtotal).toFixed(2));

  const order = ordersRepository.create({
    store: context.store,
    storeId: context.store.id,
    customer: context.client,
    customerId: context.client.id,
    employee: context.employee,
    employeeId: context.employee.id,
    status: OrderStatus.PENDING,
    totalAmount,
    notes: `${seedOrderMarker} Pedido demo para pruebas de frontend.`,
    items: [itemA, itemB],
  });

  const savedOrder = await ordersRepository.save(order);
  // eslint-disable-next-line no-console
  console.log(`SEEDED order: ${savedOrder.id}`);
  return savedOrder;
}

async function seedAppointments(
  appointmentsRepository: Repository<Appointment>,
  context: SeedContext,
): Promise<void> {
  const seedAppointmentMarker = '[SEED_LOCAL_APPOINTMENT]';

  const previousAppointments = await appointmentsRepository.find({
    where: { storeId: context.store.id },
  });
  const oldSeedAppointments = previousAppointments.filter((appointment) =>
    appointment.notes?.includes(seedAppointmentMarker),
  );
  if (oldSeedAppointments.length > 0) {
    await appointmentsRepository.remove(oldSeedAppointments);
  }

  const now = new Date();
  const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const appointment = appointmentsRepository.create({
    store: context.store,
    storeId: context.store.id,
    client: context.client,
    clientId: context.client.id,
    employee: context.employee,
    employeeId: context.employee.id,
    startsAt,
    endsAt,
    status: AppointmentStatus.SCHEDULED,
    notes: `${seedAppointmentMarker} Cita demo de ajustes.`,
  });

  const savedAppointment = await appointmentsRepository.save(appointment);
  // eslint-disable-next-line no-console
  console.log(`SEEDED appointment: ${savedAppointment.id}`);
}

async function bootstrap(): Promise<void> {
  ensureLocalExecution();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const storesRepository = app.get<Repository<Store>>(getRepositoryToken(Store));
    const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const productsRepository = app.get<Repository<Product>>(getRepositoryToken(Product));
    const ordersRepository = app.get<Repository<Order>>(getRepositoryToken(Order));
    const appointmentsRepository = app.get<Repository<Appointment>>(
      getRepositoryToken(Appointment),
    );

    const seedPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'TailorHub123!';
    const hashedPassword = await bcrypt.hash(seedPassword, 10);

    const storeEmail = process.env.SEED_STORE_EMAIL ?? 'demo.store@tailorhub.local';
    const storeName = process.env.SEED_STORE_NAME ?? 'TailorHub Demo Store';

    let store = await storesRepository.findOne({ where: { email: storeEmail } });
    if (!store) {
      store = storesRepository.create({
        name: storeName,
        email: storeEmail,
        phone: '+1-555-000-0000',
        address: 'Demo Address',
      });
      store = await storesRepository.save(store);
      // eslint-disable-next-line no-console
      console.log(`Store created: ${store.email} (${store.id})`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`Store found: ${store.email} (${store.id})`);
    }

    const users = await seedUsers(usersRepository, store, hashedPassword);
    const products = await seedProducts(productsRepository, store);

    await seedOrders(ordersRepository, {
      store,
      employee: users.employee,
      client: users.client,
      products,
    });

    await seedAppointments(appointmentsRepository, {
      store,
      employee: users.employee,
      client: users.client,
      products,
    });

    // eslint-disable-next-line no-console
    console.log('Local seed completed successfully for all main tables.');
    // eslint-disable-next-line no-console
    console.log(`Default password: ${seedPassword}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', error);
  process.exit(1);
});
