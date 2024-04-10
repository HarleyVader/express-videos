const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const port = 6969;

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.3')
    .then(async () => {
        const db = mongoose.connection;

        app.use(express.json()); // for parsing application/json
        app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

        // Define your routes here
        app.get('/', (req, res) => {
            res.send('Hello World!');
        });

        // Read directory tree and create database
        async function readDirectoryTree(location) {
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
                        const fileName = path.basename(currentPath); // Use folder name as file name
                        currentLevel[fileName] = { URL: '' };
                    }
                });
            }

            traverseDirectory(location, tree);

            // Insert tree structure into MongoDB
            await db.collection('directoryTree').insertOne(tree);
            console.log('Directory tree inserted into MongoDB');
        }

        app.post('/submit', async (req, res) => {

            const folderName = req.body.folderName;
            const fileName = req.body.fileName;
            const url = req.body.url;

            const result = await db.collection('directoryTree').findOne({ [folderName]: { $exists: true } });

            if (result) {
                result[folderName][fileName].URL = url;
                await db.collection('directoryTree').updateOne({ _id: result._id }, { $set: { [folderName]: result[folderName] } });
                res.send('URL added successfully!');
            } else {
                res.status(404).send('Folder not found!');
            }
        });

        async function renderView(res, folder, subfolder) {
            // Create a variable path
            const path = `${folder}.${subfolder}`;

            // Use the variable path to fetch the correct data from the database
            const result = await db.collection('directoryTree').findOne({ [path]: { $exists: true } });

            // Extract the location and counter from the result
            const location = result ? result[folder][subfolder].URL : '';
            const counter = result ? Object.keys(result[folder][subfolder]).length : 0;

            // Render the form with the location and counter
            res.render('form', { location, counter });
        }

        // Create a route handler that reads the tree and fills in the correct storage path
        app.get('/:folder/:subfolder?', async (req, res) => {
            await renderView(res, req.params.folder, req.params.subfolder);
        });

        // Start the app
        app.listen(port, async () => {
            console.log(`App listening at http://localhost:${port}`);
            await readDirectoryTree("videos"); // Replace with your desired directory location
        });
    });