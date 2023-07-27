"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Model = void 0;
const mysql2_1 = __importDefault(require("mysql2"));
const moment_1 = __importDefault(require("moment"));
let connection;
class AxoltDatabaseParent {
    store;
    primaryKey;
    constructor(tableName = "") {
        this.store = {
            tableName,
            sql: `SELECT * FROM _TABLE_`,
            sqlDefault: `SELECT * FROM _TABLE_`,
            values: [],
            order: []
        };
        this.primaryKey = "id";
    }
    async query(sql = "") {
        return new Promise((res, rej) => {
            try {
                connection.getConnection((err, _connection) => {
                    if (err) {
                        console.log("Khong the ket noi");
                        rej(err);
                    }
                    if (this.store.order.length > 0) {
                        this.store.sql += ` ORDER BY ${this.store.order.map((i) => `\`${i.field}\` ${i.order}`).join(", ")}`;
                    }
                    if (this.store.limit) {
                        this.store.sql += ` LIMIT ${this.store.limit}` + (this.store.offset ? ` OFFSET ${this.store.offset}` : ``);
                    }
                    try {
                        _connection.query(sql ? sql : this.store.sql, sql ? [] : this.store.values, (error, result) => {
                            if (sql === "") {
                                this.store = {
                                    ...this.store,
                                    sql: `SELECT * FROM _TABLE_`,
                                    values: [],
                                    order: [],
                                    limit: undefined,
                                    offset: undefined
                                };
                            }
                            error && rej(error);
                            res({ data: result, empty: result?.length !== undefined ? result.length === 0 : false });
                        });
                    }
                    catch (ex) {
                        rej(ex);
                    }
                });
            }
            catch (ex) {
                rej(ex);
            }
        });
    }
    setTable() {
        this.store.sql = this.store.sql.replace("_TABLE_", this.store.tableName);
        return this;
    }
    async execute(sql = "") {
        this.setTable();
        const response = await this.query(sql);
        if (this.constructor.name !== "AxoltDatabaseParent" && this.constructor.name !== "Model") {
            const [_, ...listMethod] = Object.getOwnPropertyNames(this.constructor.prototype);
            for (let obj of response.data) {
                for (const method of listMethod) {
                    const _method = this[method]()(obj);
                    obj = Object.assign(obj, { [method]: _method });
                }
            }
        }
        return this.currentTimeFixed(response);
    }
    currentTimeFixed(result) {
        const fixed = (data) => {
            const format = "YYYY-MM-DD HH:mm:ss";
            if ("created_at" in data) {
                data["created_at"] = (0, moment_1.default)(data["created_at"]).format(format);
            }
            if ("updated_at" in data) {
                data["updated_at"] = (0, moment_1.default)(data["updated_at"]).format(format);
            }
            return data;
        };
        result.data = result.data.map(i => fixed(i));
        return result;
    }
    async get(fields = []) {
        if (fields.length > 0)
            this.store.sql = this.store.sql.replace("*", fields.join(", "));
        return await this.execute();
    }
    async first(fields = []) {
        if (fields.length > 0)
            this.store.sql = this.store.sql.replace("*", fields.join(", "));
        this.store.limit = 1;
        const response = await this.execute();
        const result = {
            ...response,
            data: !response.empty ? response.data[0] : {}
        };
        return result;
    }
    take(number) {
        this.store.limit = number;
        return this;
    }
    async insert(data) {
        this.store.sql = `INSERT INTO _TABLE_(_FIELDS_) VALUES(_VALUES_)`;
        const listField = Object.keys(data);
        const listValue = listField.map(field => data[field]);
        this.store.sql = this.store.sql.replace("_FIELDS_", listField.map(field => `\`${field}\``).join(", "));
        this.store.sql = this.store.sql.replace("_VALUES_", Array(listField.length).fill("?").join(", "));
        this.store.values = [...this.store.values, ...listValue];
        this.setTable();
        const response = await this.query()
            .then(data => (data.data))
            .then(async (data) => ({
            header: data,
            data: (await this.where("id", data.insertId).first()).data
        }));
        return response;
    }
    async insertMany(data) {
        this.store.sql = `INSERT INTO _TABLE_(_FIELDS_) VALUES(_VALUES_)`;
        const values = data.map(i => `(${Array(Object.keys(i).length).fill("?").join(", ")})`).join(", ");
        this.store.sql = this.store.sql
            .replace("_FIELDS_", Object.keys(data[0]).join(", "))
            .replace("(_VALUES_)", values);
        for (const result of data) {
            const keys = Object.keys(result);
            this.store.values.push(keys.map(key => result[key]).join(", "));
        }
        this.store.values = this.store.values.flatMap(value => value.split(", "));
        this.setTable();
        const response = await this.query()
            .then(data => (data.data))
            .then(async (data) => ({
            header: data
        }));
        return response;
    }
    async update(data, all = false) {
        try {
            if (!this.store.sql.toLowerCase().includes("where") && !all) {
                console.log("Error: In case you want to update all, change the second argument to true.");
                return false;
            }
            this.store.sql = this.store.sql.replace("SELECT * FROM _TABLE_", "UPDATE _TABLE_ SET _FIELDS_VALUES_");
            const listField = Object.keys(data);
            const listValue = listField.map(field => data[field]);
            this.store.sql = this.store.sql.replace("_FIELDS_VALUES_", listField.map(field => `\`${field}\` = ?`).join(", "));
            this.store.values = [...listValue, ...this.store.values];
            this.setTable();
            const response = await this.query()
                .then(data => (data.data))
                .then(async (data) => ({
                header: data
            }));
            return response.header.affectedRows > 0;
        }
        catch (_) {
            return false;
        }
    }
    async delete(all = false) {
        if (!this.store.sql.toLowerCase().includes("where") && !all) {
            console.log("Error: In case you want to update all, change delete() to delete(true).");
            return false;
        }
        this.store.sql = this.store.sql.replace("SELECT * FROM _TABLE_", "DELETE FROM _TABLE_");
        this.setTable();
        const response = await this.query()
            .then(data => (data.data))
            .then(async (data) => ({
            header: data
        }));
        return response.header.affectedRows > 0;
    }
    async firstOrCreate(find, insert) {
        this.store.sql = this.store.sqlDefault;
        const listKey = Object.keys(find);
        for (const key of listKey) {
            this.orWhere(key, find[key]);
        }
        const first = await this.first();
        const result = {
            wasCreated: !first.empty,
            data: first.empty ? (await this.insert(insert === undefined ? find : insert)).data : first.data
        };
        return result;
    }
    async firstOrNew(find, insert) {
        this.store.sql = this.store.sqlDefault;
        const listKey = Object.keys(find);
        for (const key of listKey) {
            this.orWhere(key, find[key]);
        }
        const first = await this.first();
        if (!first.empty) {
            return {
                wasCreated: true,
                data: first.data,
                save: () => { }
            };
        }
        const store = {
            ...find,
            ...(insert !== undefined ? insert : {})
        };
        const save = (data) => {
            const model = new Model(this.store.tableName);
            return () => model.insert(data);
        };
        return {
            wasCreated: false,
            data: store,
            save: save(store).bind(this)
        };
    }
    orderBy(field, order = "ASC") {
        this.store.order?.push({ field, order });
        return this;
    }
    orderByDesc(field) {
        return this.orderBy(field, "DESC");
    }
    whereArray(field, compare, values, condition = "AND") {
        values.forEach(value => {
            const wh = this.store.sql.includes('WHERE') ? condition : 'WHERE';
            this.store.sql += ` ${wh} \`${field}\` ${compare} ?`;
            this.store.values.push(value);
        });
        return this;
    }
    whereCondition(field, compare, value, condition = "AND") {
        const wh = this.store.sql.includes('WHERE') ? condition : 'WHERE';
        if (Array.isArray(compare) || Array.isArray(value)) {
            return this.whereArray(field, value === undefined ? "=" : compare, Array.isArray(compare) ? compare : value, condition);
        }
        this.store.sql += ` ${wh} \`${field}\` ${value === undefined ? "=" : compare} ?`;
        this.store.values.push(value === undefined ? compare : value);
        return this;
    }
    where(field, compare, value) {
        return this.whereCondition(field, compare, value);
    }
    orWhere(field, compare, value) {
        return this.whereCondition(field, compare, value, "OR");
    }
    whereIn() {
    }
    whereNotIn(field, data) {
        const wh = this.store.sql.toLowerCase().includes("where") ? "AND" : "WHERE";
        this.store.sql += `${wh} \`${field}\` NOT IN (${Array(data.length).fill("?").join(", ")})`;
        this.store.values = [...this.store.values, ...data];
        return this;
    }
    async belongTableIn(tableName, foreignKeyIn, foreignKey, data) {
        const sql = `
            SELECT ${this.store.tableName}.* 
            FROM ${this.store.tableName}, ${tableName}
            WHERE ${this.store.tableName}.${this.primaryKey} = ${tableName}.${foreignKey}
            AND ${tableName}.${foreignKeyIn} IN (${Array(data.length).fill("?").join(", ")})
            GROUP BY ${this.store.tableName}.${this.primaryKey}
            HAVING COUNT(${this.store.tableName}.${this.primaryKey}) >= ${data.length}
        `;
        this.store.sql = sql;
        this.store.values = [...data];
        return await this.execute();
    }
    getStore() {
        return this.store;
    }
    async getTotalField() {
        const getTotalPage = await this.query(`SELECT COUNT(${this.primaryKey}) as count FROM ${this.store.tableName}`);
        return getTotalPage.data[0].count;
    }
    async paginate(limit, page) {
        const getTotalData = await this.getTotalField();
        this.take(limit);
        this.store.offset = page - 1 >= 0 ? ((page - 1) * limit) : 0;
        const response = await this.execute();
        const totalPages = Math.round(getTotalData / limit);
        const result = {
            ...response,
            next: (page + 1) > totalPages ? null : page + 1,
            previous: page - 1 <= 0 ? null : page - 1,
            current: page,
            totalPages
        };
        return result;
    }
}
class ModelChildren extends AxoltDatabaseParent {
    getPrimaryKey() {
        return this.primaryKey;
    }
    hasOne(model, foreignKey, primaryKey) {
        return (data) => {
            const obj = model.where(foreignKey, data[primaryKey]);
            return () => obj.first();
        };
    }
    hasMany(model, foreignKey, primaryKey) {
        return (data) => {
            const obj = model.where(foreignKey, data[primaryKey]);
            return () => obj.get();
        };
    }
    belongsToMany(model, tablePivot, foreignKeyModel, foreignKeyTable) {
        return (data) => {
            const sql = `
                SELECT b.* FROM ${this.store.tableName} a, ${model.store.tableName} b, ${tablePivot} c
                WHERE b.${model.primaryKey} = c.${foreignKeyModel}
                AND a.${this.primaryKey} = c.${foreignKeyTable}
                AND a.${this.primaryKey} = ${data[this.primaryKey]}
            `;
            return () => model.execute(sql);
        };
    }
}
class Model extends ModelChildren {
    static create() {
        return () => new this();
    }
}
exports.Model = Model;
class DB {
    static table(tableName) {
        return new Model(tableName);
    }
}
class AxoltConnection {
    static createConnection(connectionConfig) {
        connection = mysql2_1.default.createPool(connectionConfig);
        return { DB, Model };
    }
}
exports.default = AxoltConnection;
