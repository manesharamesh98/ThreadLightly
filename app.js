
const chalk = require('chalk');
const validator = require('validator');
const manterialsInfo = require('./modules/materials-info');
const OCR = require('./modules/image-to-text');

//to mark the beginning of the console outputs
console.log(chalk.blue.bgWhite.bold('Starting the application...'));

//creating a test input
const input = [
    {
        "name": "polyester", 
        "percentage": 30
    },
    {
        "name": "cotton", 
        "percentage": 20
    }
]
//fetching information about the materials
materialsObject = manterialsInfo.fetchInfo(input);
console.log(materialsObject);

//To mark the end of the console outputs
console.log(chalk.blue.bgWhite.bold('Ending the application...'));



