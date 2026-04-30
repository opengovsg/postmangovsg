import pg from "pg";
import { Sequelize } from "sequelize-typescript";
import EmailBlacklist from "./models/email-blacklist";

const initDatabaseConnection = async (): Promise<void> => {
  const sequelize = new Sequelize({
    dialect: "postgres",
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    define: {
      underscored: true,
      charset: "utf8",
    },
    dialectModule: pg,
    models: [EmailBlacklist],
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });

  try {
    await sequelize.authenticate();
    console.log("Database connection successfully initialised");
  } catch (error) {
    console.log(
      `An error occurred while initializing the database connection. Error: ${error}`,
    );
  }
};

export default initDatabaseConnection;
