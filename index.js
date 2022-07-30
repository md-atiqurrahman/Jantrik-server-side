const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();


//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster4.o5vph.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();

        const toolCollection = client.db('jantrik').collection('tool');
        const orderCollection = client.db('jantrik').collection('order');

        app.get('/tools', async (req, res) => {
            const tools = await toolCollection.find().toArray();
            res.send(tools);
        })

        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await toolCollection.findOne(query);
            res.send(tool);
        })

        app.post('/bookingOrder', async (req, res) =>{
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.get('/orders', async(req, res) =>{
            const email = req.query.email;
            const query = {userEmail: email};
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });

        app.delete('/orders/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/order/:id', async(req, res) =>{
            const orderId = req.params.id;
            const query = {_id: ObjectId(orderId)};
            const order = await orderCollection.findOne(query);
            res.send(order);
        })
    }

    finally {
        //  await client.close();
    }
}


run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Jantrik server is running');
});
app.listen(port, () => {
    console.log('Jantrik app listening on port', port)
})