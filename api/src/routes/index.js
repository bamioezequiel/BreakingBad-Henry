const { Router } = require('express');
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');
const axios = require('axios');
const { Character, Occupation, character_occuption } = require('../db.js');

const router = Router();

// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);

//Función que me trae la info de la API
const getApi = async() => {
    const {data} = await axios.get('https://breakingbadapi.com/api/characters')
    const info = await data.map(i => {  //me traigo sólo lo que quiero de la API
        return {
            id: i.char_id,
            name: i.name,
            image: i.img,
            nickName: i.nickname,
            status: i.status,
            occupation: i.occupation.map(i => i), //mapeo porque me devuelve un arreglo, para que me devuelva todos
            birthday: i.birthday
        };
    });
    return info;
};

//Función que me trae la info de la DB
const getDb = async() => {
    return await Character.findAll({  // me trae la info de mi base de datos que incluya el modelo occupation, si no incluyo este modelo no me va a traer el personaje con la ocupación cuando cree un modelo
        include: {
            model: Occupation,
            attributes: ['name'],  //le pido sólo el name xq el id ya me lo trae, esto porque es el mismo atributo que tiene el modelo, sólo necesito los atributos que tiene el modelo
            through: {
                attributes: []  //mediante la tabla atributos, podría no estar pero es conveniente
            }
        }
    });
};

//Ejecuto todas las funciones anteriores y concateno la info
const getAll = async() => {
    const apiInfo = await getApi(); //llamo a la función y la ejecuto porque sino no me va a devolver nada. Lo mismo con getDb
    const dbInfo = await getDb();
    const allInfo = apiInfo.concat(dbInfo);// concateno toda la info y la devuelvo
    return allInfo;
};

//Esta es la ruta por la que va a buscar el formulario del front
router.get('/characters', async(req, res) => {  //ruta del get
    const {name} = req.query;  // busca un name por query, pido lo que me pasan por ruta, en este caso "name"
    const allCharacters = await getAll();//llamo a la fn que me trae toda la info
    if(name) {
        const byName = await allCharacters.filter(i => i.name.toLowerCase().includes(name.toLocaleLowerCase()))  //me fijo si lo que me trae incluye lo que le pasé por query y los paso a todos a minúscula para que sean todos iguales en la búsqueda
        byName.length ? //pregunto si encontró algo
        res.status(200).send(byName) :
        res.status(404).send("No hay personaje con ese nombre");// si no encuentra personaje
    } else {
        res.status(200).send(allCharacters)  //si no hay un query me mando a todos
    };
});


//Rutas por id
router.get('/characters/:id', async(req, res) => {
    const {id} = req.params;
    const {data} = await axios.get(`https://breakingbadapi.com/api/characters/${id}`)
    if(id) {
        try {
        if(id.length > 10) {
            const idDb = await Character.findOne({
                where: {
                    id: id
                },
                include: [{
                    model: Occupation,
                    through: character_occuption
                }]
            })
            console.log(idDb)
            const all = idDb.dataValues
            return res.status(200).send(all) 
        }
        for(var i = 0; i < data.length; i++) {
            const info = {
            id: data[i].char_id,
            name: data[i].name,
            image: data[i].img,
            nickName: data[i].nickname,
            status: data[i].status,
            occupation: data[i].occupation,
            birthday: data[i].birthday
        }
        console.log(info);
        return res.status(200).send(info)
        }
        } catch (err) {
            console.log(err)
        }
        
    } else {
        res.status(404).send("No hay personaje")
    }
    
})

//Ruta que me trae las ocupaciones, vienen como arreglos
router.get('/occupations', async (req, res) => {
    const {data} = await axios.get('https://breakingbadapi.com/api/characters')
    const occupations = data.map(i => i.occupation)  //este  map me devuelve muchos arreglos desde la API y lo mapeo
    
    const dbOccupation = occupations.flat()
      dbOccupation.forEach(i => {
        Occupation.findOrCreate({  //luego hago un FindOrCreate para que si no está me lo cree
            where: {
                name: i
            }
        })
    })
  
    const allOccupations = await Occupation.findAll();
        return res.status(200).send(allOccupations)
    })

   
    
    //Post al character
router.post('/character', async(req, res) => {
    let {  //declaro una constante que me traiga todo lo que quiero que me traiga del body
        name,
        nickName,
        birthday,
        image,
        status,
        createdInDb,
        occupation
    } = req.body

     //otra constante con la creación del mismo modelo, no le paso ocupación porque tengo que hacer la relación aparte
    const createdCharacter = await Character.create({
        name,
        nickName,
        birthday,
        image,
        status,
        createdInDb
    })

    const createdDb = await Occupation.findAll({  //tengo que encontrar en mi modelo de ocupaciones todas las que coincidan con el nombre que llega por body, porque la tengo que encontrar dentro del modelo que ya tengo en base de datos, así es lo requerido por el PI. Sólo trabajamos con los modelos que ya está en la base de datos, se crea un personaje con los mismos modelos que ya están en la DB
        where: {
            name: occupation
        }
    })
    createdCharacter.addOccupation(createdDb)  //addOccupation es un metodo de sequalize me trae de la tabla lo que quiero(sólo viene cuando usamos el create)
    return res.status(200).send('Personaje creado con exito')
});

module.exports = router;