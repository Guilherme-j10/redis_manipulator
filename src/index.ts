import { redis_manipulator_operation } from "./redis_manipulator";
import { v4 } from 'uuid';

const redis_handle = new redis_manipulator_operation();

const insert = () => {

  console.time();
  for (let i = 0; i < 1_123_123; i++) {

    (async () => {

      const object_data = {
        id: `${i}-${v4()}`,
        nome: 'guilherme',
        sobrenome: 'campos',
        idade: i,
      };

      try {

        await redis_handle.insert(object_data.id, 'cliente', object_data);

      } catch (error: any) {

        console.log(error.message);

      }

    })()

  }
  console.timeEnd();

}

const read = () => {

  (async () => {

    console.time();
    const data = await redis_handle.list_in_order('cliente');
    console.log(data.length);
    console.timeEnd();
  
  })()

}

insert();
//read();