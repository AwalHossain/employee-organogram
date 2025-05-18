import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('employees')
export class EmployeeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 150 })
  position: string;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.subordinates, {
    nullable: true,
  })
  @JoinColumn({ name: 'manager_id' })
  manager: EmployeeEntity;

  @OneToMany(() => EmployeeEntity, (employee) => employee.manager)
  subordinates: EmployeeEntity[];

  @Column({ name: 'manager_id', nullable: true })
  managerId: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    name: 'created_at',
    type: 'varchar',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'varchar',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
