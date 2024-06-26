import fastify from "fastify";
import fastifyJwt from "fastify-jwt";
import { DataBase } from "./dataBases/dataBaseSql.js";
import dotenv from "dotenv";
import { Vdl } from "./validations/validationsInfos.js";

dotenv.config()

let dataBase = new DataBase()

let server = fastify({logger: true})

let vdl = new Vdl()

server.register(fastifyJwt, {
    secret: process.env.SECRET_KEY,
    sign: {
        expiresIn: '5m'
    }
})

async function validationJwt(token){
    try {

        const vdlToken = server.jwt.verify(token);

        console.log(vdlToken);

        if(vdlToken.values.nome !== undefined){

            let newToken = server.jwt.sign({name: vdlToken.name})
            return {status: 200, token: newToken}

        }else{

            return {status: 401}
        }
    } catch (error) {

        return {status: 401, error: error}
    }
}

//rota livre para testes 
server.get('/crypto', async (request, response) => {
    let value = await Vdl.createHash2({senha: 'Ola mundo@123@Leo'})
    response.status('200').send(value)
})

//Create CRUD
server.post('/create', async(request, response) => {
    let vdlC = Vdl.vdlCreate(request.body);

    if(vdlC == 404){

        response.status(404).send('Invalid');
    }else{

        let sucess = await dataBase.create(request.body);

        if(sucess.status == 200){

            response.status(204).send();

        }else{

            response.status(404).send('Deu ruim', sucess.error);
        }
    }
})

//
server.post('/login', async (request, response) => {
    let vdlInfos  = Vdl.vdlIdeficador(request.body)

    if(vdlInfos.status == 200){
        let resL = await dataBase.login(request.body, vdlInfos.type);

        if(resL.status == 200){ 

        const user = resL.user;
        
        try{
            
            const token = server.jwt.sign({values: user});

            response.status(200).send({token});

        }catch (error){
            console.log('Deu ruim', error);

            response.status(404).send();
        }
        }else if(vdlInfos.status == 401){

            response.status(401).send('Senha ou identificador incorretos');
        }else{

            response.status(404).send("Usuario não encontrado");
        }
    }else{
        response.status(404).send("Dados em formato incorreto");
    }
})

server.post('/update', async (request, response)=>{
    let {token} = request.body;

    let decode = validationJwt(token);

    if(decode.status == 200){

        let {type, body} = request.body;

        let value = await dataBase.update(type, body);

        if(value == 204){

            response.status(204).send(decode.token);
        }else{

            response.status(404).send()
        }
    }else{

        response.status(401).send()
    }
})

server.post('/cadList', async (request, response) => {
    let { token, nivel } = request.body;

    let decode = await validationJwt(token);

    console.log(decode);

    if(decode.status == 200 && nivel == 'Administrador'){

        let cad = await dataBase.cadView();

        if(cad.status == 200){

            let obj = {
                token: decode.token,
                data: cad.datas
            }

            response.status(200).send(JSON.stringify(obj));
        }else{

            response.status(404).send(JSON.stringify({token: decode.token}));
        }
    }else{

        response.status(401).send();
    }
})

server.post('/delete', async(request, response) => {
    let {token, value} = request.body;
    let decode = validationJwt(token);
    if(decode.status == 200){
        let dataDelete = await dataBase.delete(value);
        if(dataDelete.status == 200){
            response.status(200).send(decode.token);
        }else{
            response.status(404).send({token: decode.token, error: dataDelete.error});
        }
    }else{
        response.status(401).send();
    }
})
//-----------------
server.listen({
    port: 4047
})