"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable(
      'users',
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        createdAt: {
          type: DataTypes.DATE
        },
        updatedAt: {
          type: DataTypes.DATE
        },
        username: { type: DataTypes.STRING, allowNull: false },
        first_name: {type: DataTypes.STRING, allowNull: false },
        last_name: {type: DataTypes.STRING, allowNull: false },
	password: {type: DataTypes.STRING, allowNull: false },

      }
);
    done();
  },

  down: function(migration, DataTypes, done) {
    migration.dropTable('users');    
    done();
  }
};
