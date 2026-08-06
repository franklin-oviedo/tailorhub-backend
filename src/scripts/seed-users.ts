/*import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import { ModulePermission } from '../common/enums/module-permission.enum';
import { Role } from '../common/enums/role.enum';
import { Appointment, AppointmentStatus } from '../entities/appointment.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { Permission } from '../entities/permission.entity';
import { Plan } from '../entities/plan.entity';
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
): Promise<{ superAdmin: User; manager: User; employee: User; client: User }> {
  const seedUsersList: SeedUserInput[] = [
    {
      fullName: 'Super Admin Demo',
      email: 'superadmin@tailorhub.local',
      role: Role.SUPER_ADMIN,
    },
    {
      fullName: 'Manager Demo',
      email: 'manager@tailorhub.local',
      role: Role.MANAGER,
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

  const [superAdmin, manager, employee, client] = await Promise.all([
    usersRepository.findOneOrFail({ where: { email: 'superadmin@tailorhub.local' } }),
    usersRepository.findOneOrFail({ where: { email: 'manager@tailorhub.local' } }),
    usersRepository.findOneOrFail({ where: { email: 'employee@tailorhub.local' } }),
    usersRepository.findOneOrFail({ where: { email: 'client@tailorhub.local' } }),
  ]);

  return { superAdmin, manager, employee, client };
}

async function seedPermissionsAndPlan(
  permissionsRepository: Repository<Permission>,
  plansRepository: Repository<Plan>,
): Promise<Plan> {
  const permissionInputs = [
    {
      name: ModulePermission.USERS_MANAGE,
      description: 'Allows managing users in the store.',
    },
    {
      name: ModulePermission.PRODUCTS_MANAGE,
      description: 'Allows managing products in the store.',
    },
    {
      name: ModulePermission.ORDERS_MANAGE,
      description: 'Allows managing orders in the store.',
    },
    {
      name: ModulePermission.APPOINTMENTS_MANAGE,
      description: 'Allows managing appointments in the store.',
    },
    {
      name: ModulePermission.REPORTS_VIEW,
      description: 'Allows viewing reports in the store.',
    },
  ];

  const permissions: Permission[] = [];

  for (const input of permissionInputs) {
    const existing = await permissionsRepository.findOne({ where: { name: input.name } });
    if (existing) {
      existing.description = input.description;
      permissions.push(await permissionsRepository.save(existing));
    } else {
      permissions.push(await permissionsRepository.save(permissionsRepository.create(input)));
    }
  }

  const planName = process.env.SEED_PLAN_NAME ?? 'TailorHub Professional';
  const existingPlan = await plansRepository.findOne({
    where: { name: planName },
    relations: ['permissions'],
  });

  if (existingPlan) {
    existingPlan.description = 'Plan demo con modulos operativos habilitados.';
    existingPlan.enabledModules = ['users', 'products', 'orders', 'appointments', 'reports'];
    existingPlan.permissions = permissions;
    const updated = await plansRepository.save(existingPlan);
    // eslint-disable-next-line no-console
    console.log(`Plan updated: ${updated.name} (${updated.id})`);
    return updated;
  }

  const created = await plansRepository.save(
    plansRepository.create({
      name: planName,
      description: 'Plan demo con modulos operativos habilitados.',
      enabledModules: ['users', 'products', 'orders', 'appointments', 'reports'],
      permissions,
    }),
  );
  // eslint-disable-next-line no-console
  console.log(`Plan created: ${created.name} (${created.id})`);
  return created;
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
): Promise<Order[]> {
  const seedOrderMarker = '[SEED_LOCAL_ORDER]';

  const previousOrders = await ordersRepository.find({
    where: { storeId: context.store.id },
  });
  const oldSeedOrders = previousOrders.filter((order) => order.notes?.includes(seedOrderMarker));
  if (oldSeedOrders.length > 0) {
    await ordersRepository.remove(oldSeedOrders);
  }

  const buildItem = (product: Product, quantity: number) => {
    const unitPrice = Number(product.price);
    return {
      product,
      productId: product.id,
      quantity,
      unitPrice,
      subtotal: Number((unitPrice * quantity).toFixed(2)),
    };
  };

  const orderInputs: Array<{ status: OrderStatus; notes: string; items: Array<{ product: Product; quantity: number }> }> = [
    {
      status: OrderStatus.PENDING,
      notes: `${seedOrderMarker} Pedido pendiente para pruebas de frontend.`,
      items: [
        { product: context.products[0], quantity: 1 },
        { product: context.products[1], quantity: 2 },
      ],
    },
    {
      status: OrderStatus.IN_PROGRESS,
      notes: `${seedOrderMarker} Pedido en proceso para tablero de manager.`,
      items: [{ product: context.products[2], quantity: 1 }],
    },
    {
      status: OrderStatus.COMPLETED,
      notes: `${seedOrderMarker} Pedido completado para historico.`,
      items: [{ product: context.products[1], quantity: 1 }],
    },
  ];

  const savedOrders: Order[] = [];

  for (const input of orderInputs) {
    const items = input.items.map((item) => buildItem(item.product, item.quantity));
    const totalAmount = Number(
      items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2),
    );

    const order = ordersRepository.create({
      store: context.store,
      storeId: context.store.id,
      customer: context.client,
      customerId: context.client.id,
      employee: context.employee,
      employeeId: context.employee.id,
      status: input.status,
      totalAmount,
      notes: input.notes,
      items,
    });

    savedOrders.push(await ordersRepository.save(order));
  }

  // eslint-disable-next-line no-console
  console.log(`SEEDED orders: ${savedOrders.length}`);
  return savedOrders;
}

async function seedAppointments(
  appointmentsRepository: Repository<Appointment>,
  context: SeedContext,
): Promise<Appointment[]> {
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
  const appointmentInputs = [
    {
      dayOffset: 1,
      status: AppointmentStatus.SCHEDULED,
      notes: `${seedAppointmentMarker} Cita agendada para primera prueba.`,
    },
    {
      dayOffset: 3,
      status: AppointmentStatus.CONFIRMED,
      notes: `${seedAppointmentMarker} Cita confirmada para ajuste intermedio.`,
    },
    {
      dayOffset: -2,
      status: AppointmentStatus.COMPLETED,
      notes: `${seedAppointmentMarker} Cita completada de entrega.`,
    },
  ];

  const savedAppointments: Appointment[] = [];

  for (const input of appointmentInputs) {
    const startsAt = new Date(now.getTime() + input.dayOffset * 24 * 60 * 60 * 1000);
    startsAt.setHours(10, 0, 0, 0);
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
      status: input.status,
      notes: input.notes,
    });

    savedAppointments.push(await appointmentsRepository.save(appointment));
  }

  // eslint-disable-next-line no-console
  console.log(`SEEDED appointments: ${savedAppointments.length}`);
  return savedAppointments;
}

async function bootstrap(): Promise<void> {
  ensureLocalExecution();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get<DataSource>(DataSource);
    await dataSource.synchronize();

    const storesRepository = app.get<Repository<Store>>(getRepositoryToken(Store));
    const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const productsRepository = app.get<Repository<Product>>(getRepositoryToken(Product));
    const ordersRepository = app.get<Repository<Order>>(getRepositoryToken(Order));
    const appointmentsRepository = app.get<Repository<Appointment>>(
      getRepositoryToken(Appointment),
    );
    const permissionsRepository = app.get<Repository<Permission>>(getRepositoryToken(Permission));
    const plansRepository = app.get<Repository<Plan>>(getRepositoryToken(Plan));

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

    const plan = await seedPermissionsAndPlan(permissionsRepository, plansRepository);

    const users = await seedUsers(usersRepository, store, hashedPassword);
    store.manager = users.manager;
    store.managerId = users.manager.id;
    store.plan = plan;
    store.planId = plan.id;
    store = await storesRepository.save(store);

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
});*/
