const tesseract = require('tesseract.js');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const natural = require('natural');


const config = {
  lang: 'eng',  // Language of OCR
  oem: 1,       // OCR Engine mode
  psm: 3        // Page segmentation mode
};

//Extract text from image
const fetchTextFromImage = async function(imagePath) {

  try {
    // Perform OCR using Tesseract
    const rawText = await tesseract.recognize(imagePath); // specify language if needed
    console.log (rawText.data.text);
    // Return only the recognized text
     const parsedText =  rawText.data.text
      .replace(/[^A-Za-z0-9% ]+/g, ' ') // remove punctuation, slashes, accents
      .replace(/\s+/g, ' ') // normalize spaces
      .trim()
      
      return await identifyMaterials(parsedText);

  } catch (error) {
    console.error("❌ Error extracting text:", error.message);
    throw new Error("Failed to extract text from image");
  }

}

//parse the text to get materials - to be implemented

const identifyMaterials = async function(parsedText) {
    var identifiedMaterials = [];
    var tokenizedParsedText = new natural.WordTokenizer().tokenize(parsedText).map(word => word.toLowerCase());
    var materials = JSON.parse(fs.readFileSync(path.join(__dirname, 'materials.json')));
    var materialsVar= JSON.parse(fs.readFileSync(path.join(__dirname, 'materials-variations.json')));
    // console.log(materials)
    for (let mat in materials) {
      // console.log("Checking for material: ", materials[mat].name)
      // console.log("In text: ", tokenizedParsedText)
      if (tokenizedParsedText.includes(materials[mat].name)){
        identifiedMaterials.push(materials[mat]);
        // console.log(chalk.green.bgWhite.bold("Identified Materials: ", JSON.stringify(materials[mat])))
      }
      
    }
    return identifiedMaterials;
}

    

  

  



//exporting the function to be used in other files

module.exports = {
    fetchTextFromImage: fetchTextFromImage
}