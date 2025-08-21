const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors()); // allow cross-origin requests
app.use(bodyParser.json({ limit: '50mb' }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory');
}

// Test endpoint to verify server is running
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Upload endpoint
app.post('/upload', (req, res) => {
  console.log('Upload request received');
  const { name, file } = req.body;
  
  if (!name || !file) {
    console.error('Missing name or file in request');
    return res.status(400).json({ message: 'Name and file are required!' });
  }
  
  try {
    console.log(`Processing upload for: ${name}`);
    console.log(`Base64 data length: ${file.length}`);
    
    const buffer = Buffer.from(file, 'base64');
    const filePath = path.join(uploadsDir, name);
    
    fs.writeFileSync(filePath, buffer);
    console.log(`File saved successfully at: ${filePath}`);
    console.log(`File size: ${buffer.length} bytes`);
    
    res.json({ 
      message: 'File uploaded successfully!', 
      filename: name,
      size: buffer.length 
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      message: 'Upload failed!', 
      error: err.message 
    });
  }
});

// List uploaded files endpoint
app.get('/files', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const fileDetails = files.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        name: filename,
        size: stats.size,
        modified: stats.mtime
      };
    });
    res.json({ files: fileDetails });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ message: 'Failed to list files', error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
  console.log('Test the server at: http://192.168.100.20:3000/test');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  process.exit(0);
});