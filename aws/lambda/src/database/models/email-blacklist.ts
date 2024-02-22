import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
} from "sequelize-typescript";

@Table({ tableName: "email_blacklist", underscored: true })
export default class EmailBlacklist extends Model {
  @PrimaryKey
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  recipient!: string;

  @Column({
    type: DataType.DATE,
  })
  // We will never need to access this value in the lambda so I'm leaving it as a string for ease of development
  readonly createdAt!: string;

  @Column({
    type: DataType.DATE,
  })
  // We will never need to access this value in the lambda so I'm leaving it as a string for ease of development
  readonly updatedAt!: string;
}
