

// Importing required modules
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { name } = require('ejs');

// Initializing express app
const app = express();
const port = 6969;

// Setting root directory
const rootDirectory = './views';
console.log(`Root Directory: ${rootDirectory}`);

// Connecting to MongoDB
mongoose.connect('mongodb://172.25.117.247:27017/videoViews?directConnection=true&appName=mongosh+2.2.3')
    .catch(err => console.error('MongoDB connection error:', err));

// Defining Mongoose schema for folders
const folderSchema = new mongoose.Schema({
    name: String,
    path: String,
    url: String,
    views: Number,
    subfolders: [this] // This indicates that subfolders is an array of folder objects
});

// Creating Mongoose model for folders
const Folder = mongoose.model('videoViews', folderSchema);

// Function to add folders to the database recursively
async function addFoldersToDatabase(rootDirectory) {
    try {
        // Check the database for identical folders
        const existingFolders = await Folder.find();
        // Add new folders if they are not already in the database
        const newFolders = [];
        // Process the new folders as needed
        const readDirectory = (directory) => {
            const files = fs.readdirSync(directory);
            for (const file of files) {
                const filePath = path.join(directory, file);
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    const folder = {
                        name: file,
                        path: "/" + path.relative(rootDirectory, filePath),
                        url: `/index.php/s/PQ5w2TPfqBowtoP/download/5f0b55f3b2059.mp4`,
                        views: 0
                    };
                    const existingFolder = existingFolders.find(f => f.name === folder.name && f.path === folder.path);
                    if (!existingFolder) {
                        newFolders.push(folder);
                    }
                    readDirectory(filePath); // Recursively read subfolders
                }
            }
        };
        readDirectory(rootDirectory);
        for (const folder of newFolders) {
            await Folder.create(folder);
            console.log('Added folder:', folder);
        }
    } catch (error) {
        console.error('Error adding folders to database:', error);
    }
}

// Setting static files directory
app.use(express.static('videos'));

// Setting view engine and views directory
app.set('view engine', 'ejs');
app.set('views', rootDirectory);

// Route for home page
app.get('/', function(req, res) {
    res.render('layout', { folders: [], data: { name: 'Videos' }, folder: { folders: [] }, subfolder: null });
});

// Route for submit page
app.get('/submit', async (req, res, next) => {
    try {
        const folders = await Folder.find();
        console.log('Folders in /submit: ', folders);
        var data = {
            name: 'Submit',
            path: '/submit'      
        };
        res.render('form', { folders, folder: { folders: [] }, data: data, subfolder: null }); // Pass a default value for folder and data
    } catch (error) {
        next(error);
    }
});

// Route for sync page
app.get('/sync', async (req, res, next) => {
    try {
        let folders = await Folder.find();
        console.log('Folders in /sync: ', folders);
        await addFoldersToDatabase(rootDirectory);

        res.render('layout', { folders, data: { name: 'Sync' }, folder: { folders: [] }, subfolder: null }); // Pass a default value for folder
    } catch (error) {
        next(error);
    }
});

// Route for folder and subfolder pages
app.get('/:folder/:subfolder?', async function(req, res, next) {
    try {
        var folderName = req.params.folder;
        var subfolderName = req.params.subfolder || null; // If subfolder is not provided, it will be null

        // Fetch the folder based on the folder name
        var folder = await Folder.findOne({ name: folderName });

        // If no folder was found, render an error page or redirect to a different page
        if (!folder) {
            return res.status(404).render('error', { message: 'Folder not found' });
        }

        // If a subfolder is specified, fetch the subfolder from the folder's subfolders
        var subfolder = subfolderName ? folder.folders.find(f => f.name === subfolderName) : null;

        // If a subfolder was found, fetch its URL directly
        var subfolderUrl = subfolder ? subfolder.url : null;

        // Prepare the data object
        var data = {
            name: folderName,
            path: '/' + folderName + (subfolderName ? '/' + subfolderName : '')
        };

        // Render the EJS template with the fetched data
        res.render('layout', { folder: folder, subfolder: subfolder, subfolderUrl: subfolderUrl, data: data });
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Starting the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});