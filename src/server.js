const express = require('express');
const app = express();


const pathToPublicDir = require('path').join(__dirname, '../public');
const PORT = process.env.PORT || 3000;

app.use(express.static(pathToPublicDir));

app.listen(PORT, ()=>{console.log('Server started on port 3000')})


