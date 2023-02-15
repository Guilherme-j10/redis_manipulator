import { redis_manipulator_operation } from "./redis_manipulator";
import { v4 } from 'uuid';

const redis_handle = new redis_manipulator_operation();

// console.time();
// for (let i = 0; i < 10; i++) {

//   (async () => {
    
//     const object_data = {
//       id: v4(),
//       nome: 'guilherme',
//       sobrenome: 'campos',
//       idade: i,
//     };

//     try {

//       await redis_handle.insert(object_data.id, 'cliente', object_data);

//     } catch (error: any) {

//       console.log(error.message);

//     }

//   })()

// }
// console.timeEnd();

(async () => {

  const data = await redis_handle.list_in_order('cliente');
  console.log(data);

})()