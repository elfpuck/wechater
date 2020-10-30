const Express = require('express');
const Wechater = require('../dist/index');
const bodyParser = require('body-parser')


const app = new Express();
app.use(bodyParser.json());
app.post('/', async (req, res)=>{
  console.log(req)
});

app.listen(1728, ()=>{console.info('Listen 1728')});