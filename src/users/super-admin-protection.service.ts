import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { ModulePermission } from '../common/enums/module-permission.enum';
import { Role } from '../common/enums/role.enum';
import { Employee } from '../entities/employee.entity';
import { Permission } from '../entities/permission.entity';
import { Plan } from '../entities/plan.entity';
import { Store } from '../entities/store.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class SuperAdminProtectionService implements OnApplicationBootstrap {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensurePermissionsAndPlan();
    await this.ensureSuperAdminUser();
    await this.ensureUsersTableDeleteProtection();
  }

  private async ensurePermissionsAndPlan(): Promise<void> {
    const permissionDefinitions: Array<{ name: ModulePermission; description: string }> = [
      { name: ModulePermission.STORES_MANAGE, description: 'Allows managing stores in the platform.' },
      { name: ModulePermission.USERS_MANAGE, description: 'Allows managing users in the store.' },
      { name: ModulePermission.EMPLOYEES_MANAGE, description: 'Allows managing employees in the store.' },
      { name: ModulePermission.SERVICES_MANAGE, description: 'Allows managing services in the store.' },
      { name: ModulePermission.PRODUCTS_MANAGE, description: 'Allows managing products in the store (legacy).' },
      { name: ModulePermission.ORDERS_MANAGE, description: 'Allows managing orders in the store.' },
      { name: ModulePermission.INVOICES_MANAGE, description: 'Allows managing invoices in the store.' },
      { name: ModulePermission.APPOINTMENTS_MANAGE, description: 'Allows managing appointments in the store.' },
      { name: ModulePermission.REPORTS_VIEW, description: 'Allows viewing store reports.' },
      {
        name: ModulePermission.CUSTOMER_MEASUREMENTS_MANAGE,
        description: 'Allows creating and updating customer measurements.',
      },
      {
        name: ModulePermission.CUSTOMER_MEASUREMENTS_VIEW,
        description: 'Allows viewing customer measurements.',
      },
    ];

    const permissions: Permission[] = [];

    for (const definition of permissionDefinitions) {
      const existing = await this.permissionsRepository.findOne({
        where: { name: definition.name },
      });

      if (existing) {
        if (existing.description !== definition.description) {
          existing.description = definition.description;
          permissions.push(await this.permissionsRepository.save(existing));
        } else {
          permissions.push(existing);
        }
        continue;
      }

      permissions.push(
        await this.permissionsRepository.save(
          this.permissionsRepository.create({
            name: definition.name,
            description: definition.description,
          }),
        ),
      );
    }

    const defaultPlanName = process.env.DEFAULT_PLAN_NAME ?? 'TailorHub Professional';
    const defaultEnabledModules = [
      'stores',
      'users',
      'employees',
      'services',
      'products',
      'orders',
      'invoices',
      'appointments',
      'reports',
      'customer_measurements',
    ];

    const existingPlan = await this.plansRepository.findOne({
      where: { name: defaultPlanName },
      relations: ['permissions'],
    });

    if (existingPlan) {
      existingPlan.description = 'Default operational plan with core platform modules enabled.';
      existingPlan.enabledModules = defaultEnabledModules;
      existingPlan.permissions = permissions;
      await this.plansRepository.save(existingPlan);
      return;
    }

    await this.plansRepository.save(
      this.plansRepository.create({
        name: defaultPlanName,
        description: 'Default operational plan with core platform modules enabled.',
        enabledModules: defaultEnabledModules,
        permissions,
      }),
    );
  }

  private async ensureSuperAdminUser(): Promise<void> {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@tailorhub.local';
    const superAdminName = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';
    const superAdminPhone = process.env.SUPER_ADMIN_PHONE ?? '+1 000 000 0000';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'TailorHub123!';
    const defaultStoreName = process.env.SUPER_ADMIN_STORE_NAME ?? 'TailorHub HQ';
    const defaultStoreEmail = process.env.SUPER_ADMIN_STORE_EMAIL ?? 'hq@tailorhub.local';
    const defaultStorePhone = process.env.SUPER_ADMIN_STORE_PHONE ?? '+1 000 000 0001';
    const defaultStoreAddress = process.env.SUPER_ADMIN_STORE_ADDRESS ?? 'Main office';

    let store = await this.storesRepository.findOne({
      where: [{ email: defaultStoreEmail }, { name: defaultStoreName }],
    });

    if (!store) {
      store = this.storesRepository.create({
        name: defaultStoreName,
        email: defaultStoreEmail,
        phone: defaultStorePhone,
        address: defaultStoreAddress,
      });
      store = await this.storesRepository.save(store);
    }

    let employee = await this.employeesRepository.findOne({
      where: {
        email: superAdminEmail,
        store: { id: store.id },
      },
      relations: ['store'],
    });

    if (!employee) {
      employee = this.employeesRepository.create({
        name: superAdminName,
        email: superAdminEmail,
        phone: superAdminPhone,
        active: true,
        notes: 'System protected super admin account.',
        store: { id: store.id },
      });
      employee = await this.employeesRepository.save(employee);
    }

    let superAdminUser = await this.usersRepository.findOne({
      where: { role: Role.SUPER_ADMIN },
      relations: ['store', 'employee'],
    });

    if (!superAdminUser) {
      superAdminUser = await this.usersRepository.findOne({
        where: { employee: { id: employee.id } },
        relations: ['store', 'employee'],
      });
    }

    if (!superAdminUser) {
      superAdminUser = this.usersRepository.create({
        role: Role.SUPER_ADMIN,
        isActive: true,
        password: await bcrypt.hash(superAdminPassword, 12),
        store: { id: store.id },
        employee: { id: employee.id },
      });
      await this.usersRepository.save(superAdminUser);
      return;
    }

    let changed = false;

    if (superAdminUser.role !== Role.SUPER_ADMIN) {
      superAdminUser.role = Role.SUPER_ADMIN;
      changed = true;
    }

    if (!superAdminUser.store || superAdminUser.store.id !== store.id) {
      superAdminUser.store = { id: store.id } as User['store'];
      changed = true;
    }

    if (!superAdminUser.employee || superAdminUser.employee.id !== employee.id) {
      superAdminUser.employee = { id: employee.id } as User['employee'];
      changed = true;
    }

    if (superAdminUser.isActive === false) {
      superAdminUser.isActive = true;
      changed = true;
    }

    if (employee.active === false) {
      employee.active = true;
      await this.employeesRepository.save(employee);
    }

    if (changed) {
      await this.usersRepository.save(superAdminUser);
    }
  }

  private async ensureUsersTableDeleteProtection(): Promise<void> {
    if (this.dataSource.options.type !== 'postgres') {
      return;
    }

    await this.dataSource.query(`
      CREATE OR REPLACE FUNCTION prevent_super_admin_delete()
      RETURNS trigger AS $$
      BEGIN
        IF OLD.role::text = 'super_admin' THEN
          RAISE EXCEPTION 'Super admin user cannot be deleted.';
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION prevent_critical_table_truncate()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'TRUNCATE is disabled on critical table: %.', TG_TABLE_NAME;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_prevent_super_admin_delete ON users;
      CREATE TRIGGER trg_prevent_super_admin_delete
      BEFORE DELETE ON users
      FOR EACH ROW
      EXECUTE FUNCTION prevent_super_admin_delete();

      DROP TRIGGER IF EXISTS trg_prevent_users_truncate ON users;
      CREATE TRIGGER trg_prevent_users_truncate
      BEFORE TRUNCATE ON users
      FOR EACH STATEMENT
      EXECUTE FUNCTION prevent_critical_table_truncate();

      DROP TRIGGER IF EXISTS trg_prevent_plans_truncate ON plans;
      CREATE TRIGGER trg_prevent_plans_truncate
      BEFORE TRUNCATE ON plans
      FOR EACH STATEMENT
      EXECUTE FUNCTION prevent_critical_table_truncate();

      DROP TRIGGER IF EXISTS trg_prevent_permissions_truncate ON permissions;
      CREATE TRIGGER trg_prevent_permissions_truncate
      BEFORE TRUNCATE ON permissions
      FOR EACH STATEMENT
      EXECUTE FUNCTION prevent_critical_table_truncate();

      DROP TRIGGER IF EXISTS trg_prevent_plan_permissions_truncate ON plan_permissions;
      CREATE TRIGGER trg_prevent_plan_permissions_truncate
      BEFORE TRUNCATE ON plan_permissions
      FOR EACH STATEMENT
      EXECUTE FUNCTION prevent_critical_table_truncate();
    `);
  }
}
