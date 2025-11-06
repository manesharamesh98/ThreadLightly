const chalk = require('chalk');
const validator = require('validator');
const OCR = require('./image-to-text');
//to mark the beginning of the console outputs
console.log(chalk.blue.bgWhite.bold('Starting the application... \n'));

//set image as input
const imagePath = '../sample-labels/test-image1.jpg';
console.log("Input Image Path: ", imagePath, "\n");
async function run(){
    //use OCR module to extract textls
    const identifiedMaterials = await OCR.paddleOCRFetchFromImage(imagePath);
    console.log("Materials: \n");

    for (let mat in identifiedMaterials){
        console.log("Name: ", identifiedMaterials[mat].name)
        console.log("Percentage: ", identifiedMaterials[mat].percentage)
        console.log("Description: ", identifiedMaterials[mat].description)
        console.log("Sustainability Score: ", identifiedMaterials[mat].score)
        console.log("\n");
    }
    // //Use OCR module to clean up the text and get the materials

    console.log(chalk.blue.bgWhite.bold('Ending the application... \n'));
}
run();


