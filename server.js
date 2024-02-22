const express = require('express');
const path = require('path');

const app = express();
const port = process.env.port || 3013; // Use the provided PORT or a default one
const context = process.env.context || '/';

// Serve static files from the build folder under the '/test' base path
if(context === '/'){
  app.use( '/', express.static(path.join(__dirname, 'dist')));

  // Handle all other requests
  app.get( '/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}else{
  app.use(context + '/', express.static(path.join(__dirname, 'dist')));

  // Handle all other requests
  app.get(context + '/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
