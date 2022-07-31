const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


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
        const paymentCollection = client.db('jantrik').collection('payments');
        const reviewCollection = client.db('jantrik').collection('review');
        const userProfileCollection = client.db('jantrik').collection('profile');
        const userCollection = client.db('jantrik').collection('users');

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

        app.post('/bookingOrder', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { userEmail: email };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/order/:id', async (req, res) => {
            const orderId = req.params.id;
            const query = { _id: ObjectId(orderId) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        })

        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.totalPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })

            res.send({ clientSecret: paymentIntent.client_secret })
        });

        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const query = { _id: ObjectId(id) };
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            const order = await orderCollection.findOne(query);
            res.send(updatedOrder);
        })

        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        app.get('/review', async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        })

        app.post('/userProfile', async (req, res) => {
            const userProfile = req.body;
            const result = await userProfileCollection.insertOne(userProfile);
            res.send(result)
        })

        app.put('/userProfile/:email', async (req, res) => {
            const email = req.params.email;
            const updateData = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: updateData
              };
            const result = await userProfileCollection.updateOne(filter,updateDoc,options);
            res.send(result);

        })

        app.get('/userProfile' ,async(req, res) =>{
            const email = req.query.email;
            const query = {email: email};
            const result = await userProfileCollection.findOne(query);
            res.send(result);
        })

        app.put('/storeUsers/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.put('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            return res.send(result);
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })

        app.post('/addProduct', async (req, res) =>{
            const newProduct = req.body;
            const result =  await toolCollection.insertOne(newProduct);
            res.send(result);
        })

        app.get('/users',  async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
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