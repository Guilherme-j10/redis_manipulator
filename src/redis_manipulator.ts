import Redis, { RedisOptions } from 'ioredis';

type StandbyOperations = {
  value: any,
  key: string,
  unique_id: string
}

export interface IFindContentByScanStream<T> {
  target: keyof T | string,
  source: any
}

export type Merged_information<T> = T & { arr_index: any }

export class redis_manipulator_operation {

  private redis_connection: Redis;
  private pipeline_operations = [] as StandbyOperations[];

  constructor(options_connection_props?: RedisOptions, private debug = false) {

    let redis_connection_props: RedisOptions = {
      password: 'testeteste',
      port: 7000,
      host: 'localhost',
      db: 0
    };

    if (typeof options_connection_props === 'object') {

      redis_connection_props = { ...redis_connection_props, ...options_connection_props };

    }

    this.redis_connection = new Redis(redis_connection_props);

    this.non_block_operation_insert();

  }

  async non_block_operation_insert(): Promise<void> {

    if (this.pipeline_operations.length) {

      for (const operation of this.pipeline_operations) {

        try { await this.insert_operation(operation.unique_id, operation.key, operation.value) } catch (error: any) {

          if (this.debug) console.log(error.message);

        }

      }

      this.pipeline_operations = [];

    }

    setTimeout(async () => await this.non_block_operation_insert(), 10);

  }

  json_decode(data: any): any {

    return JSON.parse(data);

  }

  json_encode(data: any): string {

    return JSON.stringify(data);

  }

  async insert<T>(unique_id: string, key: string, value: T | Object): Promise<boolean> {

    this.pipeline_operations.push({ unique_id, key, value });

    return true;

  }

  async scan_all_keys(key: string): Promise<string[]> {

    return new Promise((resolve) => {

      const stream = this.redis_connection.scanStream({
        match: `${key}:*`,
        count: 3000
      }) as any;

      let all_keys_on_database = [] as string[];

      stream.on('data', (result_keys: string) => {

        for (let i = 0; i < result_keys.length; i++) {

          all_keys_on_database.push(result_keys[i])

        }

      });

      stream.on('end', () => {

        resolve(all_keys_on_database);

      });

    })

  }

  async insert_operation<T>(unique_id: string, key: string, value: T | Object): Promise<boolean> {

    if (typeof unique_id !== 'string') throw { message: 'The uniqueid have to be a string' }

    if (typeof value !== 'object') throw { message: 'The data provided must be a object.' }

    const have_on_data = Object.keys(value as Object).filter(key_index => ((value as Object)[key_index as keyof Object] as any) === unique_id);

    if (!have_on_data.length) throw { message: `The unique_id: ${unique_id} need be inside the data.` }

    const length_redis_keys = await this.scan_all_keys(key);

    value = { ...value, arr_index: length_redis_keys.length }

    await this.redis_connection.set(`${key}:${unique_id}`, this.json_encode(value));

    return true;

  }

  async list_in_order<T>(key: string): Promise<T[]> {

    const get_all = await this.scan_all_keys(key);

    const complete_all_data = [] as Merged_information<T>[];
    let reorder_data_on_list = [] as T[];

    for(const key of get_all) {

      const data_on_redis = await this.redis_connection.get(key);
      complete_all_data.push(this.json_decode(data_on_redis));

    }

    for(const data of complete_all_data) {

      reorder_data_on_list[data.arr_index] = data; 

    }

    return reorder_data_on_list;

  }

  async remove<T>(key: string, index: number): Promise<boolean> {

    const data_from_key = await this.select(key);

    data_from_key.splice(index, 1);

    await this.redis_connection.set(key, JSON.stringify(data_from_key));

    return true;

  }

  async update<T>(key: string, value: Merged_information<T>): Promise<boolean> {

    const data_from_key = await this.select(key);

    const array_position = value.arr_index;

    delete value.arr_index;

    data_from_key[array_position] = { ...value };

    await this.redis_connection.set(key, JSON.stringify(data_from_key));

    return true;

  }

  async select<T>(key: string, find_where?: IFindContentByScanStream<T>): Promise<Merged_information<T>[]> {

    const data_in_sotrage = await this.redis_connection.get(key);
    const data_work = JSON.parse(data_in_sotrage as string) as Merged_information<T>[];

    if (find_where) {

      let findedObject = [];

      for (let i in data_work) {

        for (let x in data_work[i]) {

          if (x === find_where.target && `${data_work[i][x as keyof Object]}`.toLowerCase() === `${find_where.source}`.toLowerCase()) {

            findedObject.push({ ...data_work[i], arr_index: i })

          }

        }

      }

      return findedObject || [];

    }

    for (let z in data_work) {

      data_work[z] = {
        ...data_work[z],
        arr_index: z
      }

    }

    return data_work || [];

  }

}