import Redis, { RedisOptions } from 'ioredis';

type StandbyOperations = {
  value: any,
  key: string,
  unique_id: string
}

type UpdateOperationPipe <T> = {
  unique_id: string,
  key: string,
  value: T
}

export interface IFindContentByScanStream<T> {
  target: keyof T | string,
  source: any
}

export type Merged_information<T> = T & { arr_index: any }

export class redis_manipulator_operation {

  private redis_connection: Redis;
  private pipeline_operations = [] as StandbyOperations[];
  private pipeline_operations_update = [] as UpdateOperationPipe<any>[];

  constructor(options_connection_props?: RedisOptions, private debug = true) {

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
    this.non_block_operation_update();

  }

  private async non_block_operation_update(): Promise<void> {

    if(this.pipeline_operations_update.length) {

      for(const update_operation of this.pipeline_operations_update) {

        try { await this.update_operation(update_operation.unique_id, update_operation.key, update_operation.value) } catch (error: any) {
          
          if(this.debug)  console.log('REDIS MANIPULATOR UPDATE ERROR: ', error.message || error);

        }

      }

      this.pipeline_operations_update = [];

    }

    setTimeout(async () => await this.non_block_operation_update(), 5);

  }

  private async non_block_operation_insert(): Promise<void> {

    if (this.pipeline_operations.length) {

      for (const operation of this.pipeline_operations) {

        try { await this.insert_operation(operation.unique_id, operation.key, operation.value) } catch (error: any) {

          if (this.debug) console.log('REDIS MANIPULATOR INSERT ERROR: ', error.message || error);

        }

      }

      this.pipeline_operations = [];

    }

    setTimeout(async () => await this.non_block_operation_insert(), 5);

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

  private async scan_all_keys(key: string): Promise<string[]> {

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

  async unique_id_exists(unique_id: string, key: string): Promise<boolean> {

    const all_keys = await this.scan_all_keys(key);
    const find_key = all_keys.filter(keys => keys === `${key}:${unique_id}`);

    if(find_key.length) return true;

    return false;

  }

  private async insert_operation<T>(unique_id: string, key: string, value: T | Object): Promise<boolean> {

    if (typeof unique_id !== 'string') throw { message: 'The uniqueid have to be a string' }

    if (typeof value !== 'object') throw { message: 'The data provided must be a object.' }

    const have_on_data = Object.keys(value as Object).filter(key_index => ((value as Object)[key_index as keyof Object] as any) === unique_id);

    if (!have_on_data.length) throw { message: `The unique_id: ${unique_id} need be inside the data.` }

    const length_redis_keys = await this.scan_all_keys(key);

    value = { ...value, arr_index: length_redis_keys.length }

    await this.redis_connection.set(`${key}:${unique_id}`, this.json_encode(value));

    return true;

  }

  async list_all<T>(key: string): Promise<T[]> {

    const get_all = await this.scan_all_keys(key);

    const complete_all_data = [] as Merged_information<T>[];
    let reorder_data_on_list = [] as T[];

    for(const key of get_all) {

      const data_on_redis = await this.redis_connection.get(key);
      complete_all_data.push(this.json_decode(data_on_redis));

    }

    for(const data of complete_all_data) {

      reorder_data_on_list[data.arr_index] = (() => {
        delete data.arr_index;
        return data;
      })(); 

    }

    return reorder_data_on_list.filter(data => data);

  }

  async remove(unique_id: string, key: string): Promise<boolean> {

    await this.redis_connection.del(`${key}:${unique_id}`);

    return true;

  }

  async update<T>(unique_id: string, key: string, value: T): Promise<boolean> {

    this.pipeline_operations_update.push({ unique_id, key, value });

    return true;

  }

  private async update_operation(unique_id: string, key: string, value: any): Promise<boolean> {

    const get_current_data = await this.redis_connection.get(`${key}:${unique_id}`);
    const current_data = this.json_decode(get_current_data);

    const new_value = { ...current_data, ...value };

    await this.redis_connection.set(`${key}:${unique_id}`, this.json_encode(new_value));

    return true;

  }

  async select<T>(unique_id: string, key: string): Promise<T> {

    const key_value = await this.redis_connection.get(`${key}:${unique_id}`);
    const data = this.json_decode(key_value);

    delete data.arr_index;

    return data as T;

  }

  async find_element<T>(key: string, property: keyof T, value: any): Promise<T[]> {

    const all_elements = await this.list_all(key) as any[];

    const elements = all_elements.filter(element => (element[property as keyof Object] as any) === value);
    const pure_data_elements = elements.map(data => {
      delete data.arr_index;
      return data;
    })

    return pure_data_elements as T[];

  }

}