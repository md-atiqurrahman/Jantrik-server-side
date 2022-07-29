const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
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

        app.get('/tools', async (req, res) => {
            const tools = await toolCollection.find().toArray();
            res.send(tools);
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