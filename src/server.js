
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const OCR = require('./image-to-text');

const pathToPublicDir = path.join(__dirname, '../public');
const PORT = process.env.PORT || 3000;

app.use(express.static(pathToPublicDir));

app.get('/test', (req, res) => res.send('Test route working!'));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });



// API endpoint to accept image upload and process it
app.post('/process-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image uploaded.' });
        }
        const imagePath = req.file.path;
        const identifiedMaterials = await OCR.paddleOCRFetchFromImage(imagePath);
        // Optionally delete the uploaded file after processing
        fs.unlink(imagePath, () => {});
        res.json({ success: true, materials: identifiedMaterials });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, ()=>{console.log('Server started on port 3000')})


