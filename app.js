const express = require('express');
const path = require('path');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

const app = express();
const port = 6969;

// Connect to MongoDB
MongoClient.connect('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.1', (err, client) => {
    if (err) {
        console.error('Failed to connect to MongoDB:', err);
        return;
    }

    const db = client.db('videos');

    // Read directory tree and create database
    function readDirectoryTree(location) {
        const tree = {};

        function traverseDirectory(currentPath, currentLevel) {
            const files = fs.readdirSync(currentPath);

            files.forEach((file) => {
                const filePath = path.join(currentPath, file);
                const stats = fs.statSync(filePath);

                if (stats.isDirectory()) {
                    const directoryName = path.basename(filePath);
                    currentLevel[directoryName] = {};
                    traverseDirectory(filePath, currentLevel[directoryName]);
                } else {
                    const fileName = path.basename(filePath);
                    currentLevel[fileName] = { URL: '' };
                }
            });
        }

        traverseDirectory(location, tree);

        // Insert tree structure into MongoDB
        db.collection('directoryTree').insertOne(tree, (err, result) => {
            if (err) {
                console.error('Failed to insert directory tree into MongoDB:', err);
                return;
            }

            console.log('Directory tree inserted into MongoDB');
        });
    }

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    
    
    // Step 4: In the `renderView` function, render the new EJS file
    function renderView() {
        db.collection('directoryTree').findOne({}, (err, result) => {
            if (err) {
                console.error('Failed to fetch directory tree from MongoDB:', err);
                return;
            }
    
            // Step 5: Pass the location data from the database to the EJS file
            const location = result ? result.location : '';
            const counter = result ? result.counter : 0; // Assuming the counter is stored in the database
    
            // Step 6: In the EJS file, use the location data to populate the form fields
            res.render('form', { location, counter });
        });
    }

    // Start the app
    app.listen(port, () => {
        console.log(`App listening at http://localhost:${port}`);
        readDirectoryTree('/videos'); // Replace with your desired directory location
        renderView();
    });
});


