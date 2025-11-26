const express = require('express');
const cors = require('cors');
require('dotenv').config();
const appRoutes = require('./routes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', appRoutes);

app.get('/', (req, res) => {
  res.send('Climate DB Dashboard Backend is running!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
