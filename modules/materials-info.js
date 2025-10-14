const fs = require('fs');
const materialsDB = JSON.parse(fs.readFileSync('modules/materials.json'));

//the function to fetch information about the materials
const fetchInfo = function (input) {
    const output = [];
    let score = 0
    input.forEach ( material => {
        let found = false;
        materialsDB.forEach ( dbMaterial => {
            if (material.name.toLowerCase() === dbMaterial.name.toLowerCase()) {
                output.push({"name": material.name, "description": dbMaterial.description});
                score += dbMaterial.score * ((material.percentage != null ? material.percentage : 1) / 100);
                found = true;
            }})
     // if material not found in the database
     if (!found) {output.push({"name": material.name, "description": "No information found"});}
    })
    return {output, score};
}



//exporting the function to be used in other files
module.exports = {
    fetchInfo: fetchInfo
}