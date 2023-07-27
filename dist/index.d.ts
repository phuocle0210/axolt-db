import mysql, { ResultSetHeader } from "mysql2";
export interface IQueryStoreOrder {
    field: string;
    order: "DESC" | "ASC";
}
export interface IQueryStore {
    tableName: string;
    sql: string;
    sqlDefault: string;
    values: any[];
    limit?: number;
    offset?: number;
    order: IQueryStoreOrder[];
}
export interface IGetOrInsert<T> {
    wasCreated: boolean;
    data: T;
}
export interface IGetOrNew<T> extends IGetOrInsert<T> {
    save: Function;
}
export type IAxoltNotFunc<T> = {
    [K in keyof T]: T[K] extends Function ? never : T[K];
};
export type IRelationShip<T> = () => Promise<IAxoltResult<T>>;
export type IModelOption<T> = {
    [K in keyof T]?: T[K];
};
export interface IAxoltResult<T> {
    data: T;
    hidden?: T;
    empty: boolean;
}
export interface IAxoltHeader<T> {
    header: ResultSetHeader;
    data?: T;
}
export interface IPaginate<T> extends IAxoltResult<T> {
    next: number | null;
    previous: number | null;
    current: number;
    totalPages: number;
}
declare abstract class AxoltDatabaseParent<IAxolt> {
    protected store: IQueryStore;
    protected primaryKey: string;
    constructor(tableName?: string);
    protected query(sql?: string): Promise<IAxoltResult<IAxolt[]>>;
    protected setTable(): this;
    protected execute(sql?: string): Promise<IAxoltResult<IAxolt[]>>;
    private currentTimeFixed;
    get(fields?: string[]): Promise<IAxoltResult<IAxolt[]>>;
    first(fields?: string[]): Promise<IAxoltResult<IAxolt>>;
    take(number: number): this;
    insert(data: IAxoltNotFunc<IAxolt>): Promise<IAxoltHeader<IAxolt>>;
    insertMany(data: IAxoltNotFunc<IAxolt>[]): Promise<IAxoltHeader<IAxolt>>;
    update(data: IModelOption<IAxolt>, all?: boolean): Promise<boolean>;
    delete(all?: boolean): Promise<boolean>;
    firstOrCreate(find: IAxoltNotFunc<IModelOption<IAxolt>>, insert?: IAxoltNotFunc<IAxolt>): Promise<IGetOrInsert<IAxolt>>;
    firstOrNew(find: IAxoltNotFunc<IModelOption<IAxolt>>, insert?: IAxoltNotFunc<IAxolt>): Promise<IGetOrNew<IAxolt>>;
    orderBy(field: string, order?: "DESC" | "ASC"): this;
    orderByDesc(field: string): this;
    private whereArray;
    private whereCondition;
    where(field: string, compare: any, value?: any): this;
    orWhere(field: string, compare: any, value?: any): this;
    whereIn(): void;
    whereNotIn(field: string, data: any[]): this;
    belongTableIn(tableName: string, foreignKeyIn: string, foreignKey: string, data: any[]): Promise<IAxoltResult<IAxolt[]>>;
    getStore(): IQueryStore;
    getTotalField(): Promise<number>;
    paginate(limit: number, page: number): Promise<IPaginate<IAxolt[]>>;
}
declare class ModelChildren<T> extends AxoltDatabaseParent<T> {
    getPrimaryKey(): string;
    protected hasOne(model: Model<unknown>, foreignKey: string, primaryKey: string): (data: any) => () => Promise<IAxoltResult<unknown>>;
    protected hasMany(model: Model<unknown>, foreignKey: string, primaryKey: string): (data: any) => () => Promise<IAxoltResult<unknown[]>>;
    protected belongsToMany(model: Model<unknown>, tablePivot: string, foreignKeyModel: string, foreignKeyTable: string): (data: any) => () => Promise<IAxoltResult<unknown[]>>;
}
export declare class Model<T> extends ModelChildren<T> {
    static create<U>(): () => Model<U>;
}
declare class DB {
    static table<T>(tableName: string): Model<T>;
}
export default class AxoltConnection {
    static createConnection(connectionConfig: mysql.PoolOptions): {
        DB: typeof DB;
        Model: typeof Model;
    };
}
export {};
