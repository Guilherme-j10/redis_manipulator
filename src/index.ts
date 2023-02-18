import { redis_manipulator_operation } from "./redis_manipulator";
import { v4 } from 'uuid';

type DataStructure = {
  id: string,
  nome: string,
  sobrenome: string,
  idade: number
}

const redis_handle = new redis_manipulator_operation();

const insert_data = async () => {

  for (let i = 0; i < 10; i++) {

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

}

const update_all = async () => {

  const all_elements = await redis_handle.list_all<DataStructure>('cliente');

  for(let node of all_elements) {

    (async () => {

      const random_number = Math.floor(Math.random() * 1000);

      await redis_handle.update(node.id, 'cliente', {
        ...node,
        idade: random_number
      });

    })()

  }

}

//insert_data();
//update_all();