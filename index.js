const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster4.o5vph.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
};

async function run() {
    try {
        client.connect();//If you want to fix this issue of deploy a node    server on vercel then you need to change 2 things.
        //1. remove/comment- await from client.connect()
        //2. update all dependencies to the latest version

        const toolCollection = client.db('jantrik').collection('tool');
        const orderCollection = client.db('jantrik').collection('order');
        const paymentCollection = client.db('jantrik').collection('payments');
        const reviewCollection = client.db('jantrik').collection('review');
        const userProfileCollection = client.db('jantrik').collection('profile');
        const userCollection = client.db('jantrik').collection('users');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            next();
        }

        app.get('/tools', async (req, res) => {
            const tools = await toolCollection.find().toArray();
            res.send(tools);
        })

        app.get('/tools/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await toolCollection.findOne(query);
            res.send(tool);
        })

        app.post('/bookingOrder', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { userEmail: email };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });

        app.delete('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/order/:id', verifyJWT, async (req, res) => {
            const orderId = req.params.id;
            const query = { _id: ObjectId(orderId) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        })

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
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

        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const query = { _id: ObjectId(id) };
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    deliveryStatus: false,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            const order = await orderCollection.findOne(query);
            res.send(updatedOrder);
        })

        app.post('/review', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        app.get('/review', async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        })

        app.post('/userProfile', verifyJWT, async (req, res) => {
            const userProfile = req.body;
            const result = await userProfileCollection.insertOne(userProfile);
            res.send(result)
        })

        app.put('/userProfile/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const updateData = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: updateData
            };
            const result = await userProfileCollection.updateOne(filter, updateDoc, options);
            res.send(result);

        })

        app.get('/userProfile', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
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

            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });

            res.send({ result, token });
        })


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })

        app.put('/users/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            return res.send(result);
        })

        app.post('/addProduct', verifyJWT, verifyAdmin, async (req, res) => {
            const newProduct = req.body;
            const result = await toolCollection.insertOne(newProduct);
            res.send(result);
        })

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        app.delete('/tool/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const toolId = req.params.id;
            const query = { _id: ObjectId(toolId) };
            const result = await toolCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/allOrders', verifyJWT, verifyAdmin, async (req, res) => {
            const orders = await orderCollection.find().toArray();
            res.send(orders);
        })

        app.patch('/allOrders/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    deliveryStatus: true,
                }
            }
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.delete('/allOrders/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
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