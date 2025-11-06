const tesseract = require('tesseract.js');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const natural = require('natural');
const Ocr = require('@gutenye/ocr-node').default;


const config = {
  lang: 'eng',  // Language of OCR
  oem: 1,       // OCR Engine mode
  psm: 3        // Page segmentation mode
};

const paddleOCRFetchFromImage = async function(imagePath) {
  const ocr = await Ocr.create();
  const result = await ocr.detect(imagePath);
  // console.log(JSON.stringify(result, null, 2));

  const confidenceThreshold = 0.9;
  let rawText = "";
   result.forEach(item => { if (item.mean >= confidenceThreshold) rawText += item.text + " ";})
  const parsedText = parseText(rawText);
  return await identifyMaterials(parsedText);

}

const parseText = function(rawText) {
  return rawText
    .replace(/[^A-Za-z0-9% ]+/g, ' ') // remove punctuation, slashes, accents
    .replace(/\s+/g, ' ') // normalize spaces
    .trim();
}

//parse the text to get materials - to be implemented
const identifyMaterials = async function(parsedText) {
    var identifiedMaterials = [];
    var tokenizedParsedText = new natural.WordTokenizer().tokenize(parsedText).map(word => word.toLowerCase());
    var materials = JSON.parse(fs.readFileSync(path.join(__dirname, 'materials.json')));
    // console.log(materials)
    for (let mat in materials) {
      // console.log("Checking for material: ", materials[mat].name)
      // console.log("In text: ", tokenizedParsedText)
      if (tokenizedParsedText.includes(materials[mat].name)){
        const regex = new RegExp("(\\d+)\\s*%?\\s*" + materials[mat].name, "gi");
        let match;
        var percentage = null;

        while ((match = regex.exec(parsedText)) !== null) {
          var percentage = parseInt(match[1], 10);
          var token = match[2]
          // console.log(match)
        }

        identifiedMaterials.push({name: materials[mat].name, description: materials[mat].description, score: materials[mat].score, percentage: percentage});
        // console.log(chalk.green.bgWhite.bold("Identified Materials: ", JSON.stringify(materials[mat])))
      }
      
    }
    return identifiedMaterials;
}




//edge cases to handle:
//1. synonyms - cotton -> organic cotton
//2. plural forms - polyester -> polyesters
//3. abbreviations - PET -> polyester
//4. different languages
//5. composition in percebtages - 80% cotton, 20% polyester
    

  



  



//exporting the function to be used in other files

module.exports = {
    // fetchTextFromImage: fetchTextFromImage,
    paddleOCRFetchFromImage,
}
