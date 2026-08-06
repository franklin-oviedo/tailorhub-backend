import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { CustomerMeasurement } from './customer-measurements.entity';
import { User } from "./user.entity";
import { Appointment } from './appointment.entity';
import { Order } from './order.entity';
import { Store } from "./store.entity";

@Entity('customers')
export class Customers {
    @PrimaryGeneratedColumn('uuid', { name: 'id', comment: 'Unique identifier for the client' })
    id: string;

    @Column({name: 'name', type: 'varchar', length: 255, nullable: false, comment: 'Full name of the client'})
    name: string;

    @Column({name: 'email', type: 'varchar', length: 255, nullable: false, comment: 'Email address of the client'})
    email: string;

    @Column({name: 'phone', type: 'varchar', length: 20, nullable: false, comment: 'Phone number of the client'})
    phone: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp', comment: 'Creation date of the client' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', comment: 'Last update date of the client' })
    updatedAt: Date;

    @OneToOne(() => User, (user) => user.customer, { nullable: false, cascade: true })
    user: User;

    @OneToMany(() => Order, (order) => order.customer, { nullable: true })
    orders: Order[];

    @OneToOne(() => CustomerMeasurement, (measurement) => measurement.customer, { nullable: true, cascade: true })
    measurements: CustomerMeasurement;

    @OneToMany(() => Appointment, (appointment) => appointment.customer, { nullable: true })
    appointments: Appointment[];

    @ManyToOne(() => Store, (store) => store.customers, { nullable: false,  })
    store: Store;
}